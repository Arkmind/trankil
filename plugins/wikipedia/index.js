let template = "";
let enabled = true;

// Cache the trigger fetch result so execute() reuses it without a second request
let _cache = { query: null, lang: null, data: null };

const TIMEOUT_MS = 5_000;
const USER_AGENT = "degoog-wikipedia-plugin/1.0";

const _esc = (s) => {
  if (typeof s !== "string") return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

const _render = (data) => {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? "");
};

async function _fetchSummary(lang, query) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const params = new URLSearchParams({
      action: "query",
      titles: query,
      redirects: "1",
      prop: "extracts|pageimages|info|description",
      exintro: "1",
      explaintext: "1",
      exsentences: "5",
      pithumbsize: "120",
      inprop: "url",
      format: "json",
      origin: "*",
    });
    const res = await fetch(
      `https://${lang}.wikipedia.org/w/api.php?${params}`,
      {
        signal: controller.signal,
        headers: { "User-Agent": USER_AGENT },
      },
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = await res.json();
    const page = Object.values(json?.query?.pages ?? {})[0];
    if (!page || page.pageid === -1 || "missing" in page) return null;
    return page;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

export const slot = {
  id: "wikipedia",
  name: "Wikipedia",
  description:
    "Shows a Wikipedia summary card when the search query exactly matches an article title (English or French).",
  position: "above-sidebar",

  settingsSchema: [
    {
      key: "enabled",
      label: "Enabled",
      type: "toggle",
    },
  ],

  async init(ctx) {
    if (ctx.readFile) {
      template = await ctx.readFile("template.html");
    }
  },

  configure(settings) {
    enabled = settings?.enabled !== "false";
  },

  async trigger(query) {
    const q = query.trim();
    if (!enabled || q.length < 2 || q.length > 100) return false;

    // Try English first, then French
    for (const lang of ["en", "fr"]) {
      const data = await _fetchSummary(lang, q);
      if (data && data.title && data.title.toLowerCase() === q.toLowerCase()) {
        _cache = { query: q, lang, data };
        return true;
      }
    }

    _cache = { query: q, lang: null, data: null };
    return false;
  },

  async execute(query) {
    const q = query.trim();

    // Re-use cached result if available; otherwise re-fetch
    let lang = _cache.lang;
    let data = _cache.data;

    if (_cache.query !== q || !data) {
      for (const l of ["en", "fr"]) {
        const d = await _fetchSummary(l, q);
        if (d && d.title && d.title.toLowerCase() === q.toLowerCase()) {
          lang = l;
          data = d;
          break;
        }
      }
    }

    if (!data) return { html: "" };

    const title = _esc(data.title || "");
    const url = _esc(data.fullurl || "");
    const description = _esc(data.description || "");

    const rawExtract = data.extract || "";
    const extract = _esc(
      rawExtract.length > 600
        ? rawExtract.slice(0, 600).trimEnd() + "…"
        : rawExtract,
    );

    let thumbnail = "";
    if (data.thumbnail?.source) {
      thumbnail = `<img class="wiki-thumb" src="${_esc(data.thumbnail.source)}" alt="${title}" loading="lazy">`;
    }

    const html = _render({ title, url, description, extract, thumbnail });
    return { html };
  },
};

export default { slot };
