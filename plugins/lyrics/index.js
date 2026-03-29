const SEARCH_URL = "https://lrclib.net/api/search";
const TIMEOUT_MS = 3000;
const TRIGGER_KEYWORDS = [
  "lyrics",
  "lyric",
  "song",
  "music",
  "paroles",
  "lyrics for",
  "lyric for",
  "song lyrics",
  "song lyric",
  "paroles de",
  "parole de",
  "parole",
  "musique",
];

let enabled = true;
let template = "";

const _esc = (s) => {
  if (typeof s !== "string") return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

// Use a callback to avoid $-special-char issues when lyrics contain $1, $&, etc.
const _render = (tmpl, data) => {
  return tmpl.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? "");
};

const _stripTimestamps = (lrc) => {
  if (typeof lrc !== "string") return "";
  return lrc
    .split("\n")
    .map((line) => line.replace(/^\[\d{1,2}:\d{2}\.\d{1,3}\]\s?/, ""))
    .filter((line) => line.trim().length > 0)
    .join("\n");
};

const _lyricsText = (track) => {
  if (track.plainLyrics && track.plainLyrics.trim()) return track.plainLyrics;
  if (track.syncedLyrics && track.syncedLyrics.trim())
    return _stripTimestamps(track.syncedLyrics);
  return "";
};

const _buildLines = (text) => {
  return text
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0);
};

const _linesToHtml = (lines) => {
  return lines
    .map((l) => `<span class="lyrics-line">${_esc(l)}</span>`)
    .join("\n");
};

export const slot = {
  id: "lyrics",
  name: "Lyrics",
  description:
    "Shows song lyrics when a music-related query is detected via lrclib.net.",
  position: "above-sidebar",

  settingsSchema: [
    {
      key: "enabled",
      label: "Enabled",
      type: "toggle",
    },
  ],

  async init(ctx) {
    template = ctx.template || "";
  },

  configure(settings) {
    enabled = settings?.enabled !== "false";
  },

  trigger(query) {
    if (!enabled) return false;
    const q = query.trim();
    if (q.length < 2 || q.length > 100) return false;
    // Skip obvious non-song queries: raw URLs
    if (/^https?:\/\//i.test(q)) return false;
    return true;
  },

  async execute(query) {
    const querySplit = query
      .trim()
      .toLowerCase()
      .split(" ")
      .map((w) => (TRIGGER_KEYWORDS.includes(w) ? null : w))
      .filter(Boolean);
    const q = querySplit.join(" ");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(`${SEARCH_URL}?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
        headers: { "User-Agent": "degoog-lyrics-slot/1.0" },
      });
      clearTimeout(timer);

      if (!res.ok) return { html: "" };

      const results = await res.json();
      if (!Array.isArray(results) || results.length === 0) return { html: "" };

      const track = results.find((t) => {
        if (!t.trackName || !t.artistName) return false;
        const artistTitle = t.artistName + " " + t.trackName;
        const artistTitleSplit = artistTitle.toLowerCase().split(" ");
        return artistTitleSplit.every((word) => querySplit.includes(word));
      });

      const lyricsText = _lyricsText(track);
      if (!lyricsText) return { html: "" };

      const lines = _buildLines(lyricsText);
      if (lines.length === 0) return { html: "" };

      const previewHtml = _linesToHtml(lines.slice(0, 4));
      const fullHtml = _linesToHtml(lines);

      const html = _render(template, {
        title: _esc(track.trackName || ""),
        artist: _esc(track.artistName || ""),
        previewLines: previewHtml,
        fullLyrics: fullHtml,
      });

      return { title: "Lyrics", html };
    } catch (err) {
      clearTimeout(timer);
      if (err && err.name === "AbortError") {
        // Timeout — return a loading placeholder; script.js will resolve it client-side
        return {
          html: `<div class="lyrics-widget lyrics-widget--pending" data-lyrics-query="${_esc(q)}">
  <div class="lyrics-header"><span class="lyrics-heading">Lyrics</span></div>
  <div class="lyrics-loading"><span class="lyrics-loading-dot"></span> Loading lyrics\u2026</div>
</div>`,
        };
      }
      return { html: "" };
    }
  },
};

export default { slot };
