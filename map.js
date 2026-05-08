// ═══════════════════════════════════════════════════════════════
//  js/map.js
//  Leaflet map setup, basemap control, GeoJSON boundary layers
// ═══════════════════════════════════════════════════════════════

/* ── 1. Map Initialization ────────────────────────────────── */
const MAP_CENTER = [6.5, 124.8]; // Region 12 approximate centroid
const MAP_ZOOM   = 8;

const map = L.map("map", {
  center: MAP_CENTER,
  zoom:   MAP_ZOOM,
  zoomControl: false,
  attributionControl: true
});

// ── 2. Basemap Tile Layers ───────────────────────────────────
const basemaps = {
  "Street (OSM)": L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    { attribution: "© OpenStreetMap contributors", maxZoom: 19 }
  ),

  "Satellite (Esri)": L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    { attribution: "© Esri, Maxar, Earthstar Geographics", maxZoom: 19 }
  ),

  "Topographic (Esri)": L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    { attribution: "© Esri, HERE, DeLorme", maxZoom: 19 }
  ),

  "Dark (CartoDB)": L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    { attribution: "© OpenStreetMap contributors, © CARTO", maxZoom: 19 }
  )
};

// Set default basemap
basemaps["Dark (CartoDB)"].addTo(map);

// ── 3. Layer Controls ────────────────────────────────────────
L.control.zoom({ position: "topright" }).addTo(map);

const layerControl = L.control.layers(basemaps, {}, {
  position:    "topright",
  collapsed:   true
}).addTo(map);

// ── 4. Boundary Layer Storage ────────────────────────────────
//  These will hold GeoJSON Leaflet layers once loaded.
//  The boundary GeoJSON files live in /data/geojson/
let boundaryLayers = {
  region12:      null,   // Region 12 whole boundary
  provinces:     {},     // keyed by province name (lowercase)
  municipalities: {}     // keyed by municipality name (lowercase)
};

// ── 5. Active highlight layer reference ─────────────────────
let activeHighlight = null;

// Highlight styles
const HIGHLIGHT_STYLE = {
  color:     "#ff5c35",
  weight:    3,
  opacity:   1,
  fillColor: "rgba(255,92,53,0.18)",
  fillOpacity: 0.18
};

const DISTRICT_STYLE = {
  color:       "#c9943a",
  weight:      2.5,
  opacity:     0.9,
  fillColor:   "#c9943a",
  fillOpacity: 0.1,
  dashArray:   "6,4"
};

const PROVINCE_BASE_STYLE = {
  color:       "rgba(56,182,255,0.5)",
  weight:      1.5,
  opacity:     0.6,
  fillColor:   "transparent",
  fillOpacity: 0
};

// ── 6. Load GeoJSON Boundaries ───────────────────────────────
//
//  File placement (add your own GeoJSON or download from GADM/PHIVOLCS):
//    data/geojson/region12.geojson       — Region 12 boundary
//    data/geojson/provinces.geojson      — Province boundaries (property: "name")
//    data/geojson/municipalities.geojson — Municipality boundaries (property: "name", "province")
//
async function loadBoundaries() {
  try {
    // Region 12 district boundary
    const r12Resp = await fetch("data/geojson/region12.geojson");
    if (r12Resp.ok) {
      const r12Data = await r12Resp.json();
      boundaryLayers.region12 = L.geoJSON(r12Data, {
        style: DISTRICT_STYLE,
        interactive: true
      });
      boundaryLayers.region12.on("click", () => highlightRegion());
    }

    // Province boundaries
    const provResp = await fetch("data/geojson/provinces.geojson");
    if (provResp.ok) {
      const provData = await provResp.json();
      L.geoJSON(provData, {
        style: PROVINCE_BASE_STYLE,
        onEachFeature: (feature, layer) => {
          const key = (feature.properties.name || "").toLowerCase().trim();
          boundaryLayers.provinces[key] = layer;
          layer.on("click", () => {
            // Allow clicking province to highlight it
            highlightBoundary(layer);
          });
        }
      }).addTo(map);
    }

    // Municipality boundaries (optional, large file)
    const muniResp = await fetch("data/geojson/municipalities.geojson");
    if (muniResp.ok) {
      const muniData = await muniResp.json();
      L.geoJSON(muniData, {
        style: { ...PROVINCE_BASE_STYLE, weight: 0.8, opacity: 0.4 },
        onEachFeature: (feature, layer) => {
          const key = (feature.properties.name || "").toLowerCase().trim();
          boundaryLayers.municipalities[key] = layer;
        }
      }); // not added to map by default (added on substation click)
    }

  } catch (err) {
    console.warn("Boundary GeoJSON loading skipped or failed:", err.message);
  }
}

