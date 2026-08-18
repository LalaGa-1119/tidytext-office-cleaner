import { DEFAULT_OPTIONS, changeCase, cleanText, getStats } from "./cleaner.js";

const input = document.querySelector("#inputText");
const output = document.querySelector("#outputText");
const inputStats = document.querySelector("#inputStats");
const outputStats = document.querySelector("#outputStats");
const savedStats = document.querySelector("#savedStats");
const status = document.querySelector("#resultStatus");
const toast = document.querySelector("#toast");

const PRESETS = {
  balanced: { ...DEFAULT_OPTIONS },
  web: { ...DEFAULT_OPTIONS, stripEmoji: false },
  notes: { ...DEFAULT_OPTIONS, htmlToMarkdown: false, cleanUrls: false },
  links: { ...DEFAULT_OPTIONS, normalizeBullets: false, stripEmoji: false, htmlToMarkdown: false }
};

const SAMPLE = `<h2>Weekly project update ✨</h2>
<p>We   finished the first prototype and shared it with the team.</p>

• Review the feedback
• Confirm next week's priorities
• Send the final   summary

Read more: https://example.com/project?utm_source=newsletter&utm_campaign=weekly&fbclid=abc123

“Keep the report short,” the manager said.`;

function currentOptions() {
  return [...document.querySelectorAll("[data-option]")].reduce((result, checkbox) => {
    result[checkbox.dataset.option] = checkbox.checked;
    return result;
  }, {});
}

function updateOptionCount() {
  const count = [...document.querySelectorAll("[data-option]")].filter(item => item.checked).length;
  document.querySelector("#optionsTrigger span").textContent = `${count} on`;
}

function updateStats() {
  const original = getStats(input.value);
  const cleaned = getStats(output.value);
  inputStats.textContent = `${original.words} words · ${original.characters} characters`;
  outputStats.textContent = `${cleaned.words} words · ${cleaned.characters} characters · ${cleaned.links} links`;
  const removed = Math.max(0, original.characters - cleaned.characters);
  savedStats.textContent = `${removed} character${removed === 1 ? "" : "s"} removed`;
}

function runCleaner(showFeedback = false) {
  output.value = cleanText(input.value, currentOptions());
  status.textContent = input.value ? "Cleaned" : "Ready";
  status.classList.toggle("done", Boolean(input.value));
  updateStats();
  if (showFeedback) showToast("Text cleaned locally");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 1800);
}

document.querySelector("#cleanButton").addEventListener("click", () => runCleaner(true));
document.querySelector("#sampleButton").addEventListener("click", () => { input.value = SAMPLE; runCleaner(); input.focus(); });
document.querySelector("#clearButton").addEventListener("click", () => { input.value = ""; output.value = ""; runCleaner(); input.focus(); });
input.addEventListener("input", () => { status.textContent = "Not cleaned"; status.classList.remove("done"); updateStats(); });

document.querySelector("#copyButton").addEventListener("click", async () => {
  if (!output.value) return showToast("Nothing to copy yet");
  await navigator.clipboard.writeText(output.value);
  showToast("Copied to clipboard");
});

document.querySelector("#downloadButton").addEventListener("click", () => {
  if (!output.value) return showToast("Nothing to download yet");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([output.value], { type: "text/plain;charset=utf-8" }));
  link.download = "tidytext-result.txt";
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("Text file downloaded");
});

document.querySelector("#optionsTrigger").addEventListener("click", event => {
  const panel = document.querySelector("#optionsPanel");
  panel.hidden = !panel.hidden;
  event.currentTarget.setAttribute("aria-expanded", String(!panel.hidden));
});

document.querySelectorAll("[data-option]").forEach(item => item.addEventListener("change", () => { updateOptionCount(); runCleaner(); }));
document.querySelectorAll("[data-preset]").forEach(button => button.addEventListener("click", () => {
  const preset = PRESETS[button.dataset.preset];
  document.querySelectorAll("[data-option]").forEach(item => { item.checked = preset[item.dataset.option]; });
  document.querySelectorAll("[data-preset]").forEach(item => item.classList.toggle("active", item === button));
  updateOptionCount(); runCleaner();
}));

document.querySelectorAll("[data-case]").forEach(button => button.addEventListener("click", () => {
  if (!output.value) return showToast("Clean some text first");
  output.value = changeCase(output.value, button.dataset.case);
  updateStats(); showToast(`${button.textContent} case applied`);
}));

document.addEventListener("keydown", event => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); runCleaner(true); }
});

updateStats();
