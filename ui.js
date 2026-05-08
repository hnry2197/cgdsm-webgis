// ═══════════════════════════════════════════════════════════════
//  js/ui.js
//  Search panel, legend toggle, panel interactions
//  Depends on: map.js, stations.js
// ═══════════════════════════════════════════════════════════════

// ── Panel toggles ─────────────────────────────────────────────
document.getElementById("btn-search-toggle").addEventListener("click", () => {
  togglePanel("search-panel", "legend-panel");
  document.getElementById("search-input").focus();
});

document.getElementById("btn-legend-toggle").addEventListener("click", () => {
  togglePanel("legend-panel", "search-panel");
});

document.getElementById("search-close").addEventListener("click", () =>
  document.getElementById("search-panel").classList.add("hidden")
);

document.getElementById("legend-close").addEventListener("click", () =>
  document.getElementById("legend-panel").classList.add("hidden")
);

function togglePanel(showId, hideId) {
  const showEl = document.getElementById(showId);
  const hideEl = document.getElementById(hideId);
  if (hideEl) hideEl.classList.add("hidden");
  showEl.classList.toggle("hidden");
}

// ── Live search ───────────────────────────────────────────────
const searchInput   = document.getElementById("search-input");
const searchResults = document.getElementById("search-results");

searchInput.addEventListener("input", () => {
  const query   = searchInput.value;
  const results = searchStations(query);

  searchResults.innerHTML = "";
  if (!query.trim() || results.length === 0) {
    if (query.trim()) {
      searchResults.innerHTML = '<li style="padding:10px 16px;color:var(--muted);font-size:0.82rem;">No results found.</li>';
    }
    return;
  }

  results.slice(0, 12).forEach(item => {
    const parentColor = item.type === "substation"
      ? (stationsCache[item.parentId || item.parentStation]?.data?.color || item.color || "#1a7fd4")
      : (item.color || "#0057a8");

    const li = document.createElement("li");
    li.className = "search-result-item";
    li.innerHTML = `
      <span class="search-result-dot" style="background:${parentColor};"></span>
      <span>
        <div class="search-result-label">${item.name}</div>
        <div class="search-result-sub">${item.type === "substation" ? "Sub-Station" : "Station"} · ${item.province || ""}</div>
      </span>`;

    li.addEventListener("click", () => {
      flyToMarker(item);
      document.getElementById("search-panel").classList.add("hidden");
      searchInput.value = "";
      searchResults.innerHTML = "";
    });

    searchResults.appendChild(li);
  });
});

// ── Keyboard: Escape closes panels ───────────────────────────
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    document.getElementById("search-panel").classList.add("hidden");
    document.getElementById("legend-panel").classList.add("hidden");
    closeInfoPanel();
    clearHighlight();
  }
});
