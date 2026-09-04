import test from "node:test";
import assert from "node:assert/strict";
import {
  changeCase,
  cleanText,
  getStats,
  htmlToMarkdown,
  removeTrackingParameters
} from "../src/cleaner.js";

test("removes tracker parameters and retains application parameters", () => {
  const source = "Read https://example.com/report?id=42&utm_source=email&fbclid=abc.";
  assert.equal(removeTrackingParameters(source), "Read https://example.com/report?id=42.");
});

test("handles parameter names without case sensitivity", () => {
  assert.equal(
    removeTrackingParameters("https://example.com/?UTM_Source=mail&Item=7"),
    "https://example.com/?Item=7"
  );
});

test("leaves invalid non-URL text untouched", () => {
  assert.equal(removeTrackingParameters("See example.com/?utm_source=x"), "See example.com/?utm_source=x");
});

test("converts supported HTML elements and entities to Markdown", () => {
  assert.equal(
    htmlToMarkdown('<h2>Notes &amp; tasks</h2><p>This is <strong>important</strong>. <a href="/more">Read</a></p>'),
    "## Notes & tasks\n\nThis is **important**. [Read](/more)\n\n"
  );
});

test("cleans office text while preserving paragraph boundaries", () => {
  const source = `“Weekly   update” ✨\n\n\n• First item\n• Second item`;
  assert.equal(cleanText(source), `"Weekly update"\n\n- First item\n- Second item`);
});

test("allows individual cleaning stages to be disabled", () => {
  const source = "“Hello”   ✨";
  assert.equal(cleanText(source, {
    straightenQuotes: false,
    stripEmoji: false,
    htmlToMarkdown: false
  }), "“Hello” ✨");
});

test("supports title, sentence, upper, and lower case", () => {
  assert.equal(changeCase("a guide to better notes", "title"), "A Guide to Better Notes");
  assert.equal(changeCase("HELLO. SECOND LINE!", "sentence"), "Hello. Second line!");
  assert.equal(changeCase("Mixed", "upper"), "MIXED");
  assert.equal(changeCase("Mixed", "lower"), "mixed");
});

test("reports word, character, and link totals", () => {
  assert.deepEqual(getStats("One link https://example.com"), {
    words: 3,
    characters: 28,
    links: 1
  });
  assert.deepEqual(getStats(""), { words: 0, characters: 0, links: 0 });
});
