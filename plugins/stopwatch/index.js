let timerEnabled = true;
let templateHtml = "";

// At least one of these keywords must be present to trigger
const KEYWORD_RE = /\b(minuteur|timer|stopwatch)\b/i;

// Duration parsing — checked in priority order
const DURATION_H_M_RE = /(\d+)\s*h(?:eures?|ours?)?\s*(\d+)/i;
const DURATION_H_RE = /(\d+)\s*h(?:eures?|ours?)?(?!\w)/i;
const DURATION_M_RE = /(\d+)\s*(?:mn|min(?:utes?)?)/i;
const DURATION_S_RE = /(\d+)\s*s(?:ec(?:ondes?|onds?)?)?(?!\w)/i;
const BARE_NUM_RE = /\b(\d+)\b/;

function parseDuration(query) {
  const q = query.toLowerCase();

  // "1h30", "1h 30", "1heure30", "1h30mn"
  const hm = DURATION_H_M_RE.exec(q);
  if (hm) return parseInt(hm[1], 10) * 3600 + parseInt(hm[2], 10) * 60;

  // "2h", "2 heures", "2 hours"
  const h = DURATION_H_RE.exec(q);
  if (h) return parseInt(h[1], 10) * 3600;

  // "30mn", "30 minutes", "5 min"
  const m = DURATION_M_RE.exec(q);
  if (m) return parseInt(m[1], 10) * 60;

  // "10s", "10 sec", "10 secondes", "10 seconds"
  const s = DURATION_S_RE.exec(q);
  if (s) return parseInt(s[1], 10);

  // Bare number adjacent to keyword: "timer 5" → 5 minutes
  const bare = BARE_NUM_RE.exec(q);
  if (bare) return parseInt(bare[1], 10) * 60;

  return null; // no duration found → caller uses the 5:00 default
}

export const slot = {
  id: "timer-stopwatch",
  name: "Timer / Stopwatch",
  description: "Interactive timer and stopwatch triggered by keywords.",
  position: "above-results",

  settingsSchema: [{ key: "enabled", label: "Enabled", type: "toggle" }],

  async init(ctx) {
    if (ctx.readFile) {
      templateHtml = await ctx.readFile("template.html");
    }
  },

  configure(settings) {
    timerEnabled = settings?.enabled !== "false";
  },

  trigger(query) {
    if (!timerEnabled) return false;
    return KEYWORD_RE.test(query);
  },

  async execute(query) {
    const isStopwatch = /\bstopwatch\b/i.test(query);
    const duration = parseDuration(query);
    const effectiveDuration = duration !== null ? duration : 300; // 5:00 default
    const autostart = duration !== null ? "true" : "false";

    const html = (templateHtml || "")
      .replace("{{duration}}", String(effectiveDuration))
      .replace("{{mode}}", isStopwatch ? "stopwatch" : "timer")
      .replace("{{autostart}}", autostart);

    return {
      title: isStopwatch ? "Stopwatch" : "Timer",
      html,
    };
  },
};

export default { slot };
