// Firebase setup. Replace the placeholder config with the real web-app config
// from the Firebase console (Project settings > Your apps) before deploying.
// The app runs WITHOUT a real config in "demo mode": practice falls back to
// a built-in tutor (see ai.js) so the UI can be tested end to end first.
// No secrets are committed here: this is a public web config, and App Check
// (debug token locally, reCAPTCHA Enterprise / Fraud Defense in production)
// protects the API.
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getRemoteConfig, fetchAndActivate, getString } from "firebase/remote-config";

export const firebaseConfig = {
  apiKey: "AIzaSyC22eKEK5szLEXd-1uF2daTPZyyM7vvCGA",
  authDomain: "bisa-b9a46.firebaseapp.com",
  projectId: "bisa-b9a46",
  storageBucket: "bisa-b9a46.firebasestorage.app",
  messagingSenderId: "685304781541",
  appId: "1:685304781541:web:aabf381503a824d5e0920c",
};

// NOTE: deliberately a function, not a const boolean. A const would let the
// bundler prove "not configured" at build time and dead-code-eliminate the
// whole real AI path from the production bundle while the placeholder config
// is in place. As a function call it stays dynamic, so the real path is
// always bundled and only chosen at runtime.
export function isConfigured() {
  return firebaseConfig.apiKey !== "YOUR_API_KEY";
}

let app = null;
let db = null;

export function initFirebase() {
  if (!isConfigured()) return null;
  app = initializeApp(firebaseConfig);
  if (import.meta.env.DEV) {
    // Local development only: use an App Check debug token instead of the
    // Enterprise attestation. The debug token printed in the console must be
    // registered in the Firebase console:
    // Security > App Check > Apps > Manage debug tokens.
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  // App Check runs in ALL environments (production included). Provider is
  // reCAPTCHA Enterprise ("Fraud Defense"), registered in the Firebase
  // console for the "Bisa Web" app (App ID 1:685304781541:web:aabf381503a824d5e0920c).
  // NOTE: reCAPTCHA v3 (Classic) can no longer be registered — Google
  // deprecated new Classic keys in Q3 2024. The site key below is the public
  // Enterprise site key (safe to ship in client code); the secret key lives
  // only in the Firebase console. Free tier: 10,000 assessments/month.
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider("6LelFi0uAAAAAGLZdNU3oTJfHjtR8tPwVILyfO6s"),
    isTokenAutoRefreshEnabled: true,
  });
  db = getFirestore(app);
  // Flush any progress recorded before sign-in finished: syncProgress()
  // silently skips when there's no UID yet, so without this the first
  // turns of a session would never reach Firestore.
  signInAnonymously(getAuth(app))
    .then(() => import("./store.js").then((s) => s.syncProgress(s.loadProgress())))
    .catch((e) => console.warn("Anonymous sign-in failed:", e));
  return app;
}

export function getDb() {
  return db;
}

export function getCurrentUid() {
  try {
    return getAuth(app)?.currentUser?.uid || null;
  } catch {
    return null;
  }
}

// Remote Config: routing policy + difficulty, so the tutor's behaviour can be
// tuned without shipping a new build. Falls back to defaults when offline
// or unconfigured.
export async function getRoutingPolicy() {
  const defaults = { practice_mode: "prefer_on_device", difficulty: "beginner" };
  if (!app) return defaults;
  try {
    const rc = getRemoteConfig(app);
    rc.defaultConfig = defaults;
    await fetchAndActivate(rc);
    return { practice_mode: getString(rc, "practice_mode") || defaults.practice_mode, difficulty: getString(rc, "difficulty") || defaults.difficulty };
  } catch (e) {
    console.warn("Remote Config unavailable, using defaults:", e);
    return defaults;
  }
}
