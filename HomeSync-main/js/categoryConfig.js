// ============================================================
//  js/categoryConfig.js
//  Centralized Service Category Configuration System.
//
//  This is the ONE place that defines what makes each category
//  feel bespoke: theme colors, hero copy, service list, FAQs,
//  features, testimonials, emergency types, and the fields the
//  booking form should ask. Every dynamic page (category.html,
//  booking.html, emergency.html, admin-dashboard.html) reads
//  from getCategoryConfig() instead of hardcoding any of this.
//
//  Defaults live in DEFAULT_CONFIG below. Admins can override any
//  field per category from admin-dashboard.html → Categories;
//  overrides are merged on top of the defaults and persisted in
//  localStorage, so this is API-ready: a real backend just needs
//  to serve/save the same shaped JSON per category (see
//  "categories" in the Firestore-style collection list in the
//  README) and these functions can be pointed at it instead.
// ============================================================

import { CATEGORIES } from "./store.js";

const OVERRIDES_KEY = "hs_category_overrides";

function readOverrides() {
  try { return JSON.parse(localStorage.getItem(OVERRIDES_KEY)) || {}; }
  catch { return {}; }
}
function writeOverrides(obj) {
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(obj));
}

// heroShape drives which primitive scene3d.js builds for the hero
// canvas — kept abstract/procedural on purpose (see README: no
// unrelated stock imagery is used; these are stylised, on-brand
// visuals rather than literal photos).
const DEFAULT_CONFIG = {
  electrical: {
    tagline: "Power it up. Safely.",
    image: "assets/services/electrical.jpg",
    description: "Certified electricians for wiring, repairs and installations — background-checked and cooperative-verified.",
    theme: { primary: "#B45309", secondary: "#FEF3C7", accent: "#F59E0B", gradient: "linear-gradient(135deg,#78350F,#F59E0B)" },
    heroShape: "octahedron",
    services: [
      { name: "Wiring", price: 400 }, { name: "Switch & socket repair", price: 250 },
      { name: "Fan installation", price: 300 }, { name: "Appliance wiring", price: 350 },
      { name: "Light fitting installation", price: 300 }, { name: "Electrical safety inspection", price: 500 },
    ],
    features: ["Certified Electricians", "Safety-First Approach", "Quick Response Times", "Verified Workmanship"],
    faqs: [
      { q: "How much does basic wiring cost?", a: "Most wiring jobs start around ₹400 and scale with the number of points — the worker gives you an exact quote before starting." },
      { q: "Is it safe to book same-day?", a: "Yes — availability is shown live on each worker's profile, and you can also use Emergency Electrician for urgent faults." },
      { q: "Do electricians bring their own tools?", a: "Yes, all cooperative-verified electricians carry their own tools and standard replacement parts." },
    ],
    testimonials: [
      { name: "Rina B.", text: "The electrician installed all our lights safely and explained the wiring issue clearly." },
      { name: "Ashok N.", text: "Fixed a tripping switchboard within 40 minutes of booking." },
    ],
    emergencyTypes: ["Power failure", "Sparking or burning smell", "Exposed/damaged wiring", "Switchboard fault"],
    bookingFields: [
      { name: "problemType", label: "What's the electrical problem?", type: "select", options: ["Wiring issue", "No power", "Switch/socket not working", "Appliance not working", "New installation", "Other"] },
      { name: "applianceInvolved", label: "Appliance involved (if any)", type: "text" },
      { name: "urgency", label: "Urgency", type: "select", options: ["Can wait a few days", "Within 24 hours", "Urgent — today"] },
    ],
  },

  plumbing: {
    tagline: "Fix leaks. Restore flow.",
    image: "assets/services/plumbing.jpg",
    description: "Verified local plumbers for repairs, installation and maintenance — no water-damage surprises.",
    theme: { primary: "#1D4ED8", secondary: "#DBEAFE", accent: "#3B82F6", gradient: "linear-gradient(135deg,#1E3A8A,#3B82F6)" },
    heroShape: "torus",
    services: [
      { name: "Pipe repair", price: 350 }, { name: "Leak repair", price: 300 },
      { name: "Tap installation", price: 250 }, { name: "Bathroom plumbing", price: 500 },
      { name: "Water tank repair", price: 450 }, { name: "Drain cleaning", price: 300 },
    ],
    features: ["Fast Leak Detection", "24/7 Emergency Support", "Verified Plumbers", "Transparent Pricing"],
    faqs: [
      { q: "How much does leak repair cost?", a: "Simple leak repairs typically start from ₹300 — the exact price depends on the leak's location and severity." },
      { q: "Can I book emergency plumbing?", a: "Yes — use the Emergency Plumber option for burst pipes or major leaks and we'll match the nearest available verified plumber." },
      { q: "Do plumbers provide replacement parts?", a: "Basic parts (washers, tape, small fittings) are included; larger fixtures are quoted separately before work begins." },
    ],
    testimonials: [
      { name: "Farida B.", text: "Fixed our bathroom leakage within an hour of booking, very professional." },
      { name: "Manoj K.", text: "Clear pricing, no surprise charges — replaced our kitchen tap in 20 minutes." },
    ],
    emergencyTypes: ["Burst pipe", "Major leakage", "No water supply", "Overflowing drain"],
    bookingFields: [
      { name: "problemType", label: "What's the plumbing issue?", type: "select", options: ["Leak", "Blocked drain", "No water supply", "Tap/fixture installation", "Bathroom fitting", "Other"] },
      { name: "leakLocation", label: "Where is the leak/issue located?", type: "text" },
      { name: "waterSupply", label: "Is your water supply affected?", type: "select", options: ["No", "Partially", "Completely cut off"] },
    ],
  },

  carpentry: {
    tagline: "Build. Repair. Restore.",
    image: "assets/services/carpentry.jpg",
    description: "Skilled carpenters for furniture, doors, woodwork and home repairs, matched from your local cooperative.",
    theme: { primary: "#92400E", secondary: "#FDE68A", accent: "#B45309", gradient: "linear-gradient(135deg,#451A03,#B45309)" },
    heroShape: "box",
    services: [
      { name: "Furniture repair", price: 400 }, { name: "Door repair", price: 350 },
      { name: "Wood polishing", price: 500 }, { name: "Custom furniture", price: 1500 },
      { name: "Cabinet installation", price: 800 }, { name: "Modular furniture", price: 1200 },
    ],
    features: ["Skilled Woodworkers", "Quality Craftsmanship", "Furniture Expertise", "Transparent Pricing"],
    faqs: [
      { q: "How much does furniture repair cost?", a: "Small repairs start around ₹400; larger restorations are quoted after the carpenter inspects the piece (in person or from photos)." },
      { q: "Can I request custom furniture?", a: "Yes — describe the piece and dimensions in the booking form and a carpenter will follow up with a detailed quote." },
      { q: "Do carpenters bring their own tools?", a: "Yes, standard tools are included; specialised timber or hardware is billed separately and agreed beforehand." },
    ],
    testimonials: [
      { name: "Jagat D.", text: "Repaired our dining table perfectly — you can't tell it was ever damaged." },
      { name: "Purnima B.", text: "Built a custom shoe cabinet exactly to the measurements we gave." },
    ],
    emergencyTypes: ["Broken door/lock", "Damaged furniture blocking access", "Storm/impact damage"],
    bookingFields: [
      { name: "workType", label: "Type of furniture/work", type: "select", options: ["Furniture repair", "Door repair", "Custom furniture", "Cabinet/modular installation", "Wood polishing", "Other"] },
      { name: "material", label: "Material (if known)", type: "text" },
      { name: "approxSize", label: "Approximate size", type: "text" },
    ],
  },

  painting: {
    tagline: "Color it right, the first time.",
    image: "assets/services/painting.jpg",
    description: "Interior and exterior painters for a clean, even finish — verified, insured through the cooperative welfare fund.",
    theme: { primary: "#BE185D", secondary: "#FCE7F3", accent: "#DB2777", gradient: "linear-gradient(135deg,#831843,#DB2777)" },
    heroShape: "cone",
    services: [
      { name: "Interior painting", price: 600 }, { name: "Exterior painting", price: 800 },
      { name: "Waterproofing", price: 900 }, { name: "Texture work", price: 1000 },
    ],
    features: ["Clean, Even Finish", "Quality Paints Only", "On-Time Completion", "Transparent Pricing"],
    faqs: [
      { q: "How is painting priced?", a: "Per-room/area estimates are given after a quick site check or photos — starting from ₹600 for a standard room." },
      { q: "Do you supply the paint?", a: "Painters can bring standard paint or use paint you've already purchased — mention your preference in the booking form." },
      { q: "How long does a room take?", a: "A typical room takes 1–2 days including drying time between coats." },
    ],
    testimonials: [
      { name: "Lakhi P.", text: "Neat edges, no drips on the floor — very tidy work." },
      { name: "Salim K.", text: "Waterproofed our terrace before the monsoon, no leaks since." },
    ],
    emergencyTypes: ["Water seepage needing urgent patch", "Peeling paint exposing wall damage"],
    bookingFields: [
      { name: "workType", label: "What needs painting?", type: "select", options: ["Interior room(s)", "Exterior wall", "Waterproofing", "Texture/decorative work"] },
      { name: "areaSize", label: "Approximate area (sq. ft. if known)", type: "text" },
      { name: "paintSupplied", label: "Will you supply the paint?", type: "select", options: ["No, worker should bring it", "Yes, already purchased"] },
    ],
  },

  cleaning: {
    tagline: "Fresh spaces, fair wages.",
    image: "assets/services/cleaning.jpg",
    description: "Deep cleaning and household cleaning by verified cooperative members, with clear per-visit pricing.",
    theme: { primary: "#0891B2", secondary: "#CFFAFE", accent: "#06B6D4", gradient: "linear-gradient(135deg,#164E63,#06B6D4)" },
    heroShape: "sphere",
    services: [
      { name: "Deep cleaning", price: 500 }, { name: "Sofa cleaning", price: 400 },
      { name: "Bathroom cleaning", price: 300 }, { name: "Move-in cleaning", price: 700 },
    ],
    features: ["Thorough Deep Cleans", "Eco-Friendly Options Available", "Verified Cleaners", "Fair, Fixed Pricing"],
    faqs: [
      { q: "What's included in a deep clean?", a: "Floors, surfaces, kitchen and bathroom sanitising, and dusting of reachable fixtures — ask about add-ons like fridge/oven cleaning in the booking notes." },
      { q: "Do I need to provide cleaning supplies?", a: "Cleaners bring standard supplies by default; you can opt to use your own in the booking form." },
      { q: "How long does a deep clean take?", a: "A typical 2BHK deep clean takes 3–4 hours." },
    ],
    testimonials: [
      { name: "Meena K.", text: "Move-in cleaning made the flat spotless before we brought in furniture." },
      { name: "Rekha D.", text: "Very thorough, even cleaned behind the fridge without being asked." },
    ],
    emergencyTypes: ["Urgent pre-event cleaning", "Water/flood cleanup"],
    bookingFields: [
      { name: "cleaningType", label: "Type of cleaning", type: "select", options: ["Deep cleaning", "Regular cleaning", "Sofa/carpet cleaning", "Move-in/move-out cleaning"] },
      { name: "homeSize", label: "Home size (e.g. 2BHK)", type: "text" },
      { name: "suppliesProvided", label: "Cleaning supplies", type: "select", options: ["Worker brings supplies", "I'll provide supplies"] },
    ],
  },

  domestic: {
    tagline: "Reliable help, every day.",
    image: "assets/services/domestic.jpg",
    description: "Cooking, housekeeping and daily household support from verified, cooperative-registered workers.",
    theme: { primary: "#059669", secondary: "#D1FAE5", accent: "#10B981", gradient: "linear-gradient(135deg,#064E3B,#10B981)" },
    heroShape: "capsule",
    services: [
      { name: "Cooking", price: 300 }, { name: "Housekeeping", price: 300 },
      { name: "Laundry", price: 250 }, { name: "Elderly assistance", price: 400 },
    ],
    features: ["Background-Verified Helpers", "Flexible Scheduling", "Consistent Quality", "Fair Wages"],
    faqs: [
      { q: "Can I book recurring help?", a: "Yes — after your first booking you can rebook the same worker directly from their profile." },
      { q: "Are workers background verified?", a: "Yes, every domestic help worker is verified by the cooperative administrator before appearing in search results." },
    ],
    testimonials: [
      { name: "Sunita R.", text: "Reliable and punctual every single day — exactly what we needed." },
    ],
    emergencyTypes: ["Urgent same-day help needed"],
    bookingFields: [
      { name: "helpType", label: "What kind of help do you need?", type: "select", options: ["Cooking", "Housekeeping", "Laundry", "Elderly assistance", "Combination"] },
      { name: "frequency", label: "Frequency", type: "select", options: ["One-time", "Daily", "Weekly"] },
    ],
  },

  caregiving: {
    tagline: "Compassionate care, close to home.",
    image: "assets/services/caregiving.jpg",
    description: "Verified caregivers for elder care, patient care and child care, matched to your family's needs.",
    theme: { primary: "#BE123C", secondary: "#FFE4E6", accent: "#E11D48", gradient: "linear-gradient(135deg,#881337,#E11D48)" },
    heroShape: "sphere",
    services: [
      { name: "Elder care", price: 500 }, { name: "Patient care", price: 600 },
      { name: "Child care", price: 400 }, { name: "Post-surgery care", price: 700 },
    ],
    features: ["Compassionate, Trained Caregivers", "Background Verified", "Flexible Shifts", "Emergency Support"],
    faqs: [
      { q: "Are caregivers trained?", a: "Verified caregivers list their training and certifications on their profile — look for the training badge before booking." },
      { q: "Can I book a caregiver for a few hours only?", a: "Yes, specify the duration and schedule needed in the booking form." },
    ],
    testimonials: [
      { name: "Tanvir A.", text: "Took wonderful care of my father during his recovery — punctual and gentle." },
    ],
    emergencyTypes: ["Urgent same-day caregiver needed", "Post-hospital-discharge care"],
    bookingFields: [
      { name: "careType", label: "Type of care needed", type: "select", options: ["Elder care", "Patient care", "Child care", "Post-surgery care"] },
      { name: "duration", label: "Expected duration/shift", type: "text" },
      { name: "specialNeeds", label: "Any special needs the caregiver should know?", type: "textarea" },
    ],
  },

  driving: {
    tagline: "Get there, safely.",
    image: "assets/services/driving.jpg",
    description: "Verified local and outstation drivers from the cooperative, with clear per-trip pricing.",
    theme: { primary: "#4338CA", secondary: "#E0E7FF", accent: "#6366F1", gradient: "linear-gradient(135deg,#312E81,#6366F1)" },
    heroShape: "cylinder",
    services: [
      { name: "Local driving", price: 300 }, { name: "Outstation driving", price: 800 },
      { name: "Two-wheeler delivery", price: 150 },
    ],
    features: ["Licensed & Verified Drivers", "Punctual Pickups", "Transparent Fares", "Local Knowledge"],
    faqs: [
      { q: "Is the driver licensed?", a: "Yes, all drivers' licenses are verified by the cooperative administrator before they can accept bookings." },
      { q: "Can I book an outstation trip?", a: "Yes — mention the destination and expected duration in the booking notes for an accurate quote." },
    ],
    testimonials: [
      { name: "Bikash G.", text: "Safe driver for our outstation trip, very familiar with the highway routes." },
    ],
    emergencyTypes: ["Urgent same-day pickup", "Vehicle breakdown — need alternate driver"],
    bookingFields: [
      { name: "tripType", label: "Trip type", type: "select", options: ["Local (within city)", "Outstation", "Delivery"] },
      { name: "destination", label: "Destination", type: "text" },
      { name: "vehicleProvided", label: "Vehicle", type: "select", options: ["I'll provide the vehicle", "Need the driver to arrange one"] },
    ],
  },

  gardening: {
    tagline: "Grow something good.",
    image: "assets/services/gardening.jpg",
    description: "Lawn care, landscaping and garden maintenance from verified local gardeners.",
    theme: { primary: "#4D7C0F", secondary: "#ECFCCB", accent: "#65A30D", gradient: "linear-gradient(135deg,#365314,#65A30D)" },
    heroShape: "cone",
    services: [
      { name: "Lawn care", price: 300 }, { name: "Pruning", price: 250 },
      { name: "Landscaping", price: 800 }, { name: "Pest control", price: 400 },
    ],
    features: ["Experienced Gardeners", "Seasonal Care Plans", "Eco-Friendly Pest Control", "Fair Pricing"],
    faqs: [
      { q: "How often should I book lawn care?", a: "Most gardens do well with a visit every 2–3 weeks during growing season — you can set this up as a recurring booking." },
      { q: "Do gardeners bring their own tools?", a: "Yes, standard tools are included; larger equipment for landscaping projects is quoted separately." },
    ],
    testimonials: [
      { name: "Dilip S.", text: "Transformed our overgrown backyard into a neat garden in a weekend." },
    ],
    emergencyTypes: ["Storm-damaged tree/branches", "Urgent pest infestation"],
    bookingFields: [
      { name: "workType", label: "What kind of garden work?", type: "select", options: ["Lawn care", "Pruning", "Landscaping", "Pest control"] },
      { name: "gardenSize", label: "Approximate garden size", type: "text" },
    ],
  },

  technician: {
    tagline: "Appliances, fixed right.",
    image: "assets/services/technician.jpg",
    description: "Verified technicians for AC, fridge, washing machine and electronics repair.",
    theme: { primary: "#0F766E", secondary: "#CCFBF1", accent: "#14B8A6", gradient: "linear-gradient(135deg,#134E4A,#14B8A6)" },
    heroShape: "octahedron",
    services: [
      { name: "AC repair", price: 500 }, { name: "Fridge repair", price: 450 },
      { name: "Washing machine repair", price: 400 }, { name: "TV/electronics repair", price: 350 },
    ],
    features: ["Certified Technicians", "Genuine Spare Parts", "Warranty on Repairs", "Transparent Pricing"],
    faqs: [
      { q: "Do you use genuine spare parts?", a: "Technicians disclose part sourcing before fitting; genuine parts are always available on request, at the quoted price." },
      { q: "Is there a warranty on repairs?", a: "Most repairs carry a short service warranty — check the specific technician's profile for details." },
    ],
    testimonials: [
      { name: "Priya S.", text: "Diagnosed and fixed our AC's cooling issue same-day." },
    ],
    emergencyTypes: ["AC/fridge stopped completely", "Appliance sparking or overheating"],
    bookingFields: [
      { name: "applianceType", label: "Which appliance?", type: "select", options: ["AC", "Refrigerator", "Washing machine", "TV/electronics", "Other"] },
      { name: "brandModel", label: "Brand/model (if known)", type: "text" },
      { name: "issueDescription", label: "Describe the issue", type: "textarea" },
    ],
  },
};

