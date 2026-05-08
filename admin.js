// ═══════════════════════════════════════════════════════════════
//  js/admin.js
//  Admin dashboard: Auth, CRUD for stations & sub-stations,
//  CSV import via PapaParse
// ═══════════════════════════════════════════════════════════════

// ── Auth State Gate ──────────────────────────────────────────
auth.onAuthStateChanged(user => {
  if (user) {
    showDashboard(user);
  } else {
    showLogin();
  }
});

function showLogin() {
  document.getElementById("login-screen").classList.remove("hidden");
  document.getElementById("admin-dashboard").classList.add("hidden");
}

function showDashboard(user) {
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("admin-dashboard").classList.remove("hidden");
  document.getElementById("admin-user-email").textContent = user.email;
  initDashboard();
}

// ── Login ─────────────────────────────────────────────────────
document.getElementById("login-btn").addEventListener("click", async () => {
  const email    = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const errorEl  = document.getElementById("login-error");

  errorEl.classList.add("hidden");
  errorEl.textContent = "";

  if (!email || !password) {
    showLoginError("Please enter your email and password.");
    return;
  }

  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (err) {
    const messages = {
      "auth/user-not-found":  "No account found with this email.",
      "auth/wrong-password":  "Incorrect password.",
      "auth/invalid-email":   "Invalid email address.",
      "auth/too-many-requests": "Too many attempts. Try again later."
    };
    showLoginError(messages[err.code] || err.message);
  }
});

// Allow Enter key on password field
document.getElementById("login-password").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("login-btn").click();
});

function showLoginError(msg) {
  const el = document.getElementById("login-error");
  el.textContent = msg;
  el.classList.remove("hidden");
}

// ── Logout ────────────────────────────────────────────────────
document.getElementById("logout-btn").addEventListener("click", () => {
  auth.signOut();
});

// ══════════════════════════════════════════════════════════════
//  DASHBOARD INIT
// ══════════════════════════════════════════════════════════════
function initDashboard() {
  initSidebarNav();
  listenStations();
  listenSubstations();
  initStationForm();
  initSubstationForm();
  initCsvImport();
}

// ── Sidebar navigation ────────────────────────────────────────
function initSidebarNav() {
  document.querySelectorAll(".sidebar-nav-item").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".sidebar-nav-item").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".admin-view").forEach(v => v.classList.remove("active"));
      btn.classList.add("active");
      const viewId = "view-" + btn.dataset.view;
      document.getElementById(viewId).classList.add("active");
    });
  });
}

// ══════════════════════════════════════════════════════════════
//  STATIONS — Real-time listener + table render
// ══════════════════════════════════════════════════════════════
let stationsData = {}; // { id: data }

function listenStations() {
  stationsCol.orderBy("name").onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type === "removed") {
        delete stationsData[change.doc.id];
      } else {
        stationsData[change.doc.id] = { id: change.doc.id, ...change.doc.data() };
      }
    });
    renderStationsTable();
    populateParentStationDropdown();
  });
}

