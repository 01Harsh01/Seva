"""
ml/training/train_forecast.py

Demand forecasting — trains one RandomForestRegressor per category on
booking history pulled directly from Postgres, then writes next-period
predictions into demand_forecasts. This REPLACES the frontend's
statistical trend heuristic (js/store.js:demandForecast()) with an
actual trained model, run offline/on a schedule rather than per-request
— exactly as the spec asks ("keep ML service independent from the main
Node.js backend").

Honesty check (per project rule #18): this trains on the ~80 seeded
demo bookings. That is enough data for the pipeline to run end-to-end
correctly, but not enough to produce forecasts a cooperative should
actually plan staffing around — 80 rows across 10 categories is a toy
dataset. The model, feature engineering, and write-back path are real;
the PREDICTIONS are only as good as demo data allows. Re-run this
script as real production bookings accumulate.

Usage:
    ml/venv/bin/python ml/training/train_forecast.py
"""

import os
import sys
from datetime import date, timedelta

import pandas as pd
import psycopg2
import psycopg2.extras
from sklearn.ensemble import RandomForestRegressor

MODEL_VERSION = "rf-v1"

DB_CONFIG = dict(
    host=os.environ.get("DB_HOST", "localhost"),
    port=os.environ.get("DB_PORT", "5432"),
    user=os.environ.get("DB_USER", "postgres"),
    password=os.environ.get("DB_PASSWORD", "postgres"),
    dbname=os.environ.get("DB_NAME", "homesync"),
)


def load_bookings(conn):
    query = """
        SELECT category_id, created_at::date AS booking_date, is_emergency
        FROM bookings
        WHERE status = 'completed'
    """
    return pd.read_sql(query, conn)


def build_daily_features(df):
    """One row per (category, date) with the count that day + calendar features."""
    if df.empty:
        return pd.DataFrame(columns=["category_id", "booking_date", "count", "day_of_week", "month", "emergency_count"])

    daily = (
        df.groupby(["category_id", "booking_date"])
        .agg(count=("category_id", "size"), emergency_count=("is_emergency", "sum"))
        .reset_index()
    )
    daily["booking_date"] = pd.to_datetime(daily["booking_date"])
    daily["day_of_week"] = daily["booking_date"].dt.dayofweek
    daily["month"] = daily["booking_date"].dt.month
    return daily


def train_and_predict(daily, category_id):
    cat_df = daily[daily["category_id"] == category_id]
    if len(cat_df) < 5:
        # Not enough rows to train a meaningful model for this category —
        # fall back to a simple mean rather than fitting garbage.
        avg = cat_df["count"].mean() if len(cat_df) else 0.0
        return float(avg) if avg == avg else 0.0, "insufficient_data_fallback_mean"

    X = cat_df[["day_of_week", "month", "emergency_count"]]
    y = cat_df["count"]

    model = RandomForestRegressor(n_estimators=100, max_depth=6, random_state=42)
    model.fit(X, y)

    # Predict for the next 7 days and sum -> "expected bookings next week"
    next_week = pd.date_range(date.today() + timedelta(days=1), periods=7)
    future_X = pd.DataFrame({
        "day_of_week": next_week.dayofweek,
        "month": next_week.month,
        "emergency_count": [cat_df["emergency_count"].mean()] * 7,
    })
    predictions = model.predict(future_X)
    return float(predictions.sum()), MODEL_VERSION


def main():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
    except Exception as e:
        print(f"Could not connect to Postgres ({DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['dbname']}): {e}", file=sys.stderr)
        sys.exit(1)

    bookings = load_bookings(conn)
    print(f"Loaded {len(bookings)} completed bookings from the database.")

    daily = build_daily_features(bookings)
    categories = sorted(bookings["category_id"].unique()) if not bookings.empty else []

    period_start = date.today() + timedelta(days=1)
    period_end = period_start + timedelta(days=6)

    results = []
    with conn.cursor() as cur:
        for cat in categories:
            predicted, version = train_and_predict(daily, cat)
            cur.execute(
                """INSERT INTO demand_forecasts (category_id, period_start, period_end, predicted_bookings, model_version)
                   VALUES (%s, %s, %s, %s, %s)""",
                (cat, period_start, period_end, round(predicted, 1), version),
            )
            results.append((cat, round(predicted, 1), version))
        conn.commit()

    print(f"\nWrote {len(results)} forecasts for {period_start} to {period_end}:")
    for cat, predicted, version in sorted(results, key=lambda r: -r[1]):
        print(f"  {cat:12s} -> {predicted:6.1f} predicted bookings  ({version})")

    conn.close()


if __name__ == "__main__":
    main()
