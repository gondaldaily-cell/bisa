// Hybrid inference through Firebase AI Logic.
// Verified against https://firebase.google.com/docs/ai-logic/hybrid/web/get-started
// (checked live 21 Nov 2026):
// - SDK: firebase/ai, v12.5.0+; Chrome on desktop v139+; flag
//   chrome://flags/#prompt-api-for-gemini-nano-multimodal-input
// - getAI(app, { backend: new GoogleAIBackend() })
// - getGenerativeModel(ai, { mode: InferenceMode.PREFER_ON_DEVICE })
// - initializeDeviceModel() must be called after a user interaction and
//   BEFORE any generateContent() call.
// - On-device inference supports SINGLE-TURN text generation only (no chat).
//   So every practice turn sends the whole transcript as one prompt.
// - inCloudParams.model overrides the cloud fallback model.
// - Route detection (verified live 21 Nov 2026, Firebase docs "Configuration
//   options for hybrid experiences", updated 2026-11-18): the response carries
//   `response.inferenceSource`, either "ON_DEVICE" or "IN_CLOUD" (JS SDK
//   v12.5.0+). The UI shows that confirmed value, e.g. "on-device (confirmed)".
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode } from "firebase/ai";
import { isConfigured } from "./firebase.js";

const CLOUD_MODEL = "gemini-3.5-flash-lite";

let practiceModel = null; // PREFER_ON_DEVICE: Nano when available, else cloud
let cloudModel = null; // PREFER_IN_CLOUD: deep analysis

// Routing policy from Remote Config (defaults until the fetch resolves).
// main.js calls setRoutingPolicy() once the fetch completes.
let routingPolicy = { practice_mode: "prefer_on_device", difficulty: "beginner" };
export function setRoutingPolicy(p) {
  if (!p) return;
  routingPolicy = {
    practice_mode: p.practice_mode || routingPolicy.practice_mode,
    difficulty: p.difficulty || routingPolicy.difficulty,
  };
}

export function initModels(app) {
  if (!app || !isConfigured()) return false;
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  practiceModel = getGenerativeModel(ai, {
    mode: InferenceMode.PREFER_ON_DEVICE,
    inCloudParams: { model: CLOUD_MODEL },
  });
  cloudModel = getGenerativeModel(ai, {
    mode: InferenceMode.PREFER_IN_CLOUD,
    inCloudParams: { model: CLOUD_MODEL },
  });
  return true;
}

// Must be called from a click handler, before the first practice turn.
export async function prepareOnDeviceModel(onProgress) {
  if (!practiceModel) return { ok: false, reason: "not-configured" };
  try {
    await practiceModel.initializeDeviceModel((val) => onProgress?.(Math.round(val * 10000) / 100));
    return { ok: true };
  } catch (e) {
    console.warn("initializeDeviceModel failed (will fall back to cloud):", e);
    return { ok: false, reason: String(e?.message || e) };
  }
}

export function onDeviceAvailable() {
  // Chrome Prompt API availability probe; returns "available" | "downloading"
  // | "downloadable" | "unavailable" | "unknown" (non-Chrome / no API).
  const LM = globalThis.LanguageModel;
  if (!LM?.availability) return Promise.resolve("unknown");
  return LM.availability().catch(() => "unknown");
}

function buildPracticePrompt({ lesson, transcript }) {
  const history = transcript.map((t) => `${t.role === "user" ? "Learner" : "Tutor"}: ${t.text}`).join("\n");
  const level =
    routingPolicy.difficulty === "advanced"
      ? "intermediate to advanced level"
      : routingPolicy.difficulty === "intermediate"
        ? "intermediate level"
        : "beginner level";
  return [
    `You are Bisa, a friendly English speaking tutor for an Indonesian learner (${level}).`,
    `Scenario: ${lesson.title} — ${lesson.goal}`,
    "Reply in simple English (short sentences, everyday words).",
    "Keep the conversation going with one follow-up question.",
    "If the learner makes a small grammar mistake, correct it gently in one short sentence, then continue.",
    "Never switch to Indonesian. Never write more than 4 sentences.",
    "",
    "Conversation so far:",
    history,
    "",
    "Reply as the Tutor now.",
  ].join("\n");
}

// One practice turn. Returns { text, route } where route is the CONFIRMED
// inference source from response.inferenceSource ("ON_DEVICE" / "IN_CLOUD").
export async function practiceTurn({ lesson, transcript }) {
  const prompt = buildPracticePrompt({ lesson, transcript });
  if (!practiceModel) return demoTurn(transcript);
  const result = await practiceModel.generateContent(prompt);
  const text = result.response.text();
  const source = result.response.inferenceSource;
  const route = source === "ON_DEVICE" ? "on-device (confirmed)" : source === "IN_CLOUD" ? "cloud (confirmed fallback)" : "unknown route";
  return { text, route };
}

// Deep grammar analysis: always cloud, because it needs long context.
export async function deepAnalysis({ lesson, transcript }) {
  const history = transcript.map((t) => `${t.role === "user" ? "Learner" : "Tutor"}: ${t.text}`).join("\n");
  const prompt = [
    "You are Bisa, an English teacher. Analyse this learner's English from the conversation below.",
    `Scenario: ${lesson.title}.`,
    "Give: (1) 3 strengths, (2) the 3 most important mistakes with a corrected version of each sentence,",
    "(3) one small homework exercise for tomorrow. Keep it under 200 words, simple English.",
    "",
    history,
  ].join("\n");
  if (!cloudModel) return { text: demoAnalysis(transcript), route: "demo (no Firebase config yet)" };
  const result = await cloudModel.generateContent(prompt);
  const source = result.response.inferenceSource;
  return { text: result.response.text(), route: source === "IN_CLOUD" ? "in-cloud (confirmed)" : `in-cloud (requested, source: ${source || "unknown"})` };
}

// Demo fallback so the UI, lessons and progress work with no Firebase
// project yet. Clearly labelled "demo" in the UI — never presented as AI.
function demoTurn(transcript) {
  const last = transcript[transcript.length - 1]?.text || "";
  const text = `Nice! You said: "${last}". Good job — can you tell me more in one more sentence? (Demo reply: connect Firebase to get the real tutor.)`;
  return { text, route: "demo (no Firebase config yet)" };
}

function demoAnalysis(transcript) {
  const turns = transcript.filter((t) => t.role === "user").length;
  return `Demo analysis (connect Firebase for the real one): you spoke for ${turns} turn(s). Strengths: you kept going, you used full sentences, you stayed in English. Try next: add one adjective to every sentence you say.`;
}
