const URL_PATTERN = /https?:\/\/[^\s<>()\[\]{}"']+/giu;
const EMOJI_PATTERN = /[\p{Extended_Pictographic}\uFE0F]/gu;
const WORD_PATTERN = /\b[\p{L}\p{N}][\p{L}\p{N}'’-]*\b/gu;

const TRACKER_NAMES = new Set([
  "dclid",
  "fbclid",
  "gclid",
  "igshid",
  "mc_cid",
  "mc_eid",
  "msclkid",
  "ref_src",
  "yclid"
]);

const TYPOGRAPHY_REPLACEMENTS = new Map([
  ["“", '"'], ["”", '"'], ["„", '"'],
  ["‘", "'"], ["’", "'"], ["‚", "'"],
  ["–", "-"], ["—", "-"], ["…", "..."]
]);

const SMALL_TITLE_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "in", "nor", "of", "on", "or", "the", "to"
]);

export const DEFAULT_OPTIONS = Object.freeze({
  normalizeWhitespace: true,
  straightenQuotes: true,
  cleanUrls: true,
  normalizeBullets: true,
  stripEmoji: true,
  htmlToMarkdown: true
});

function decodeEntity(entity) {
  const named = {
    "&amp;": "&",
    "&gt;": ">",
    "&lt;": "<",
    "&nbsp;": " ",
    "&quot;": '"',
    "&apos;": "'"
  };

  const known = named[entity.toLowerCase()];
  if (known !== undefined) return known;

  const numeric = entity.match(/^&#(x?[0-9a-f]+);$/i);
  if (!numeric) return entity;

  const hexadecimal = numeric[1][0].toLowerCase() === "x";
  const digits = hexadecimal ? numeric[1].slice(1) : numeric[1];
  const codePoint = Number.parseInt(digits, hexadecimal ? 16 : 10);
  return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
}

function decodeEntities(text) {
  return text.replace(/&(?:amp|gt|lt|nbsp|quot|apos|#\d+|#x[0-9a-f]+);/gi, decodeEntity);
}

function parseTag(token) {
  const match = token.match(/^<\s*(\/?)\s*([a-z][\w-]*)([^>]*)>$/i);
  if (!match) return null;
  return {
    closing: match[1] === "/",
    name: match[2].toLowerCase(),
    attributes: match[3]
  };
}

function readAttribute(attributes, name) {
  const pattern = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const match = attributes.match(pattern);
  return match ? (match[1] ?? match[2] ?? match[3] ?? "") : "";
}

function renderTag(tag, linkStack) {
  if (tag.name === "br") return "\n";
  if (tag.name === "p") return tag.closing ? "\n\n" : "";
  if (tag.name === "li") return tag.closing ? "\n" : "- ";
  if (tag.name === "strong" || tag.name === "b") return "**";
  if (tag.name === "em" || tag.name === "i") return "_";

  if (/^h[1-6]$/.test(tag.name)) {
    return tag.closing ? "\n\n" : `${"#".repeat(Number(tag.name[1]))} `;
  }

  if (tag.name === "a") {
    if (!tag.closing) {
      linkStack.push(readAttribute(tag.attributes, "href"));
      return "[";
    }
    return `](${linkStack.pop() ?? ""})`;
  }

  return "";
}

export function htmlToMarkdown(source) {
  const text = String(source ?? "");
  const links = [];
  let markdown = "";
  let cursor = 0;

  for (const match of text.matchAll(/<[^>]*>/g)) {
    markdown += decodeEntities(text.slice(cursor, match.index));
    const tag = parseTag(match[0]);
    if (tag) markdown += renderTag(tag, links);
    cursor = match.index + match[0].length;
  }

  markdown += decodeEntities(text.slice(cursor));
  return markdown;
}

function splitTrailingPunctuation(candidate) {
  const match = candidate.match(/[.,!?;:]+$/u);
  if (!match) return [candidate, ""];
  return [candidate.slice(0, -match[0].length), match[0]];
}

function isTrackingParameter(name) {
  const normalized = name.toLowerCase();
  return normalized.startsWith("utm_") || TRACKER_NAMES.has(normalized);
}

function cleanSingleUrl(candidate) {
  const [address, punctuation] = splitTrailingPunctuation(candidate);

  try {
    const parsed = new URL(address);
    const retained = [...parsed.searchParams].filter(([name]) => !isTrackingParameter(name));
    parsed.search = "";
    for (const [name, value] of retained) parsed.searchParams.append(name, value);
    return `${parsed.href.replace(/\?$/, "")}${punctuation}`;
  } catch {
    return candidate;
  }
}

export function removeTrackingParameters(source) {
  return String(source ?? "").replace(URL_PATTERN, cleanSingleUrl);
}

function standardizeTypography(source) {
  let result = "";
  for (const character of source) result += TYPOGRAPHY_REPLACEMENTS.get(character) ?? character;
  return result;
}

function standardizeBullets(source) {
  return source
    .split("\n")
    .map(line => line.replace(/^\s*(?:[•●◦▪‣*-])\s+/, "- "))
    .join("\n");
}

function tidySpacing(source) {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const tidyLines = lines.map(line => line
    .replace(/[\t\f\v ]+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim()
  );

  const result = [];
  for (const line of tidyLines) {
    if (line || result.at(-1) !== "") result.push(line);
  }
  return result.join("\n").trim();
}

function removeEmoji(source) {
  return source.replace(EMOJI_PATTERN, "").replace(/ {2,}/g, " ");
}

export function cleanText(input, options = {}) {
  if (typeof input !== "string" || input === "") return "";

  const enabled = { ...DEFAULT_OPTIONS, ...options };
  const stages = [
    ["htmlToMarkdown", htmlToMarkdown],
    ["cleanUrls", removeTrackingParameters],
    ["normalizeBullets", standardizeBullets],
    ["straightenQuotes", standardizeTypography],
    ["stripEmoji", removeEmoji],
    ["normalizeWhitespace", tidySpacing]
  ];

  const result = stages.reduce(
    (text, [option, transform]) => enabled[option] ? transform(text) : text,
    input
  );
  return result.trim();
}

function titleCase(source) {
  let wordIndex = 0;
  return source.replace(WORD_PATTERN, word => {
    const normalized = word.toLocaleLowerCase();
    const keepLowercase = wordIndex > 0 && SMALL_TITLE_WORDS.has(normalized);
    wordIndex += 1;
    return keepLowercase
      ? normalized
      : normalized.charAt(0).toLocaleUpperCase() + normalized.slice(1);
  });
}

function sentenceCase(source) {
  let capitalizeNext = true;
  let result = "";

  for (const character of source.toLocaleLowerCase()) {
    if (capitalizeNext && /\p{L}/u.test(character)) {
      result += character.toLocaleUpperCase();
      capitalizeNext = false;
      continue;
    }
    result += character;
    if (/[.!?\n]/u.test(character)) capitalizeNext = true;
  }
  return result;
}

export function changeCase(value, mode) {
  const text = String(value ?? "");
  switch (mode) {
    case "upper": return text.toLocaleUpperCase();
    case "lower": return text.toLocaleLowerCase();
    case "title": return titleCase(text);
    case "sentence": return sentenceCase(text);
    default: return text;
  }
}

export function getStats(value) {
  const text = String(value ?? "");
  const content = text.trim();
  return {
    words: content === "" ? 0 : content.split(/\s+/u).length,
    characters: text.length,
    links: [...text.matchAll(/https?:\/\/\S+/giu)].length
  };
}
