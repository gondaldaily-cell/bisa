// Progress + streak, stored locally first, synced to Firestore when available.
// Local storage is the source of truth offline; Firestore (anonymous auth,
// one doc per user) is a best-effort sync so progress survives a new device.
// If Firestore isn't set up yet (no database / offline / not signed in yet)
// the sync fails silently and the app keeps working locally.
import { doc, setDoc, getDoc } from "firebase/firestore";
import { getDb, getCurrentUid } from "./firebase.js";

const KEY = "bisa-progress-v1";

function todayStr(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

// Best-effort write of the local progress to Firestore. Never throws.
export async function syncProgress(p) {
  try {
    const db = getDb();
    const uid = getCurrentUid();
    if (!db || !uid) return false;
    await setDoc(doc(db, "progress", uid), { ...p, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (e) {
    console.warn("Firestore progress sync unavailable (local progress kept):", e?.message || e);
    return false;
  }
}

// Best-effort load: merge remote progress over local by taking the higher
// counts and the latest day, so neither side ever loses progress.
export async function loadRemoteProgress() {
  try {
    const db = getDb();
    const uid = getCurrentUid();
    if (!db || !uid) return null;
    const snap = await getDoc(doc(db, "progress", uid));
    if (!snap.exists()) return null;
    const r = snap.data();
    const local = loadProgress();
    const merged = {
      sessions: Math.max(local.sessions || 0, r.sessions || 0),
      turns: Math.max(local.turns || 0, r.turns || 0),
      streak: Math.max(local.streak || 0, r.streak || 0),
      lastDay: (r.lastDay || "") > (local.lastDay || "") ? r.lastDay : local.lastDay,
    };
    saveProgress(merged);
    return merged;
  } catch (e) {
    console.warn("Firestore progress load unavailable (using local progress):", e?.message || e);
    return null;
  }
}

export function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || { sessions: 0, turns: 0, lastDay: null, streak: 0 };
  } catch {
    return { sessions: 0, turns: 0, lastDay: null, streak: 0 };
  }
}

export function saveProgress(p) {
  localStorage.setItem(KEY, JSON.stringify(p));
  // Fire-and-forget: local save already succeeded; Firestore is a bonus.
  syncProgress(p);
}

export function recordTurn() {
  const p = loadProgress();
  const today = todayStr();
  if (p.lastDay !== today) {
    const yesterday = todayStr(new Date(Date.now() - 86400000));
    p.streak = p.lastDay === yesterday ? p.streak + 1 : 1;
    p.lastDay = today;
    p.sessions += 1;
  }
  p.turns += 1;
  saveProgress(p);
  return p;
}

export function progressText(p) {
  return `Sessions: ${p.sessions} · Current streak: ${p.streak} day(s) · Turns practised: ${p.turns}`;
}