export function getCategoryConfig(id) {
  const base = CATEGORIES.find((c) => c.id === id);
  if (!base) return null;
  const overrides = readOverrides()[id] || {};
  const defaults = DEFAULT_CONFIG[id] || {};
  return {
    id: base.id,
    label: base.label,
    icon: base.icon,
    rateMin: base.rateMin,
    rateMax: base.rateMax,
    skills: base.skills,
    active: overrides.active !== undefined ? overrides.active : true,
    ...defaults,
    ...overrides,
    theme: { ...defaults.theme, ...(overrides.theme || {}) },
  };
}

export function getAllCategoryConfigs() {
  return CATEGORIES.map((c) => getCategoryConfig(c.id));
}

export function getActiveCategoryConfigs() {
  return getAllCategoryConfigs().filter((c) => c.active);
}

// ---------------------------------------------------------------
// Admin editing — persisted as an override layer on top of
// DEFAULT_CONFIG so a real backend can later just replace this
// read/write pair with Firestore calls against a "categories"
// collection shaped the same way.
// ---------------------------------------------------------------
export function saveCategoryOverride(id, partial) {
  const overrides = readOverrides();
  overrides[id] = { ...(overrides[id] || {}), ...partial };
  writeOverrides(overrides);
}

export function setCategoryActive(id, active) {
  saveCategoryOverride(id, { active });
}

// Deletion guard: categories referenced by existing bookings can
// only be deactivated, not removed, so history stays intact.
export function canDeleteCategory(id, bookings) {
  return !bookings.some((b) => b.category === id);
}
