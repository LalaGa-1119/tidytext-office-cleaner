import { DEFAULT_OPTIONS, changeCase, cleanText, getStats } from "./cleaner.js";

const byId = id => document.getElementById(id);
const all = selector => [...document.querySelectorAll(selector)];

const elements = {
  input: byId("inputText"),
  output: byId("outputText"),
  inputStats: byId("inputStats"),
  outputStats: byId("outputStats"),
  savedStats: byId("savedStats"),
  resultStatus: byId("resultStatus"),
  toast: byId("toast"),
  optionsPanel: byId("optionsPanel"),
  optionsTrigger: byId("optionsTrigger")
};

const EXAMPLE_TEXT = `<h2>Weekly project update ✨</h2>
<p>We   finished the first prototype and shared it with the team.</p>

• Review the feedback
• Confirm next week's priorities
• Send the final   summary

Read more: https://example.com/project?utm_source=newsletter&utm_campaign=weekly&fbclid=abc123

“Keep the report short,” the manager said.`;

const PRESETS = Object.freeze({
  balanced: { ...DEFAULT_OPTIONS },
  web: { ...DEFAULT_OPTIONS, stripEmoji: false },
  notes: { ...DEFAULT_OPTIONS, htmlToMarkdown: false, cleanUrls: false },
  links: { ...DEFAULT_OPTIONS, normalizeBullets: false, stripEmoji: false, htmlToMarkdown: false }
});

let toastTimer;

function selectedOptions() {
  return Object.fromEntries(all("[data-option]").map(control => [control.dataset.option, control.checked]));
}

function describeStats(text, includeLinks = false) {
  const stats = getStats(text);
  const parts = [`${stats.words} words`, `${stats.characters} characters`];
  if (includeLinks) parts.push(`${stats.links} links`);
  return parts.join(" · ");
}

function refreshStats() {
  elements.inputStats.textContent = describeStats(elements.input.value);
  elements.outputStats.textContent = describeStats(elements.output.value, true);

  const removed = Math.max(0, elements.input.value.length - elements.output.value.length);
  elements.savedStats.textContent = `${removed} character${removed === 1 ? "" : "s"} removed`;
}

function setResultState(cleaned) {
  elements.resultStatus.textContent = cleaned ? "Cleaned" : "Ready";
  elements.resultStatus.classList.toggle("done", cleaned);
}

function notify(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("show"), 1800);
}

function clean({ announce = false } = {}) {
  elements.output.value = cleanText(elements.input.value, selectedOptions());
  setResultState(elements.input.value.length > 0);
  refreshStats();
  if (announce) notify("Text cleaned locally");
}

function syncOptionCount() {
  const enabledCount = all("[data-option]").filter(control => control.checked).length;
  const badge = elements.optionsTrigger.querySelector("span");
  badge.textContent = `${enabledCount} on`;
}

function activatePreset(name) {
  const settings = PRESETS[name];
  if (!settings) return;

  for (const control of all("[data-option]")) {
    control.checked = Boolean(settings[control.dataset.option]);
  }
  for (const button of all("[data-preset]")) {
    button.classList.toggle("active", button.dataset.preset === name);
  }
  syncOptionCount();
  clean();
}

async function copyResult() {
  if (elements.output.value === "") return notify("Nothing to copy yet");
  try {
    await navigator.clipboard.writeText(elements.output.value);
    notify("Copied to clipboard");
  } catch {
    notify("Clipboard access was blocked");
  }
}

function downloadResult() {
  if (elements.output.value === "") return notify("Nothing to download yet");

  const blobUrl = URL.createObjectURL(new Blob([elements.output.value], { type: "text/plain;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = "tidytext-result.txt";
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
  notify("Text file downloaded");
}

byId("cleanButton").addEventListener("click", () => clean({ announce: true }));
byId("copyButton").addEventListener("click", copyResult);
byId("downloadButton").addEventListener("click", downloadResult);

byId("sampleButton").addEventListener("click", () => {
  elements.input.value = EXAMPLE_TEXT;
  clean();
  elements.input.focus();
});

byId("clearButton").addEventListener("click", () => {
  elements.input.value = "";
  elements.output.value = "";
  setResultState(false);
  refreshStats();
  elements.input.focus();
});

elements.input.addEventListener("input", () => {
  elements.resultStatus.textContent = "Not cleaned";
  elements.resultStatus.classList.remove("done");
  refreshStats();
});

elements.optionsTrigger.addEventListener("click", () => {
  const willOpen = elements.optionsPanel.hidden;
  elements.optionsPanel.hidden = !willOpen;
  elements.optionsTrigger.setAttribute("aria-expanded", String(willOpen));
});

for (const control of all("[data-option]")) {
  control.addEventListener("change", () => {
    syncOptionCount();
    clean();
  });
}

for (const button of all("[data-preset]")) {
  button.addEventListener("click", () => activatePreset(button.dataset.preset));
}

for (const button of all("[data-case]")) {
  button.addEventListener("click", () => {
    if (elements.output.value === "") return notify("Clean some text first");
    elements.output.value = changeCase(elements.output.value, button.dataset.case);
    refreshStats();
    notify(`${button.textContent} case applied`);
  });
}

document.addEventListener("keydown", event => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    clean({ announce: true });
  }
});

syncOptionCount();
refreshStats();
