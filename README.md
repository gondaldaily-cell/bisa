# Bisa — Offline-First English Speaking Tutor

**Firebase #BuildHybridAI Hackathon 2026** · Web (Chrome) · Target submit: **27 Nov 2026**
· Deadline: **1 Dec 2026, 05:00 WIB** · Pool: **$30,000** (Grand $10,000, Best Web/Chrome $3,000)

Bisa helps Indonesian learners practise speaking English. The hybrid part is
real, not decoration:

- **Instant practice — on-device (Gemini Nano via Firebase AI Logic).**
  Short conversation turns run on the device: private, free, no latency, and
  they keep working offline. The UI shows the confirmed route for every reply.
- **Deep analysis — in-cloud (Gemini Flash via Firebase AI Logic).**
  Grammar breakdowns and a personal study plan need long context, so they run
  in the cloud, only when the learner asks for them.
- **Visible routing + automatic fallback.** Every tutor reply is labelled
  `on-device (confirmed)` or `cloud (confirmed fallback)`, from
  `response.inferenceSource`. If Nano is unavailable, practice falls back to
  the cloud automatically.

## Why this wins (judging criteria)

| Criterion | How Bisa answers it |
|---|---|
| Technical Implementation | Hybrid inference via Firebase AI Logic (`PREFER_ON_DEVICE` + `PREFER_IN_CLOUD`), App Check, Anonymous Auth, Firestore-ready progress, Remote Config routing policy |
| Design | One screen, three everyday scenarios, visible on-device/cloud badge |
| Potential Impact | Millions of Indonesian learners, patchy connections, expensive private lessons |
| Quality of the Idea | Hybrid routing matches the task: latency/privacy/offline vs depth |

## Key API facts (verified live 21 Nov 2026)

From the Firebase AI Logic hybrid docs
(`firebase.google.com/docs/ai-logic/hybrid/web/get-started` and the
“Configuration options” page, updated 2026-11-18):

- SDK `firebase/ai`, **v12.5.0+**; Chrome on desktop **v139+**; flag
  `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`.
- `getAI(app, { backend: new GoogleAIBackend() })`, then
  `getGenerativeModel(ai, { mode: InferenceMode.PREFER_ON_DEVICE, inCloudParams: { model: "gemini-2.5-flash" } })`.
- `initializeDeviceModel()` must be called **after a user click** and
  **before** any `generateContent()` call.
- **On-device inference is single-turn text generation only — no chat.**
  Bisa therefore sends the whole transcript as one prompt per turn, instead
  of using a chat session. (Multi-turn chat falls back to cloud.)
- Confirmed route: `result.response.inferenceSource` is `ON_DEVICE` or
  `IN_CLOUD` (SDK v12.5.0+).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

Both setup steps are done: the Firebase project exists with its web config
installed in `src/firebase.js`, and Devpost is registered (kimmy-agent-1).
Firestore database was created 22 Nov 2026 (Native mode, asia-southeast1),
and App Check was fixed the same evening (reCAPTCHA Enterprise, "Bisa Web"
Registered in the console, `ReCaptchaEnterpriseProvider` in `src/firebase.js`).
One thing is still open before the real tutor can be tested end to end:

1. **End-to-end test:** run a practice turn in Chrome and confirm the
   on-device route and the cloud fallback route (both labelled from
   `response.inferenceSource`), plus one progress write landing in Firestore.

With the real config installed, the app runs in **real mode**: tutor replies
use Firebase AI Logic hybrid inference, labelled with the confirmed
`inferenceSource`. Demo mode (built-in tutor replies) only applies if the
config is ever removed.

## Demo mode vs real mode

- No Firebase config → demo tutor replies, labelled `demo (no Firebase config yet)`.
- Firebase config present → real hybrid inference, replies labelled with the
  confirmed `inferenceSource`. Never present a demo reply as AI output in the
  submission video.

## Cost: $0

Spark free tier only. No billing upgrade, no quota request, no paid API.
Text inference via Firebase AI Logic is free within the limit.

## Build note: real config installed

The real Firebase web config is installed in `src/firebase.js` (21 Nov 2026),
so the production build contains the full hybrid AI path (verified 22 Nov
2026: 809 kB bundle, `recaptcha/enterprise.js` + Enterprise site key present).
Rebuild with `npm run build` after any change to `src/`.

## Project status (23 Nov 2026, submit-readiness day)

- [x] Concept + plan (`PLAN.md` in the goal workspace)
- [x] Scaffold: UI, 3 lessons, hybrid AI layer, progress/streak, README
- [x] Build verified: `npm run build` succeeds (Vite 6.4.6, firebase 12.19.0)
- [x] Firebase project + web config in `src/firebase.js` (project bisa-b9a46, Spark free, installed 21 Nov 2026 18:46 WIB; production build passes with the real config, 809 kB bundle)
- [x] Devpost registration (account kimmy-agent-1, registered solo 21 Nov 2026 ~14:15 WIB)
- [x] Firestore database created (22 Nov 2026 13:21 WIB, Native mode, asia-southeast1, production rules, Spark $0)
- [x] Firestore progress sync (22 Nov 2026: `src/store.js` now writes progress to `progress/{anonymousUid}` with merge + loads/merges it on boot; localStorage stays the offline source of truth, sync never throws)
- [x] App Check fixed (22 Nov 2026 21:21 WIB: reCAPTCHA Enterprise / Fraud Defense, "Bisa Web" Registered, `initializeAppCheck` runs in all environments; free tier 10,000 assessments/month, no billing)
- [x] Public repo + Apache-2.0 license + Firebase Hosting config (23 Nov 2026)
- [ ] End-to-end test: Nano route + cloud fallback route (record both for the video) + one Firestore progress write
- [ ] Deploy to Firebase Hosting (https://bisa-b9a46.web.app) — needs Firebase login
- [ ] Demo video ≤ 3 min (English / English subtitles) + submission text
- [ ] Submit by 27 Nov 2026 (before Agentware kickoff 28 Nov 01:00 WIB)

## Files

- `index.html` — single-page UI
- `src/main.js` — UI wiring, lessons, progress
- `src/ai.js` — Firebase AI Logic hybrid inference (practice + deep analysis)
- `src/firebase.js` — Firebase init, App Check, Anonymous Auth, Remote Config
- `src/lessons.js` — 3 practice scenarios
- `src/store.js` — progress + streak (localStorage first, Firestore sync)
