// backend/src/services/digilockerService.js
//
// DigiLocker identity verification — service abstraction.
//
// IMPORTANT: HomeSync does not have official DigiLocker OAuth
// credentials. DigiLockerMockService below simulates the consent
// flow end-to-end for demo purposes and is clearly labeled as such
// everywhere it surfaces (API responses include verificationMode:
// "demo_mock"). A real DigiLockerLiveService implementing the same
// four methods could be swapped in once official credentials are
// issued, without changing any calling code — that's the point of
// this abstraction.
//
// Real DigiLocker OAuth 2.0 / OpenID Connect flow this would call:
//   1. getAuthorizationUrl()  -> redirect worker to DigiLocker consent screen
//   2. worker authenticates + consents on DigiLocker's own site
//   3. DigiLocker redirects back to our callback URL with an auth code
//   4. handleCallback(code)  -> exchange code for tokens, fetch only the
//      minimum permitted identity attributes (never the Aadhaar number
//      or document images) and derive a boolean "verified" + opaque
//      reference id
//   5. verifyWorker(workerId, referenceId) -> persist to worker_verification
//
// NEVER: store Aadhaar numbers, store document images, expose
// verification internals to customers, or put DigiLocker client
// secrets in frontend code.

const { pool } = require("../config/db");
const crypto = require("crypto");

class DigiLockerMockService {
  constructor() {
    this.mode = "demo_mock";
  }

  // In the real service this returns the actual DigiLocker OAuth URL
  // with client_id/redirect_uri/state. Here it returns a same-origin
  // "fake consent" URL so the demo flow is honest about not calling
  // any real DigiLocker endpoint.
  getAuthorizationUrl(workerId) {
    const state = crypto.randomBytes(8).toString("hex");
    return { url: `/demo-verification.html?workerId=${workerId}&state=${state}`, state, mode: this.mode };
  }

  // Simulates DigiLocker's redirect callback. A real implementation
  // exchanges `code` for tokens here; the mock just marks success.
  async handleCallback(workerId) {
    const referenceId = `DEMO-VERIFY-REF-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    return { verified: true, referenceId, mode: this.mode };
  }

  async verifyWorker(workerId) {
    const { verified, referenceId, mode } = await this.handleCallback(workerId);
    await pool.query(
      `INSERT INTO worker_verification (worker_id, digilocker_verified, verification_mode, verified_at, reference_id)
       VALUES ($1,$2,$3, now(), $4)
       ON CONFLICT (worker_id) DO UPDATE SET digilocker_verified=$2, verification_mode=$3, verified_at=now(), reference_id=$4`,
      [workerId, verified, mode, referenceId]
    );
    return { verified, referenceId, mode };
  }

  async getVerificationStatus(workerId) {
    const result = await pool.query("SELECT digilocker_verified, verification_mode, verified_at FROM worker_verification WHERE worker_id = $1", [workerId]);
    return result.rows[0] || { digilocker_verified: false, verification_mode: "none", verified_at: null };
  }
}

// Swap point: when official credentials exist, implement
// DigiLockerLiveService with the same four methods and change this
// one line — nothing else in the codebase needs to know.
const digilockerService = new DigiLockerMockService();

module.exports = { digilockerService };
