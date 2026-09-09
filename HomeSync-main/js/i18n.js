// ============================================================
//  js/i18n.js — Multilingual support (English / Hindi / Assamese)
//  Add more languages by adding another key to TRANSLATIONS.
//  Elements tagged data-i18n="key" get their textContent replaced.
//  Elements tagged data-i18n-placeholder="key" get their placeholder replaced.
// ============================================================

export const TRANSLATIONS = {
  en: {
    nav_home: "Home", nav_services: "Services", nav_map: "Live Map", nav_tracking: "Live Track", nav_bookings: "Bookings",
    nav_emergency: "Emergency", nav_payments: "Payments", nav_profile: "Profile",
    nav_dashboard: "Dashboard", nav_jobs: "Jobs", nav_availability: "Availability",
    nav_earnings: "Earnings", nav_skills: "Skills", nav_welfare: "Welfare",
    nav_workers: "Workers", nav_verification: "Verification", nav_analytics: "AI Analytics",
    nav_forecast: "Demand Forecast",
    hero_title: "Trusted Local Services. Fair Work. Stronger Cooperatives.",
    hero_sub: "Connect with verified skilled workers through a cooperative-owned service marketplace.",
    btn_find_service: "Find a Service",
    btn_join_worker: "Join as a Worker",
    btn_emergency: "Emergency Service",
    btn_book_now: "Book Now",
    why_title: "Why HomeSync?",
    login: "Log in", logout: "Log out", register: "Register",
  },
  hi: {
    nav_home: "होम", nav_services: "सेवाएं", nav_map: "लाइव मैप", nav_tracking: "लाइव ट्रैकिंग", nav_bookings: "बुकिंग",
    nav_emergency: "आपातकाल", nav_payments: "भुगतान", nav_profile: "प्रोफ़ाइल",
    nav_dashboard: "डैशबोर्ड", nav_jobs: "काम", nav_availability: "उपलब्धता",
    nav_earnings: "कमाई", nav_skills: "कौशल", nav_welfare: "कल्याण",
    nav_workers: "कर्मचारी", nav_verification: "सत्यापन", nav_analytics: "एआई विश्लेषण",
    nav_forecast: "मांग पूर्वानुमान",
    hero_title: "विश्वसनीय स्थानीय सेवाएं। निष्पक्ष काम। मजबूत सहकारी समितियां।",
    hero_sub: "एक सहकारी-स्वामित्व वाले सेवा बाज़ार के माध्यम से सत्यापित कुशल श्रमिकों से जुड़ें।",
    btn_find_service: "सेवा खोजें",
    btn_join_worker: "श्रमिक के रूप में जुड़ें",
    btn_emergency: "आपातकालीन सेवा",
    btn_book_now: "सेवा बुक करें",
    why_title: "HomeSync क्यों?",
    login: "लॉग इन करें", logout: "लॉग आउट", register: "पंजीकरण करें",
  },
  as: {
    nav_home: "গৃহ", nav_services: "সেৱাসমূহ", nav_bookings: "বুকিং",
    nav_emergency: "জৰুৰীকালীন", nav_payments: "পৰিশোধ", nav_profile: "প্ৰ'ফাইল",
    nav_dashboard: "ডেশ্ব'ৰ্ড", nav_jobs: "কাম", nav_availability: "উপলব্ধতা",
    nav_earnings: "উপাৰ্জন", nav_skills: "দক্ষতা", nav_welfare: "কল্যাণ",
    nav_workers: "কৰ্মী", nav_verification: "সত্যাপন", nav_analytics: "এআই বিশ্লেষণ",
    nav_forecast: "চাহিদাৰ পূৰ্বানুমান",
    hero_title: "বিশ্বাসযোগ্য স্থানীয় সেৱা। ন্যায্য শ্ৰম। শক্তিশালী সমবায়।",
    hero_sub: "সমবায়ৰ মালিকানাধীন সেৱা বজাৰৰ জৰিয়তে সত্যাপিত দক্ষ শ্ৰমিকৰ সৈতে সংযোগ কৰক।",
    btn_find_service: "সেৱা বিচাৰক",
    btn_join_worker: "শ্ৰমিক হিচাপে যোগদান কৰক",
    btn_emergency: "জৰুৰীকালীন সেৱা",
    btn_book_now: "সেৱা বুক কৰক",
    why_title: "কিয় HomeSync?",
    login: "লগইন কৰক", logout: "লগআউট", register: "পঞ্জীয়ন কৰক",
  },
};

const LANG_KEY = "hs_lang";

export function getLang() {
  return localStorage.getItem(LANG_KEY) || "en";
}
export function setLang(lang) {
  localStorage.setItem(LANG_KEY, lang);
  applyTranslations();
}
export function t(key) {
  const lang = getLang();
  return (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || TRANSLATIONS.en[key] || key;
}

export function applyTranslations() {
  document.documentElement.setAttribute("lang", getLang());
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
  });
  document.querySelectorAll(".lang-switcher select").forEach((sel) => (sel.value = getLang()));
}

export function initLangSwitcher(containerSelector = ".lang-switcher") {
  document.querySelectorAll(containerSelector).forEach((container) => {
    container.innerHTML = `
      <select aria-label="Language">
        <option value="en">English</option>
        <option value="hi">हिन्दी</option>
        <option value="as">অসমীয়া</option>
      </select>`;
    const sel = container.querySelector("select");
    sel.value = getLang();
    sel.addEventListener("change", (e) => setLang(e.target.value));
  });
  applyTranslations();
}

document.addEventListener("DOMContentLoaded", () => initLangSwitcher());
