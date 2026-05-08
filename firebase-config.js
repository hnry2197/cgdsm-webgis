// ═══════════════════════════════════════════════════════════════
//  js/firebase-config.js
//  Firebase initialization — Auth + Firestore
//  Project: CGDSM AOR  |  cgdsmaor.firebaseapp.com
// ═══════════════════════════════════════════════════════════════

const firebaseConfig = {
  apiKey:            "AIzaSyDdqfRoWFxOXA6opJgAPpf7ZMUBVN9al84",
  authDomain:        "cgdsmaor.firebaseapp.com",
  projectId:         "cgdsmaor",
  storageBucket:     "cgdsmaor.firebasestorage.app",
  messagingSenderId: "831701994339",
  appId:             "1:831701994339:web:15d5fd9dc1e967e28be156",
  measurementId:     "G-Q79E9P48SB"
};

// Initialize Firebase app (compat SDK, globally available)
firebase.initializeApp(firebaseConfig);

// Convenient references used across all modules
const auth = firebase.auth();
const db   = firebase.firestore();

// ── Firestore collection references ──────────────────────────
const stationsCol    = db.collection("stations");
const substationsCol = db.collection("substations");