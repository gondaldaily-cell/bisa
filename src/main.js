import { LESSONS } from "./lessons.js";
import { initFirebase, getRoutingPolicy } from "./firebase.js";
import { initModels, prepareOnDeviceModel, onDeviceAvailable, practiceTurn, deepAnalysis, setRoutingPolicy } from "./ai.js";
import { loadProgress, recordTurn, progressText, loadRemoteProgress } from "./store.js";

const chatEl = document.getElementById("chat");
const inputEl = document.getElementById("chat-input");
const formEl = document.getElementById("chat-form");
const deviceBadge = document.getElementById("device-badge");
const netBadge = document.getElementById("net-badge");
const progressEl = document.getElementById("progress");
const analysisEl = document.getElementById("analysis");

let lesson = LESSONS[0];
let transcript = []; // { role: "user" | "tutor", text, route? }

function renderProgress() {
  progressEl.textContent = progressText(loadProgress());
}

function addMsg(role, text, route) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.innerHTML = `<span class="who">${role === "user" ? "You" : "Bisa (tutor)"}</span>`;
  div.appendChild(document.createTextNode(text));
  if (route) {
    const r = document.createElement("span");
    r.className = "route";
    r.textContent = ` — via ${route}`;
    div.appendChild(r);
  }
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function startLesson(l) {
  lesson = l;
  transcript = [{ role: "tutor", text: l.opener }];
  chatEl.innerHTML = "";
  analysisEl.hidden = true;
  addMsg("tutor", l.opener);
  document.querySelectorAll("#lessons button").forEach((b) => b.classList.toggle("active", b.dataset.id === l.id));
}

function renderLessons() {
  const wrap = document.getElementById("lessons");
  LESSONS.forEach((l) => {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.id = l.id;
    b.textContent = l.title;
    b.onclick = () => startLesson(l);
    wrap.appendChild(b);
  });
}

async function refreshStatus() {
  const avail = await onDeviceAvailable();
  deviceBadge.textContent =
    avail === "available"
      ? "On-device model: available ✓"
      : avail === "downloading"
        ? "On-device model: downloading…"
        : avail === "downloadable"
          ? "On-device model: ready to download"
          : "On-device model: not available here (cloud fallback)";
  deviceBadge.className = `badge ${avail === "available" ? "ok" : avail === "unknown" ? "warn" : "warn"}`;
  const online = navigator.onLine;
  netBadge.textContent = online ? "Online" : "Offline — on-device only";
  netBadge.className = `badge ${online ? "ok" : "warn"}`;
}

document.getElementById("prepare-btn").addEventListener("click", async (e) => {
  const note = document.getElementById("prepare-note");
  e.target.disabled = true;
  note.textContent = "Preparing on-device model… (first time downloads Gemini Nano, a few hundred MB)";
  const res = await prepareOnDeviceModel((pct) => {
    note.textContent = `Downloading on-device model: ${pct}%`;
  });
  note.textContent = res.ok
    ? "On-device model ready ✓ — practice will prefer Nano and fall back to cloud when needed."
    : `On-device model not ready (${res.reason}) — practice will use the cloud model. Try the Chrome flag in step 1, then click again.`;
  e.target.disabled = false;
  refreshStatus();
});

formEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = inputEl.value.trim();
  if (!text) return;
  inputEl.value = "";
  transcript.push({ role: "user", text });
  addMsg("user", text);
  recordTurn();
  renderProgress();
  addMsg("tutor", "Thinking…");
  try {
    const { text: reply, route } = await practiceTurn({ lesson, transcript });
    chatEl.lastChild.remove();
    transcript.push({ role: "tutor", text: reply });
    addMsg("tutor", reply, route);
  } catch (err) {
    chatEl.lastChild.remove();
    addMsg("tutor", `Sorry, that turn failed (${err?.message || err}). Check your connection, then try again — your progress is saved.`);
  }
});

document.getElementById("analyse-btn").addEventListener("click", async () => {
  analysisEl.hidden = false;
  analysisEl.textContent = "Analysing in the cloud…";
  try {
    const { text, route } = await deepAnalysis({ lesson, transcript });
    analysisEl.textContent = `${text}\n\n(via ${route})`;
  } catch (err) {
    analysisEl.textContent = `Analysis failed (${err?.message || err}). Try again when online.`;
  }
});

document.getElementById("reset-btn").addEventListener("click", () => startLesson(lesson));

window.addEventListener("online", refreshStatus);
window.addEventListener("offline", refreshStatus);

// Boot
renderLessons();
startLesson(LESSONS[0]);
renderProgress();
refreshStatus();
const app = initFirebase();
initModels(app);
getRoutingPolicy().then((p) => {
  setRoutingPolicy(p);
  console.log("Routing policy:", p);
});
// Pull any progress saved from another device. Anonymous sign-in is async,
// so retry once after a few seconds in case the UID wasn't ready at boot.
loadRemoteProgress().then((p) => { if (p) renderProgress(); });
setTimeout(() => loadRemoteProgress().then((p) => { if (p) renderProgress(); }), 3000);