// ── 7. Highlight Functions ───────────────────────────────────

/** Clear any previously highlighted boundary */
function clearHighlight() {
  if (activeHighlight) {
    if (map.hasLayer(activeHighlight)) map.removeLayer(activeHighlight);
    activeHighlight = null;
  }
}

/** Highlight the entire Region 12 boundary */
function highlightRegion() {
  clearHighlight();
  if (!boundaryLayers.region12) return;
  boundaryLayers.region12.setStyle(HIGHLIGHT_STYLE);
  if (!map.hasLayer(boundaryLayers.region12)) {
    boundaryLayers.region12.addTo(map);
  }
  activeHighlight = boundaryLayers.region12;
  map.fitBounds(boundaryLayers.region12.getBounds(), { padding: [40, 40] });
}

/** Highlight a province by name */
function highlightProvince(provinceName) {
  clearHighlight();
  const key   = (provinceName || "").toLowerCase().trim();
  const layer = boundaryLayers.provinces[key];
  if (!layer) return;
  layer.setStyle(HIGHLIGHT_STYLE);
  if (!map.hasLayer(layer)) layer.addTo(map);
  activeHighlight = layer;
  map.fitBounds(layer.getBounds(), { padding: [60, 60] });
}

/** Highlight a municipality by name */
function highlightMunicipality(municipalityName) {
  clearHighlight();
  const key   = (municipalityName || "").toLowerCase().trim();
  const layer = boundaryLayers.municipalities[key];
  if (!layer) return;
  layer.setStyle(HIGHLIGHT_STYLE);
  if (!map.hasLayer(layer)) layer.addTo(map);
  activeHighlight = layer;
  map.fitBounds(layer.getBounds(), { padding: [60, 60] });
}

/** Generic highlight any passed layer */
function highlightBoundary(layer) {
  clearHighlight();
  layer.setStyle(HIGHLIGHT_STYLE);
  if (!map.hasLayer(layer)) layer.addTo(map);
  activeHighlight = layer;
}

// Click on empty map area resets highlight
map.on("click", (e) => {
  // Only clear if nothing else caught this click
  if (!e.originalEvent._handled) {
    clearHighlight();
    closeInfoPanel();
  }
});

// ── 8. Custom Marker Factory ─────────────────────────────────
/**
 * Creates a rotated-square "pin" marker div icon.
 * @param {string} color  - hex color
 * @param {boolean} isSubstation
 * @returns {L.DivIcon}
 */
function createMarkerIcon(color, isSubstation = false) {
  const cls  = isSubstation ? "cg-marker substation" : "cg-marker";
  const size = isSubstation ? 22 : 32;
  return L.divIcon({
    className: "",
    html: `<div class="${cls}" style="background:${color};"></div>`,
    iconSize:   [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor:[0, -size]
  });
}

// ── 9. Marker layer group ─────────────────────────────────────
const markersLayer = L.layerGroup().addTo(map);

// Expose active marker reference for highlight toggling
let activeMarkerEl  = null;

function setActiveMarker(markerEl) {
  if (activeMarkerEl) activeMarkerEl.classList.remove("active-marker");
  activeMarkerEl = markerEl;
  if (activeMarkerEl) activeMarkerEl.classList.add("active-marker");
}

// ── 10. Info Panel helpers ───────────────────────────────────
function openInfoPanel(data) {
  const panel = document.getElementById("info-panel");
  document.getElementById("info-badge").textContent = data.type === "substation" ? "SUB-STATION" : "STATION";
  document.getElementById("info-badge").className   = "info-badge" + (data.type === "substation" ? " substation" : "");
  document.getElementById("info-name").textContent  = data.name || "—";
  document.getElementById("info-province").textContent     = data.province || "";
  document.getElementById("info-municipality").textContent = data.municipality || "";

  const statusHtml = data.status
    ? `<span class="status-badge status-${data.status}">${data.status}</span>`
    : "";

  document.getElementById("info-details").innerHTML =
    (data.description ? `<p>${data.description}</p>` : "<p><em>No description provided.</em></p>") +
    (statusHtml ? `<p style="margin-top:8px;">${statusHtml}</p>` : "");

  document.getElementById("info-coords").textContent =
    data.lat && data.lng ? `${parseFloat(data.lat).toFixed(5)}°N, ${parseFloat(data.lng).toFixed(5)}°E` : "";

  panel.classList.remove("hidden");
}

function closeInfoPanel() {
  document.getElementById("info-panel").classList.add("hidden");
  setActiveMarker(null);
}

document.getElementById("info-close").addEventListener("click", () => {
  closeInfoPanel();
  clearHighlight();
});

// Initialize boundaries on load
loadBoundaries();
