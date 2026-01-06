
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

// Utilities ---------------------------------

function pad2(n){ return String(n).padStart(2, "0"); }

function todayISO() {
  const d = new Date(); 
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}

function calcAge(dobISO) {
  if (!dobISO) return "—";
  const dob = new Date(dobISO + "T00:00:00");
  if (Number.isNaN(dob.getTime())) return "—";
  const t = new Date();
  let age = t.getFullYear() - dob.getFullYear();
  const m = t.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < dob.getDate())) age--;
  return age >= 0 ? String(age) : "—";
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function round1(n) {
  return Number(n.toFixed(1));
}

function unitLabel() {
  return db.unit === "kg" ? "kg" : "lbs";
}

function lbsToKg(lbs) { return lbs / 2.2046226218; }
function kgToLbs(kg) { return kg * 2.2046226218; }

function convertWeight(value, fromUnit, toUnit) {
  if (!Number.isFinite(value)) return value;
  if (fromUnit === toUnit) return value;
  return (fromUnit === "lbs" && toUnit === "kg") ? lbsToKg(value) : kgToLbs(value);
}

// ------ createElement------------------------

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "className") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k === "html") node.innerHTML = v;
    else if (k === "dataset") Object.assign(node.dataset, v);
    else node.setAttribute(k, v);
  }
  //------------------ appendChild---------------
   
  children.forEach(ch => node.appendChild(ch));
  return node;
}

function showToast(msg, kind = "primary") {
  const alert = el("div", { className: `alert alert-${kind} py-2 mb-2`, role: "alert", text: msg });
  toastArea.appendChild(alert);
  setTimeout(() => alert.remove(), 2200); // BOM setTimeout
}