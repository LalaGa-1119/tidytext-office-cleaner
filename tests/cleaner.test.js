import test from "node:test";
import assert from "node:assert/strict";
import { changeCase, cleanText, getStats, removeTrackingParameters } from "../src/cleaner.js";

test("removes known tracking parameters but keeps useful query values", () => {
  assert.equal(
    removeTrackingParameters("Read https://example.com/report?id=42&utm_source=email&fbclid=abc."),
    "Read https://example.com/report?id=42."
  );
});

test("cleans office text while preserving paragraphs", () => {
  const input = `“Weekly   update” ✨\n\n\n• First item\n• Second item`;
  assert.equal(cleanText(input), `"Weekly update"\n\n- First item\n- Second item`);
});

test("converts basic HTML to Markdown", () => {
  assert.equal(cleanText("<h2>Notes</h2><p>This is <strong>important</strong>.</p>"), "## Notes\n\nThis is **important**.");
});

test("supports office-friendly case conversions", () => {
  assert.equal(changeCase("a guide to better notes", "title"), "A Guide to Better Notes");
  assert.equal(changeCase("HELLO. SECOND LINE!", "sentence"), "Hello. Second line!");
});

test("returns useful live statistics", () => {
  assert.deepEqual(getStats("One link https://example.com"), { words: 3, characters: 28, links: 1 });
});
