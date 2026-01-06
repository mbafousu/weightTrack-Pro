
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


// -------------------------------------------
// Create Template (cloneNode)
// -------------------------------------------
const rowTpl = document.createElement("template");
rowTpl.innerHTML = `
  <tr class="log-row" data-id="">
    <td class="c-date"></td>
    <td class="c-weight"></td>
    <td class="c-delta"></td>
    <td class="c-flag"></td>
    <td class="c-notes"></td>
    <td class="text-end">
      <button type="button" class="btn btn-sm btn-outline-primary editBtn">Edit</button>
      <button type="button" class="btn btn-sm btn-outline-danger deleteBtn">Delete</button>
    </td>
  </tr>
`;


//-------------- DOM references--------------------- 

let toastArea;
let kpiArea;
let tableBody;
let emptyState;


// --------- Render UI (Bootstrap layout)---------------

function render() {
  app.innerHTML = "";

  // Header
  const header = el("header", { className: "brand-gradient text-white" }, [
    el("div", { className: "container py-3" }, [
      el("div", { className: "d-flex flex-wrap align-items-center justify-content-between gap-3" }, [
        el("div", {}, [
          el("h1", { className: "h4 mb-1", id: "title", text: "WeightTrack-Pro (Personal)" }),
          el("div", { className: "small text-white-50", id: "clock", text: "—" })
        ]),
        el("div", { className: "d-flex flex-wrap gap-2" }, [
          el("button", { className: "btn btn-light btn-sm", id: "exportBtn", type: "button", text: "Export CSV" }),
          el("button", { className: "btn btn-outline-light btn-sm", id: "printBtn", type: "button", text: "Print" }),
          el("button", { className: "btn btn-outline-light btn-sm", id: "clearBtn", type: "button", text: "Clear All" })
        ])
      ])
    ])
  ]);

  const main = el("main", { className: "container my-4" });
  toastArea = el("div", { id: "toastArea", className: "mb-3" });

  // Top layout
  const row = el("div", { className: "row g-3" });

  // Left: Profile + Settings + Log
  const left = el("div", { className: "col-12 col-lg-4" });

  // Profile card
  const profileCard = el("div", { className: "card shadow-sm" }, [
    el("div", { className: "card-body" }, [
      el("div", { className: "d-flex justify-content-between align-items-center mb-2" }, [
        el("h2", { className: "h6 mb-0", text: "Profile" }),
        el("span", { className: "badge badge-soft", id: "unitBadge", text: `Unit: ${unitLabel()}` })
      ]),
      el("form", { id: "profileForm", novalidate: "true" }, [
        el("label", { className: "form-label fw-bold", text: "Name" }),
        el("input", {
          className: "form-control",
          id: "nameInput",
          type: "text",
          required: "true",
          maxlength: "40",
          placeholder: "e.g., Suzy"
        }),
        el("div", { className: "invalid-feedback", text: "Name is required." }),

        el("label", { className: "form-label fw-bold mt-3", text: "Date of Birth" }),
        el("input", {
          className: "form-control",
          id: "dobInput",
          type: "date"
        }),

        el("div", { className: "small-muted mt-2", id: "ageLine", text: "Age: —" }),
        el("button", { className: "btn btn-primary w-100 mt-3", type: "submit", text: "Save Profile" })
      ])
    ])
  ]);

  // Settings card
  const settingsCard = el("div", { className: "card shadow-sm mt-3" }, [
    el("div", { className: "card-body" }, [
      el("h2", { className: "h6 mb-3", text: "Settings" }),

      el("label", { className: "form-label fw-bold", text: "Unit" }),
      el("select", { className: "form-select", id: "unitSelect" }, [
        el("option", { value: "lbs", text: "lbs" }),
        el("option", { value: "kg", text: "kg" })
      ]),

      el("label", { className: "form-label fw-bold mt-3", text: `Goal Weight (${unitLabel()})` }),
      el("input", {
        className: "form-control",
        id: "goalInput",
        type: "number",
        step: "0.1",
        min: "0",
        placeholder: "e.g., 180",
        required: "true" // HTML attribute validation
      }),
      el("div", { className: "small text-danger mt-2", id: "goalError", text: "" }),
      el("button", { className: "btn btn-success w-100 mt-3", id: "saveGoalBtn", type: "button", text: "Save Goal" })
    ])
  ]);

  // Log card
  const logCard = el("div", { className: "card shadow-sm mt-3" }, [
    el("div", { className: "card-body" }, [
      el("h2", { className: "h6 mb-3", text: "Log Weight" }),
      el("form", { id: "logForm", novalidate: "true" }, [
        el("label", { className: "form-label fw-bold", text: "Date" }),
        el("input", { className: "form-control", id: "dateInput", type: "date", required: "true" }),
        el("div", { className: "invalid-feedback", text: "Please choose a date." }),

        el("label", { className: "form-label fw-bold mt-3", text: `Weight (${unitLabel()})` }),
        el("input", {
          className: "form-control",
          id: "weightInput",
          type: "number",
          step: "0.1",
          min: "0",
          placeholder: "e.g., 205.4",
          required: "true"
        }),
        el("div", { className: "invalid-feedback", text: "Please enter a valid weight." }),

        el("label", { className: "form-label fw-bold mt-3", text: "Notes (optional)" }),
        el("input", { className: "form-control", id: "notesInput", type: "text", maxlength: "80", placeholder: "e.g., after workout" }),

        el("div", { className: "text-danger small mt-2", id: "logError", text: "" }),

        el("button", { className: "btn btn-primary w-100 mt-3", type: "submit", text: "Add Log" })
      ])
    ])
  ]);

  left.appendChild(profileCard);
  left.appendChild(settingsCard);
  left.appendChild(logCard);

  // Right: KPIs + History (table)
  const right = el("div", { className: "col-12 col-lg-8" });

  const kpiCard = el("div", { className: "card shadow-sm" }, [
    el("div", { className: "card-body" }, [
      el("div", { className: "d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2" }, [
        el("h2", { className: "h6 mb-0", text: "Progress Dashboard" }),
        el("span", { className: "badge text-bg-light", id: "statusBadge", text: "Set a goal to begin." })
      ]),
      (kpiArea = el("div", { className: "row g-2 mt-1", id: "kpiArea" }))
    ])
  ]);

  const historyCard = el("div", { className: "card shadow-sm mt-3" }, [
    el("div", { className: "card-body" }, [
      el("div", { className: "d-flex flex-wrap justify-content-between align-items-center gap-2" }, [
        el("h2", { className: "h6 mb-0", text: "History" }),

        // Dropdowns
        el("div", { className: "d-flex gap-2 align-items-center" }, [
          el("select", { className: "form-select form-select-sm", id: "rangeSelect" }, [
            el("option", { value: "7d", text: "Last 7 days" }),
            el("option", { value: "30d", text: "Last 30 days" }),
            el("option", { value: "all", text: "All time" })
          ]),
          el("select", { className: "form-select form-select-sm", id: "sortSelect" }, [
            el("option", { value: "newest", text: "Newest" }),
            el("option", { value: "oldest", text: "Oldest" })
          ])
        ])
      ]),

      el("div", { className: "table-responsive mt-3" }, [
        el("table", { className: "table table-sm align-middle" }, [
          el("thead", {}, [
            el("tr", {}, [
              el("th", { text: "Date" }),
              el("th", { text: `Weight (${unitLabel()})` }),
              el("th", { text: "Δ vs previous" }),
              el("th", { text: "Flag" }),
              el("th", { text: "Notes" }),
              el("th", { className: "text-end", text: "Actions" })
            ])
          ]),
          (tableBody = el("tbody", { id: "logTableBody" }))
        ])
      ]),

      (emptyState = el("div", { className: "text-body-secondary", id: "emptyState", text: "No logs yet. Add your first check-in!" }))
    ])
  ]);

  right.appendChild(kpiCard);
  right.appendChild(historyCard);

  row.appendChild(left);
  row.appendChild(right);

  main.appendChild(toastArea);
  main.appendChild(row);

  app.appendChild(header);
  app.appendChild(main);

    // --------------------------------------------
  //  querySelector/querySelectorAll
  // ----------------------------------------------

  const clockEl = document.querySelector("#clock");
  const titleEl = document.querySelector("#title");
  setInterval(() => {
    const d = new Date(); // BOM
    clockEl.textContent = `Today: ${todayISO()} • Time: ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;

    const rows = document.querySelectorAll(".log-row").length; // querySelectorAll
    titleEl.textContent = `WeightTrack-Pro (Personal) • Logs: ${rows}`;
  }, 1000);

  wireEvents();
  hydrateInputs();
  refreshAll();
}

function hydrateInputs() {
  // Profile defaults
  document.getElementById("nameInput").value = db.profile.name || "You";
  document.getElementById("dobInput").value = db.profile.dob || "";
  document.getElementById("ageLine").textContent = `Age: ${calcAge(db.profile.dob)}`;

  // Unit
  const unitSelect = document.getElementById("unitSelect");
  unitSelect.value = db.unit;

  // Goal
  document.getElementById("goalInput").value =
    (typeof db.goalWeight === "number") ? String(db.goalWeight) : "";

  // Date default + attribute mod
  const dateInput = document.getElementById("dateInput");
  dateInput.value = todayISO();
  dateInput.max = todayISO(); // modify attribute

  // Range/sort dropdowns
  document.getElementById("rangeSelect").value = db.ui.range || "all";
  document.getElementById("sortSelect").value = db.ui.sort || "newest";

  document.getElementById("unitBadge").textContent = `Unit: ${unitLabel()}`;
}

function wireEvents() {
  // Export / Print / Clear (BOM)
  document.getElementById("exportBtn").addEventListener("click", exportCSV);
  document.getElementById("printBtn").addEventListener("click", () => window.print()); // BOM
  document.getElementById("clearBtn").addEventListener("click", clearAll);

  // Profile save (event-driven)
  document.getElementById("profileForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    form.classList.remove("was-validated");

    const name = document.getElementById("nameInput").value.trim();
    const dob = document.getElementById("dobInput").value;

    if (!form.checkValidity() || !name) {
      form.classList.add("was-validated");
      return;
    }

    db.profile.name = name;
    db.profile.dob = dob;
    saveDB();

    document.getElementById("ageLine").textContent = `Age: ${calcAge(dob)}`;
    showToast("Profile saved.", "success");
    refreshAll();
  });

  // Unit change (dropdown)
  document.getElementById("unitSelect").addEventListener("change", (e) => {
    const newUnit = e.target.value;
    if (newUnit !== "lbs" && newUnit !== "kg") return;

    const from = db.unit;
    const to = newUnit;

    // Convert stored goal + logs to new unit
    if (typeof db.goalWeight === "number") {
      db.goalWeight = round1(convertWeight(db.goalWeight, from, to));
    }
    db.logs.forEach(l => {
      l.weight = round1(convertWeight(l.weight, from, to));
    });

    db.unit = to;
    saveDB();
    showToast(`Unit changed to ${to}.`, "secondary");
    render(); //
  });

  // Save goal (button)
  document.getElementById("saveGoalBtn").addEventListener("click", () => {
    document.getElementById("goalError").textContent = "";
    const goal = toNum(document.getElementById("goalInput").value);

    // DOM event-based validation 
    if (!Number.isFinite(goal) || goal <= 0) {
      document.getElementById("goalError").textContent = "Please enter a valid goal weight.";
      return;
    }

    db.goalWeight = round1(goal);
    saveDB();
    showToast("Goal saved.", "success");
    refreshAll();
  });

  // Log form
  document.getElementById("logForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    form.classList.remove("was-validated");
    document.getElementById("logError").textContent = "";

    const date = document.getElementById("dateInput").value;
    const weight = toNum(document.getElementById("weightInput").value);
    const notes = document.getElementById("notesInput").value.trim();

    // HTML validation
    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      return;
    }

    // JS validation
    if (!date) {
      document.getElementById("logError").textContent = "Date is required.";
      return;
    }
    if (!Number.isFinite(weight) || weight <= 0) {
      document.getElementById("logError").textContent = "Please enter a valid weight.";
      return;
    }

    // Prevent duplicate dates
    if (db.logs.some(l => l.date === date)) {
      document.getElementById("logError").textContent = "A log already exists for this date.";
      return;
    }

    db.logs.push({
      id: crypto.randomUUID(),
      date,
      weight: round1(weight),
      notes,
      createdAt: Date.now()
    });

    saveDB();
    showToast("Log added.", "success");
    form.reset();

    // modify attribute/value after interaction
    const dateInput = document.getElementById("dateInput");
    dateInput.value = todayISO();
    dateInput.max = todayISO();

    refreshAll();
  });

  // Range/sort dropdowns
  document.getElementById("rangeSelect").addEventListener("change", (e) => {
    db.ui.range = e.target.value;
    saveDB();
    refreshAll();
  });
  document.getElementById("sortSelect").addEventListener("change", (e) => {
    db.ui.sort = e.target.value;
    saveDB();
    refreshAll();
  });

  // Table actions (event delegation)
  tableBody.addEventListener("click", (e) => {
    const row = e.target.closest(".log-row");
    if (!row) return;

    // -----------------------parent/child/sibling traversal------------------------

    const firstCell = row.firstElementChild;          // date cell
    const weightCell = firstCell.nextElementSibling;  // sibling cell
    void weightCell.textContent; // proof access

    const id = row.dataset.id;
    if (e.target.classList.contains("deleteBtn")) deleteLog(id);
    if (e.target.classList.contains("editBtn")) editLog(id);
  });
}

function refreshAll() {
  renderKPIs();
  renderTable();
}

function getFilteredLogs() {
  const logs = db.logs.slice();

  // Filter by range
  const range = db.ui.range || "all";
  if (range !== "all") {
    const now = new Date(todayISO() + "T00:00:00").getTime();
    const days = range === "7d" ? 7 : 30;
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return logs.filter(l => new Date(l.date + "T00:00:00").getTime() >= cutoff);
  }
  return logs;
}

function renderKPIs() {
  kpiArea.innerHTML = "";

  const logsAsc = db.logs.slice().sort((a,b) => a.date.localeCompare(b.date));
  const logs = getFilteredLogs().sort((a,b) => a.date.localeCompare(b.date));

  const start = logsAsc[0]?.weight ?? null;
  const current = logsAsc.length ? logsAsc[logsAsc.length - 1].weight : null;
  const prev = logsAsc.length > 1 ? logsAsc[logsAsc.length - 2].weight : null;
  const goal = (typeof db.goalWeight === "number") ? db.goalWeight : null;

  const delta = (current != null && prev != null) ? round1(current - prev) : null;
  const totalChange = (current != null && start != null) ? round1(current - start) : null;

  const progress = (current != null && goal != null && start != null)
    ? computeProgressPercent(current, goal, start)
    : null;

  const statusBadge = document.getElementById("statusBadge");
  let statusText = "Set a goal to begin.";
  let badgeClass = "text-bg-light";

  if (goal != null && current != null && start != null) {
    const direction = (goal < start)
      ? (current <= goal ? "Goal reached" : "Weight loss in progress")
      : (current >= goal ? "Goal reached" : "Weight gain in progress");

    statusText = `${direction} • Goal ${goal} ${unitLabel()}`;
    badgeClass = "text-bg-primary";
  }
  statusBadge.className = `badge ${badgeClass}`;
  statusBadge.textContent = statusText;

  const cards = [
    { label: "Current", value: current != null ? `${current} ${unitLabel()}` : "—" },
    { label: "Goal", value: goal != null ? `${goal} ${unitLabel()}` : "—" },
    { label: "Δ since last", value: delta != null ? `${delta > 0 ? "+" : ""}${delta} ${unitLabel()}` : "—" },
    { label: "Total change", value: totalChange != null ? `${totalChange > 0 ? "+" : ""}${totalChange} ${unitLabel()}` : "—" }
  ];
  
  //--------------iterate over collection----------
  cards.forEach(c => {
    const col = el("div", { className: "col-6 col-lg-3" }, [
      el("div", { className: "border rounded-3 p-3 metric-card bg-white" }, [
        el("div", { className: "label", text: c.label }),
        el("div", { className: "value", text: c.value })
      ])
    ]);
    kpiArea.appendChild(col);
  });

  // Optional alert toast

  const alertText = rapidChangeAlert(logsAsc);
  if (alertText) showToast(alertText, "warning");
}

function computeProgressPercent(current, goal, start) {
  const denom = (start - goal);
  if (denom === 0) return 100;
  const pct = ((start - current) / denom) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

function rapidChangeAlert(logsAsc) {
  if (logsAsc.length < 2) return "";
  const a = logsAsc[logsAsc.length - 2];
  const b = logsAsc[logsAsc.length - 1];

  const msA = new Date(a.date + "T00:00:00").getTime();
  const msB = new Date(b.date + "T00:00:00").getTime();
  const days = Math.abs(msB - msA) / (1000*60*60*24);
  const change = round1(b.weight - a.weight);

  if (days <= 1 && Math.abs(change) >= 2) {
    return `Alert: ${change > 0 ? "+" : ""}${change} ${unitLabel()} in ~24h`;
  }
  return "";
}

function renderTable() {
  tableBody.innerHTML = "";

  const rangeFiltered = getFilteredLogs();
  const logsSorted = rangeFiltered.slice().sort((a,b) =>
    (db.ui.sort === "oldest")
      ? a.date.localeCompare(b.date)
      : b.date.localeCompare(a.date)
  );

  emptyState.style.display = logsSorted.length ? "none" : "block";

  // Build a map for delta vs previous
  const ascAll = db.logs.slice().sort((a,b) => a.date.localeCompare(b.date));
  const idx = new Map(ascAll.map((l,i) => [l.id, i]));

  //-------------- DocumentFragment-------------------

  const frag = document.createDocumentFragment();

  logsSorted.forEach(l => {
    const clone = rowTpl.content.cloneNode(true); // cloneNode
    const tr = clone.querySelector("tr");
    tr.dataset.id = l.id; //modify attribute

    clone.querySelector(".c-date").textContent = l.date;
    clone.querySelector(".c-weight").textContent = String(l.weight);

    const i = idx.get(l.id);
    let deltaText = "—";
    if (i > 0) {
      const prev = ascAll[i - 1].weight;
      const d = round1(l.weight - prev);
      deltaText = `${d > 0 ? "+" : ""}${d}`;
    }
    clone.querySelector(".c-delta").textContent = deltaText;

    // Flag badge
    const flagTd = clone.querySelector(".c-flag");
    const badge = document.createElement("span");
    badge.className = "badge badge-soft";
    badge.textContent = "Normal";

    if (deltaText !== "—") {
      const d = Number(deltaText);
      if (d >= 2) {
        badge.className = "badge badge-soft-warning";
        badge.textContent = "Rapid Gain";
      } else if (d <= -2) {
        badge.className = "badge badge-soft-success";
        badge.textContent = "Good Drop";
      }
    }
    flagTd.appendChild(badge);

    clone.querySelector(".c-notes").textContent = l.notes || "—";

    frag.appendChild(clone);
  });

  tableBody.appendChild(frag);
}

function editLog(id) {
  const entry = db.logs.find(l => l.id === id);
  if (!entry) return;

  // BOM prompt
  const newWeightStr = prompt(`Edit weight (${unitLabel()}):`, String(entry.weight));
  if (newWeightStr === null) return;

  const newWeight = toNum(newWeightStr);
  if (!Number.isFinite(newWeight) || newWeight <= 0) {
    alert("Invalid weight.");
    return;
  }

  entry.weight = round1(newWeight);
  saveDB();
  showToast("Log updated.", "primary");
  refreshAll();
}

function deleteLog(id) {
  const entry = db.logs.find(l => l.id === id);
  if (!entry) return;

  // BOM confirm
  if (!confirm(`Delete log on ${entry.date}?`)) return;

  db.logs = db.logs.filter(l => l.id !== id);
  saveDB();
  showToast("Log deleted.", "secondary");
  refreshAll();
}

function exportCSV() {
  const logs = db.logs.slice().sort((a,b) => a.date.localeCompare(b.date));
  if (!logs.length) {
    showToast("No logs to export.", "secondary");
    return;
  }

  const lines = [
    ["Name", db.profile.name],
    ["DOB", db.profile.dob],
    ["Age", calcAge(db.profile.dob)],
    ["Unit", unitLabel()],
    ["GoalWeight", db.goalWeight ?? ""],
    [],
    ["Date", `Weight (${unitLabel()})`, "Notes"],
    ...logs.map(l => [l.date, String(l.weight), l.notes || ""])
  ];

  const csv = lines.map(row => row.map(cell => {
    const s = String(cell ?? "");
    return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `WeightTrack-Pro_Personal_${db.profile.name.replaceAll(" ", "_")}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  showToast("CSV exported.", "success");
}

function clearAll() {
  if (!confirm("Clear ALL profile, goal, and logs?")) return;
  localStorage.removeItem(DB_KEY);
  location.reload(); // BOM location
}

// -----------------------
// Start
// -----------------------
render();

