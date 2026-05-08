# CGDSM WebGIS
**Coast Guard District Southern Mindanao — Interactive Web Map**

A full-featured, Firebase-backed interactive GIS web application for mapping CG Stations and Sub-Stations across Region 12 (SOCCSKSARGEN), Philippines.

---

## 📁 Project Structure

```
cgdsm-webgis/
│
├── index.html              # Public-facing map application
├── admin.html              # Protected admin dashboard
├── vercel.json             # Vercel deployment config
│
├── css/
│   ├── style.css           # Main stylesheet (map + shared)
│   └── admin.css           # Admin dashboard styles
│
├── js/
│   ├── firebase-config.js  # Firebase init (Auth + Firestore)
│   ├── map.js              # Leaflet map, basemaps, boundaries
│   ├── stations.js         # Firestore listeners + marker rendering
│   ├── ui.js               # Search, legend, panel interactions
│   └── admin.js            # Auth, CRUD operations, CSV import
│
├── data/
│   ├── sample-stations.csv # Sample CSV for bulk import
│   └── geojson/
│       ├── README.md       # Instructions for sourcing GeoJSON
│       ├── region12.geojson        # (you provide)
│       ├── provinces.geojson       # (you provide)
│       └── municipalities.geojson  # (you provide)
│
└── assets/
    └── cgdsm-seal.png      # CGDSM official seal (you provide)
```

---

## 🚀 Setup Guide

### Step 1 — Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/) → **Create Project**
2. Add a **Web App** → copy the `firebaseConfig` object
3. Enable **Authentication** → Sign-in method → **Email/Password**
4. Create your first admin user: Authentication → Users → Add user
5. Enable **Firestore Database** → Start in **Production mode**
6. Deploy Firestore rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

### Step 2 — Configure Firebase

Open `js/firebase-config.js` and replace the placeholder values:

```javascript
const firebaseConfig = {
  apiKey:            "YOUR_ACTUAL_API_KEY",
  authDomain:        "your-project.firebaseapp.com",
  projectId:         "your-project-id",
  storageBucket:     "your-project.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};
```

### Step 3 — Add GeoJSON Boundaries

See `data/geojson/README.md` for sourcing instructions.

Place files at:
- `data/geojson/region12.geojson`
- `data/geojson/provinces.geojson`
- `data/geojson/municipalities.geojson`

> The app works without these — markers appear but boundary highlighting is skipped.

### Step 4 — Add Station Seal

Place the CGDSM official seal PNG at:
```
assets/cgdsm-seal.png
```

---

## 🗺️ Map Features

| Feature | Behavior |
|---|---|
| Basemap toggle | OSM Street, Esri Satellite, Esri Topo, CartoDB Dark |
| District click | Highlights all of Region 12 |
| Station click | Highlights the station's province + shows info panel |
| Sub-station click | Highlights the sub-station's municipality + shows info panel |
| Color inheritance | Sub-stations automatically match parent station color |
| Active selection | Orange ring highlight on clicked marker |
| Search | Live search by name, province, or municipality |
| Legend | Color-coded station hierarchy |
| Real-time sync | Map updates instantly when Firestore data changes |

---

## 👤 Admin Dashboard

Navigate to `/admin.html` or click **⚙ Admin** in the navbar.

| Feature | Details |
|---|---|
| Auth | Firebase Email/Password — only authorized users can access |
| Add Station | Form with name, province, coordinates, color, status, description |
| Edit Station | Inline form pre-filled with existing data |
| Delete Station | Confirmation dialog → permanent Firestore delete |
| Add Sub-Station | Select parent station; color auto-inherited on map |
| Edit Sub-Station | Full field editing including parent reassignment |
| CSV Import | Bulk import from CSV via PapaParse → Firestore batch write |
| Real-time table | Tables update live via Firestore `onSnapshot` listeners |

---

## 📋 CSV Import Format

```csv
name,type,province,municipality,latitude,longitude,parentStation,color,status,description
CG Station GenSan,station,South Cotabato,,6.1164,125.1716,,#0057a8,operational,"Personnel notes here"
CG Sub-Station Marbel,substation,South Cotabato,Koronadal City,6.502,124.849,CG Station GenSan,,operational,"Sub-station notes"
```

- `type` must be `station` or `substation`
- `parentStation` for substations = the **exact name** of the parent station
- `color` for sub-stations can be left blank (inherited from parent on map render)

---

## ☁️ Deploying to Vercel

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# From the project root
vercel

# For production deployment
vercel --prod
```

Or connect your GitHub repository to [vercel.com](https://vercel.com) for automatic deploys on every push.

---

## 🔒 Security Notes

- **Firestore Rules**: Public read, authenticated write only (see `firestore.rules`)
- **Firebase API Key**: Safe to expose in client-side code — Firebase security is enforced by Firestore Rules, not by keeping the API key secret
- **Admin access**: Controlled entirely by Firebase Authentication — only users you add in the Firebase Console can log in
- **HTTPS**: Vercel enforces HTTPS automatically — required for Firebase Auth to work

---

## 🛠️ Customization

### Adding More Station Colors
Edit the default color palette in `js/firebase-config.js` or set colors per-station via the admin form.

### Extending Station Metadata
Add fields to the admin form in `admin.html` and update the `payload` objects in `js/admin.js`.

### Leaflet Plugins
Additional plugins (clustering, heatmap, measure tool) can be added via CDN in `index.html` and integrated in `js/map.js`.

---

## 📦 Dependencies (all via CDN — no npm required)

| Library | Version | Purpose |
|---|---|---|
| Leaflet.js | 1.9.4 | Map rendering, marker, controls |
| Firebase (compat) | 10.12.0 | Auth + Firestore |
| PapaParse | 5.4.1 | CSV parsing for bulk import |
| Google Fonts | — | Rajdhani + Source Sans 3 |

---

*Built for Coast Guard District Southern Mindanao.*