function renderStationsTable() {
  const tbody = document.getElementById("stations-tbody");
  const rows  = Object.values(stationsData);

  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="table-loading">No stations yet. Add one above.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(st => `
    <tr>
      <td><span class="color-swatch" style="background:${st.color || '#0057a8'};"></span></td>
      <td><strong>${escHtml(st.name)}</strong></td>
      <td>${escHtml(st.province || "—")}</td>
      <td><code style="font-size:0.75rem;">${st.lat}, ${st.lng}</code></td>
      <td><span class="status-badge status-${st.status || 'operational'}">${st.status || "operational"}</span></td>
      <td>
        <div class="table-actions">
          <button class="btn btn-outline btn-sm" onclick="editStation('${st.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteStation('${st.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");
}

// ── Station Form ──────────────────────────────────────────────
function initStationForm() {
  document.getElementById("btn-add-station").addEventListener("click", () => {
    clearStationForm();
    document.getElementById("station-form-title").textContent = "Add New Station";
    document.getElementById("station-form-card").classList.remove("hidden");
  });

  document.getElementById("station-cancel-btn").addEventListener("click", () => {
    document.getElementById("station-form-card").classList.add("hidden");
  });

  document.getElementById("station-save-btn").addEventListener("click", saveStation);
}

function clearStationForm() {
  document.getElementById("station-doc-id").value    = "";
  document.getElementById("station-name").value      = "";
  document.getElementById("station-province").value  = "";
  document.getElementById("station-lat").value       = "";
  document.getElementById("station-lng").value       = "";
  document.getElementById("station-color").value     = "#0057a8";
  document.getElementById("station-status").value    = "operational";
  document.getElementById("station-description").value = "";
}

/**
 * Save (Add or Update) a station to Firestore.
 */
async function saveStation() {
  const docId = document.getElementById("station-doc-id").value.trim();
  const name  = document.getElementById("station-name").value.trim();
  const prov  = document.getElementById("station-province").value.trim();
  const lat   = document.getElementById("station-lat").value.trim();
  const lng   = document.getElementById("station-lng").value.trim();

  if (!name || !prov || !lat || !lng) {
    alert("Please fill in all required fields (Name, Province, Lat, Lng).");
    return;
  }

  const payload = {
    name,
    province:    prov,
    lat:         parseFloat(lat),
    lng:         parseFloat(lng),
    color:       document.getElementById("station-color").value,
    status:      document.getElementById("station-status").value,
    description: document.getElementById("station-description").value.trim(),
    updatedAt:   firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    if (docId) {
      // Update existing
      await stationsCol.doc(docId).update(payload);
    } else {
      // Add new
      payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await stationsCol.add(payload);
    }
    document.getElementById("station-form-card").classList.add("hidden");
    clearStationForm();
  } catch (err) {
    alert("Error saving station: " + err.message);
  }
}

/**
 * Populate the form for editing an existing station.
 * @param {string} id - Firestore document ID
 */
function editStation(id) {
  const st = stationsData[id];
  if (!st) return;

  document.getElementById("station-form-title").textContent = "Edit Station";
  document.getElementById("station-doc-id").value      = id;
  document.getElementById("station-name").value        = st.name || "";
  document.getElementById("station-province").value    = st.province || "";
  document.getElementById("station-lat").value         = st.lat || "";
  document.getElementById("station-lng").value         = st.lng || "";
  document.getElementById("station-color").value       = st.color || "#0057a8";
  document.getElementById("station-status").value      = st.status || "operational";
  document.getElementById("station-description").value = st.description || "";

  document.getElementById("station-form-card").classList.remove("hidden");
  document.getElementById("station-form-card").scrollIntoView({ behavior: "smooth" });
}

/**
 * Delete a station from Firestore (with confirmation).
 * @param {string} id - Firestore document ID
 */
async function deleteStation(id) {
  const st = stationsData[id];
  if (!confirm(`Delete station "${st?.name}"?\nThis will NOT automatically delete its sub-stations.`)) return;

  try {
    await stationsCol.doc(id).delete();
  } catch (err) {
    alert("Error deleting station: " + err.message);
  }
}

// ══════════════════════════════════════════════════════════════
//  SUB-STATIONS — Real-time listener + table render
// ══════════════════════════════════════════════════════════════
let substationsData = {}; // { id: data }

function listenSubstations() {
  substationsCol.orderBy("name").onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type === "removed") {
        delete substationsData[change.doc.id];
      } else {
        substationsData[change.doc.id] = { id: change.doc.id, ...change.doc.data() };
      }
    });
    renderSubstationsTable();
  });
}

function renderSubstationsTable() {
  const tbody = document.getElementById("substations-tbody");
  const rows  = Object.values(substationsData);

  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="table-loading">No sub-stations yet.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(sub => {
    const parent      = stationsData[sub.parentId || sub.parentStation];
    const parentColor = parent?.color || "#1a7fd4";
    const parentName  = parent?.name  || (sub.parentId || sub.parentStation || "—");
    return `
      <tr>
        <td><span class="color-swatch" style="background:${parentColor};"></span></td>
        <td><strong>${escHtml(sub.name)}</strong></td>
        <td>${escHtml(parentName)}</td>
        <td>${escHtml(sub.municipality || "—")}</td>
        <td>${escHtml(sub.province || "—")}</td>
        <td><span class="status-badge status-${sub.status || 'operational'}">${sub.status || "operational"}</span></td>
        <td>
          <div class="table-actions">
            <button class="btn btn-outline btn-sm" onclick="editSubstation('${sub.id}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteSubstation('${sub.id}')">Delete</button>
          </div>
        </td>
      </tr>`;
  }).join("");
}

// ── Sub-station form ──────────────────────────────────────────
function initSubstationForm() {
  document.getElementById("btn-add-substation").addEventListener("click", () => {
    clearSubstationForm();
    document.getElementById("substation-form-title").textContent = "Add New Sub-Station";
    document.getElementById("substation-form-card").classList.remove("hidden");
  });

  document.getElementById("substation-cancel-btn").addEventListener("click", () => {
    document.getElementById("substation-form-card").classList.add("hidden");
  });

  document.getElementById("substation-save-btn").addEventListener("click", saveSubstation);
}

function clearSubstationForm() {
  document.getElementById("substation-doc-id").value       = "";
  document.getElementById("substation-name").value         = "";
  document.getElementById("substation-parent").value       = "";
  document.getElementById("substation-municipality").value = "";
  document.getElementById("substation-province").value     = "";
  document.getElementById("substation-lat").value          = "";
  document.getElementById("substation-lng").value          = "";
  document.getElementById("substation-status").value       = "operational";
  document.getElementById("substation-description").value  = "";
}

function populateParentStationDropdown() {
  const sel = document.getElementById("substation-parent");
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">— Select Parent Station —</option>';
  Object.values(stationsData).sort((a, b) => (a.name || "").localeCompare(b.name || "")).forEach(st => {
    const opt = document.createElement("option");
    opt.value       = st.id;
    opt.textContent = st.name;
    sel.appendChild(opt);
  });
  sel.value = current;
}

/**
 * Save (Add or Update) a sub-station to Firestore.
 */
async function saveSubstation() {
  const docId  = document.getElementById("substation-doc-id").value.trim();
  const name   = document.getElementById("substation-name").value.trim();
  const parent = document.getElementById("substation-parent").value.trim();
  const muni   = document.getElementById("substation-municipality").value.trim();
  const lat    = document.getElementById("substation-lat").value.trim();
  const lng    = document.getElementById("substation-lng").value.trim();

  if (!name || !parent || !muni || !lat || !lng) {
    alert("Please fill in all required fields.");
    return;
  }

  // Auto-fill province from parent station if blank
  const province = document.getElementById("substation-province").value.trim() ||
    stationsData[parent]?.province || "";

  const payload = {
    name,
    parentId:     parent,
    parentStation: parent,
    municipality: muni,
    province,
    lat:          parseFloat(lat),
    lng:          parseFloat(lng),
    status:       document.getElementById("substation-status").value,
    description:  document.getElementById("substation-description").value.trim(),
    updatedAt:    firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    if (docId) {
      await substationsCol.doc(docId).update(payload);
    } else {
      payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await substationsCol.add(payload);
    }
    document.getElementById("substation-form-card").classList.add("hidden");
    clearSubstationForm();
  } catch (err) {
    alert("Error saving sub-station: " + err.message);
  }
}

function editSubstation(id) {
  const sub = substationsData[id];
  if (!sub) return;

  document.getElementById("substation-form-title").textContent = "Edit Sub-Station";
  document.getElementById("substation-doc-id").value       = id;
  document.getElementById("substation-name").value         = sub.name || "";
  document.getElementById("substation-municipality").value = sub.municipality || "";
  document.getElementById("substation-province").value     = sub.province || "";
  document.getElementById("substation-lat").value          = sub.lat || "";
  document.getElementById("substation-lng").value          = sub.lng || "";
  document.getElementById("substation-status").value       = sub.status || "operational";
  document.getElementById("substation-description").value  = sub.description || "";

  populateParentStationDropdown();
  document.getElementById("substation-parent").value = sub.parentId || sub.parentStation || "";

  document.getElementById("substation-form-card").classList.remove("hidden");
  document.getElementById("substation-form-card").scrollIntoView({ behavior: "smooth" });
}

async function deleteSubstation(id) {
  const sub = substationsData[id];
  if (!confirm(`Delete sub-station "${sub?.name}"?`)) return;
  try {
    await substationsCol.doc(id).delete();
  } catch (err) {
    alert("Error deleting sub-station: " + err.message);
  }
}

// ══════════════════════════════════════════════════════════════
//  CSV IMPORT (PapaParse → Firestore batch write)
// ══════════════════════════════════════════════════════════════
let csvParsedData = [];

function initCsvImport() {
  const fileInput   = document.getElementById("csv-file-input");
  const previewBtn  = document.getElementById("csv-preview-btn");
  const importBtn   = document.getElementById("csv-import-btn");
  const previewEl   = document.getElementById("csv-preview");
  const logEl       = document.getElementById("import-log");

  previewBtn.addEventListener("click", () => {
    const file = fileInput.files[0];
    if (!file) { alert("Please select a CSV file first."); return; }

    Papa.parse(file, {
      header:    true,
      skipEmptyLines: true,
      complete: (results) => {
        csvParsedData = results.data;
        previewEl.classList.remove("hidden");
        previewEl.textContent = JSON.stringify(csvParsedData.slice(0, 5), null, 2) +
          `\n\n… and ${Math.max(0, csvParsedData.length - 5)} more rows. Total: ${csvParsedData.length} records.`;
        importBtn.classList.remove("hidden");
      },
      error: (err) => {
        alert("CSV parse error: " + err.message);
      }
    });
  });

  importBtn.addEventListener("click", () => importCsvToFirestore(logEl));
}

async function importCsvToFirestore(logEl) {
  if (csvParsedData.length === 0) return;

  logEl.classList.remove("hidden");
  logEl.innerHTML = "";

  let okCount  = 0;
  let errCount = 0;

  for (const row of csvParsedData) {
    try {
      const type = (row.type || "").toLowerCase().trim();
      const payload = {
        name:         (row.name || "").trim(),
        province:     (row.province || "").trim(),
        municipality: (row.municipality || "").trim(),
        lat:          parseFloat(row.latitude  || row.lat || 0),
        lng:          parseFloat(row.longitude || row.lng || 0),
        color:        (row.color || "#0057a8").trim(),
        status:       (row.status || "operational").trim(),
        description:  (row.description || "").trim(),
        createdAt:    firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt:    firebase.firestore.FieldValue.serverTimestamp()
      };

      if (type === "substation" || type === "sub-station") {
        payload.parentStation = (row.parentStation || "").trim();
        payload.parentId      = (row.parentStation || "").trim(); // Store name for now; ideally resolve to ID
        await substationsCol.add(payload);
      } else {
        await stationsCol.add(payload);
      }

      logEl.innerHTML += `<div>✓ Imported: ${row.name}</div>`;
      okCount++;
    } catch (err) {
      logEl.innerHTML += `<div class="log-error">✕ Failed: ${row.name} — ${err.message}</div>`;
      errCount++;
    }
  }

  logEl.innerHTML += `<div style="margin-top:8px;border-top:1px solid rgba(255,255,255,0.1);padding-top:8px;">
    Done: ${okCount} imported, ${errCount} failed.
  </div>`;
}

// ── Helpers ───────────────────────────────────────────────────
function escHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
