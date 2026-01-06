
const DB_KEY = "weighttrackpro_personal_bootstrap_v1";

// ----------------------------------------------------
// getElementById
// ----------------------------------------------------
const app = document.getElementById("app");

// -----------------------
// BOM: localStorage 
// -----------------------
function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    profile: { name: "You", dob: "" },
    unit: "lbs",         // "lbs" | "kg"
    goalWeight: null,    // number
    logs: [],            // {id,date,weight,notes,createdAt}
    ui: { range: "all", sort: "newest" }, // dropdown filters
    seedDone: false
  };
}

function saveDB() {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

let db = loadDB();
if (!db.seedDone) {
  db.profile = { name: "Personal User", dob: "" };
  db.unit = "lbs";
  db.goalWeight = null;
  db.logs = [];
  db.seedDone = true;
  saveDB();
}