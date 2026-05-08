// ═══════════════════════════════════════════════════════════════
//  js/stations.js
//  Real-time Firestore listeners → renders markers on the map
//  Depends on: firebase-config.js, map.js
// ═══════════════════════════════════════════════════════════════

// ── In-memory caches ─────────────────────────────────────────
const stationsCache    = {};   // { docId: { data, marker } }
const substationsCache = {};   // { docId: { data, marker } }

// ── 1. Subscribe to Stations (real-time) ─────────────────────
function subscribeStations() {
  stationsCol.onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
      const id   = change.doc.id;
      const data = { id, ...change.doc.data() };

      if (change.type === "removed") {
        removeStationMarker(id);
        return;
      }

      // Add or update
      upsertStationMarker(id, data);
    });

    // Rebuild legend after every batch
    buildLegend();
    // Rebuild search index
    buildSearchIndex();
  }, err => {
    console.error("Stations listener error:", err);
  });
}

// ── 2. Subscribe to Sub-Stations (real-time) ─────────────────
function subscribeSubstations() {
  substationsCol.onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
      const id   = change.doc.id;
      const data = { id, ...change.doc.data() };

      if (change.type === "removed") {
        removeSubstationMarker(id);
        return;
      }

      upsertSubstationMarker(id, data);
    });

    buildLegend();
    buildSearchIndex();
  }, err => {
    console.error("Substations listener error:", err);
  });
}

// ── 3. Marker upsert helpers ─────────────────────────────────

function upsertStationMarker(id, data) {
  // Remove old marker if it exists
  if (stationsCache[id]?.marker) {
    markersLayer.removeLayer(stationsCache[id].marker);
  }

  const lat   = parseFloat(data.lat);
  const lng   = parseFloat(data.lng);
  if (isNaN(lat) || isNaN(lng)) return;

  const color  = data.color || "#0057a8";
  const icon   = createMarkerIcon(color, false);
  const marker = L.marker([lat, lng], { icon });

  marker.on("click", (e) => {
    e.originalEvent._handled = true;
    const el = marker.getElement()?.querySelector(".cg-marker");
    setActiveMarker(el);
    highlightProvince(data.province);
    openInfoPanel({ ...data, type: "station" });
  });

  markersLayer.addLayer(marker);
  stationsCache[id] = { data, marker };
}

function upsertSubstationMarker(id, data) {
  if (substationsCache[id]?.marker) {
    markersLayer.removeLayer(substationsCache[id].marker);
  }

  const lat = parseFloat(data.lat);
  const lng = parseFloat(data.lng);
  if (isNaN(lat) || isNaN(lng)) return;

  // Inherit color from parent station
  const parentId    = data.parentId || data.parentStation;
  const parentData  = parentId ? stationsCache[parentId]?.data : null;
  const color       = parentData?.color || data.color || "#1a7fd4";

  const icon   = createMarkerIcon(color, true);
  const marker = L.marker([lat, lng], { icon });

  marker.on("click", (e) => {
    e.originalEvent._handled = true;
    const el = marker.getElement()?.querySelector(".cg-marker");
    setActiveMarker(el);
    highlightMunicipality(data.municipality);
    openInfoPanel({ ...data, color, type: "substation" });
  });

  markersLayer.addLayer(marker);
  substationsCache[id] = { data: { ...data, color }, marker };
}

function removeStationMarker(id) {
  if (stationsCache[id]?.marker) markersLayer.removeLayer(stationsCache[id].marker);
  delete stationsCache[id];
}

function removeSubstationMarker(id) {
  if (substationsCache[id]?.marker) markersLayer.removeLayer(substationsCache[id].marker);
  delete substationsCache[id];
}

// ── 4. Legend Builder ────────────────────────────────────────
function buildLegend() {
  const container = document.getElementById("legend-content");
  if (!container) return;

  const stations = Object.values(stationsCache).map(c => c.data);
  if (stations.length === 0) {
    container.innerHTML = '<p class="legend-loading">No stations loaded.</p>';
    return;
  }

  let html = "";
  stations.forEach(st => {
    const color = st.color || "#0057a8";
    const subs  = Object.values(substationsCache)
      .filter(c => (c.data.parentId || c.data.parentStation) === st.id);

    html += `
      <div class="legend-item">
        <span class="legend-dot" style="background:${color};"></span>
        <span class="legend-item-name">${st.name}</span>
      </div>`;

    if (subs.length > 0) {
      html += '<div class="legend-sub-group">';
      subs.forEach(sub => {
        html += `
          <div class="legend-sub-item">
            <span class="legend-sub-dot" style="background:${color};"></span>
            <span>${sub.data.name}</span>
          </div>`;
      });
      html += "</div>";
    }
  });

  container.innerHTML = html;
}

// ── 5. Search Index ──────────────────────────────────────────
let searchIndex = [];

function buildSearchIndex() {
  searchIndex = [];
  Object.values(stationsCache).forEach(c => {
    searchIndex.push({ ...c.data, type: "station", marker: c.marker });
  });
  Object.values(substationsCache).forEach(c => {
    searchIndex.push({ ...c.data, type: "substation", marker: c.marker });
  });
}

function searchStations(query) {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return searchIndex.filter(item =>
    (item.name || "").toLowerCase().includes(q) ||
    (item.province || "").toLowerCase().includes(q) ||
    (item.municipality || "").toLowerCase().includes(q)
  );
}

// ── 6. Fly-to helper (used by search) ───────────────────────
function flyToMarker(item) {
  const lat = parseFloat(item.lat);
  const lng = parseFloat(item.lng);
  if (isNaN(lat) || isNaN(lng)) return;
  map.flyTo([lat, lng], 12, { duration: 1.2 });

  // Simulate a click on the marker after fly
  setTimeout(() => {
    const el = item.marker?.getElement()?.querySelector(".cg-marker");
    setActiveMarker(el);
    if (item.type === "station")    highlightProvince(item.province);
    if (item.type === "substation") highlightMunicipality(item.municipality);
    openInfoPanel({ ...item });
  }, 1300);
}

// ── 7. Boot ──────────────────────────────────────────────────
subscribeStations();
subscribeSubstations();
