const TRACKING_PARAMS = new Set([
  "fbclid", "gclid", "dclid", "msclkid", "yclid", "mc_cid", "mc_eid", "igshid", "ref_src"
]);

export const DEFAULT_OPTIONS = Object.freeze({
  normalizeWhitespace: true,
  straightenQuotes: true,
  cleanUrls: true,
  normalizeBullets: true,
  stripEmoji: true,
  htmlToMarkdown: true
});

function decodeBasicEntities(value) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

export function htmlToMarkdown(value) {
  return decodeBasicEntities(value)
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, text) => `${"#".repeat(Number(level))} ${text.trim()}\n\n`)
    .replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**")
    .replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, "_$2_")
    .replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n")
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "$1\n\n")
    .replace(/<[^>]+>/g, "");
}

export function removeTrackingParameters(value) {
  return value.replace(/https?:\/\/[^\s<>()\[\]{}"']+/gi, rawUrl => {
    const trailing = rawUrl.match(/[.,!?;:]+$/)?.[0] ?? "";
    const urlText = trailing ? rawUrl.slice(0, -trailing.length) : rawUrl;
    try {
      const url = new URL(urlText);
      [...url.searchParams.keys()].forEach(key => {
        if (key.toLowerCase().startsWith("utm_") || TRACKING_PARAMS.has(key.toLowerCase())) url.searchParams.delete(key);
      });
      return `${url.toString().replace(/\?$/, "")}${trailing}`;
    } catch {
      return rawUrl;
    }
  });
}

function normalizeWhitespace(value) {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\t\f\v ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ +([,.;:!?])/g, "$1")
    .trim();
}

export function cleanText(input, options = DEFAULT_OPTIONS) {
  if (typeof input !== "string" || input.length === 0) return "";
  const config = { ...DEFAULT_OPTIONS, ...options };
  let text = input;

  if (config.htmlToMarkdown) text = htmlToMarkdown(text);
  if (config.cleanUrls) text = removeTrackingParameters(text);
  if (config.normalizeBullets) text = text.replace(/^[\t ]*(?:[•●◦▪‣]|[-*])[\t ]+/gm, "- ");
  if (config.straightenQuotes) {
    text = text.replace(/[“”„]/g, '"').replace(/[‘’‚]/g, "'").replace(/[–—]/g, "-").replace(/…/g, "...");
  }
  if (config.stripEmoji) {
    text = text.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, "").replace(/ {2,}/g, " ");
  }
  if (config.normalizeWhitespace) text = normalizeWhitespace(text);
  return text.trim();
}

export function changeCase(value, mode) {
  if (!value) return "";
  if (mode === "upper") return value.toUpperCase();
  if (mode === "lower") return value.toLowerCase();
  if (mode === "title") {
    const minor = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "in", "nor", "of", "on", "or", "the", "to"]);
    return value.replace(/\b[\p{L}\p{N}][\p{L}\p{N}'-]*\b/gu, (word, offset) => {
      const lower = word.toLowerCase();
      return offset > 0 && minor.has(lower) ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
    });
  }
  if (mode === "sentence") {
    return value.toLowerCase().replace(/(^|[.!?]\s+|\n+)([a-z])/g, (_, prefix, letter) => prefix + letter.toUpperCase());
  }
  return value;
}

export function getStats(value) {
  const trimmed = value.trim();
  return {
    words: trimmed ? trimmed.split(/\s+/u).length : 0,
    characters: value.length,
    links: value.match(/https?:\/\/\S+/g)?.length ?? 0
  };
}
