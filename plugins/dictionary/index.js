const _esc = (s) => {
  if (typeof s !== "string") return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

// Trigger patterns — English and French
const PATTERNS = [
  {
    re: /^(?:definition|define|definition of|meaning of)\s+(.+)$/i,
    lang: "en",
  },
  { re: /^(.+?)\s+(?:definition|meaning)$/i, lang: "en" },
  {
    re: /^(?:définition de|définir|signification de|définition)\s+(.+)$/i,
    lang: "fr",
  },
  { re: /^(.+?)\s+(?:définition|signification)$/i, lang: "fr" },
];

function parseQuery(query) {
  const q = query.trim();
  for (const { re, lang } of PATTERNS) {
    const m = q.match(re);
    if (m) {
      const word = m[1].trim();
      // Reject multi-word extractions that look like phrases (> 3 words) for suffix patterns
      if (word.length > 0 && word.length <= 80) {
        return { word, lang };
      }
    }
  }
  return null;
}

// Map English POS labels to French display labels
const FR_POS = {
  noun: "nom",
  verb: "verbe",
  adjective: "adjectif",
  adverb: "adverbe",
  pronoun: "pronom",
  preposition: "préposition",
  conjunction: "conjonction",
  interjection: "interjection",
  article: "article",
  determiner: "déterminant",
  numeral: "numéral",
  "proper noun": "nom propre",
};

function formatPOS(pos, lang) {
  if (!pos) return "";
  if (lang === "fr") return FR_POS[pos.toLowerCase()] || pos;
  return pos;
}

function buildEntriesHtml(entries, lang) {
  // Collect and merge groups by partOfSpeech
  const groups = [];
  const seen = new Map();

  for (const entry of entries) {
    const pos = entry.partOfSpeech || "unknown";
    if (!seen.has(pos)) {
      seen.set(pos, { pos, senses: [], synonyms: [] });
      groups.push(seen.get(pos));
    }
    const group = seen.get(pos);
    for (const sense of entry.senses || []) {
      if (group.senses.length < 3) {
        group.senses.push(sense);
      }
    }
    // Take synonyms from the first entry that has them
    if (
      group.synonyms.length === 0 &&
      Array.isArray(entry.synonyms) &&
      entry.synonyms.length > 0
    ) {
      group.synonyms = entry.synonyms;
    }
  }

  let html = "";
  const synLabel = lang === "fr" ? "Synonymes" : "Synonyms";

  for (let i = 0; i < groups.length; i++) {
    const { pos, senses, synonyms } = groups[i];
    const isExtra = i >= 2;
    const cls = isExtra ? "dict-entry-group dict-extra" : "dict-entry-group";

    html += `<div class="${cls}">`;
    html += `<div class="dict-pos">${_esc(formatPOS(pos, lang))}</div>`;
    html += `<ol class="dict-definitions">`;

    for (const sense of senses) {
      html += `<li>`;
      html += `<span class="dict-definition">${_esc(sense.definition || "")}</span>`;

      if (Array.isArray(sense.tags) && sense.tags.length > 0) {
        html += ` <span class="dict-tag">${_esc(sense.tags.join(", "))}</span>`;
      }

      if (Array.isArray(sense.examples) && sense.examples.length > 0) {
        html += `<div class="dict-example">&ldquo;${_esc(sense.examples[0])}&rdquo;</div>`;
      }
      html += `</li>`;
    }

    html += `</ol>`;

    const syns = synonyms.slice(0, 6);
    if (syns.length > 0) {
      html += `<div class="dict-synonyms">`;
      html += `<span class="dict-syn-label">${synLabel}\u00a0: </span>`;
      const defPrefix = lang === "fr" ? "définition " : "definition ";
      for (const syn of syns) {
        html += `<a class="dict-syn-chip" href="/search?q=${encodeURIComponent(defPrefix + syn)}">${_esc(syn)}</a>`;
      }
      html += `</div>`;
    }

    html += `</div>`;
  }

  if (groups.length > 2) {
    const label = lang === "fr" ? "Plus" : "More";
    html += `<button class="dict-more-btn" aria-expanded="false" type="button">${label} <span class="dict-more-arrow" aria-hidden="true">&#9660;</span></button>`;
  }

  return html;
}

let templateHtml = "";
let enabled = true;

export const slot = {
  id: "dictionary",
  name: "Dictionary",
  description:
    'Shows word definitions for queries like "define hello", "hello definition", "bonjour définition", or "définition de bonjour".',
  position: "above-results",

  settingsSchema: [
    {
      key: "enabled",
      label: "Enabled",
      type: "toggle",
    },
  ],

  async init(ctx) {
    if (ctx.readFile) {
      templateHtml = await ctx.readFile("template.html");
    }
  },

  configure(settings) {
    enabled = settings?.enabled !== "false";
  },

  trigger(query) {
    if (!enabled) return false;
    const q = query.trim();
    if (q.length < 2 || q.length > 150) return false;
    return parseQuery(q) !== null;
  },

  async execute(query) {
    const parsed = parseQuery(query.trim());
    if (!parsed) return { html: "" };

    const { word, lang } = parsed;

    try {
      const res = await fetch(
        `https://freedictionaryapi.com/api/v1/entries/${encodeURIComponent(lang)}/${encodeURIComponent(word)}`,
      );
      if (!res.ok) return { html: "" };

      const data = await res.json();
      if (!data || !Array.isArray(data.entries) || data.entries.length === 0) {
        return { html: "" };
      }

      // Pick the first available IPA pronunciation
      let phonetic = "";
      for (const entry of data.entries) {
        if (
          Array.isArray(entry.pronunciations) &&
          entry.pronunciations.length > 0
        ) {
          phonetic = entry.pronunciations[0].text || "";
          if (phonetic) break;
        }
      }

      const entriesHtml = buildEntriesHtml(data.entries, lang);
      const sourceUrl = data.source?.url || "";
      const sourceName = data.source?.license?.name || "Wiktionary";

      // Replace simple placeholders first, then entries_html last to avoid conflicts
      const html = templateHtml
        .replace("{{word}}", _esc(data.word || word))
        .replace("{{phonetic}}", phonetic ? _esc(phonetic) : "")
        .replace("{{source_url}}", _esc(sourceUrl))
        .replace("{{source_name}}", _esc(sourceName))
        .replace("{{entries_html}}", entriesHtml);

      return { html };
    } catch {
      return { html: "" };
    }
  },
};

export default { slot };
