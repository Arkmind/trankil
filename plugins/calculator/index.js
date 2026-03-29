let calcEnabled = true;
let templateHtml = "";

// Matches expressions with digits + math operators/functions (broader than math-slot)
const HAS_DIGIT = /\d/;
const MATH_CHARS = /^[a-z0-9\s+\-*/.^()[\]{},!%πe]+$/i;
const MATH_FUNCS =
  /\b(sin|cos|tan|asin|acos|atan|sqrt|log|ln|abs|pow|exp|pi|factorial)\s*\(/i;
const SIMPLE_EXPR = /[\d]\s*[+\-*/^%]\s*[\d(]/;

const _esc = (s) => {
  if (typeof s !== "string") return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

export const slot = {
  id: "calculator",
  name: "Calculator",
  description:
    "A full scientific calculator that appears when a math expression is detected.",
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
    calcEnabled = settings?.enabled !== "false";
  },

  trigger(query) {
    if (!calcEnabled) return false;
    const q = query.trim();
    if (q.length < 1 || q.length > 200) return false;
    // Must have a digit
    if (!HAS_DIGIT.test(q)) return false;
    // Either a named math function call, or a simple expression with operators,
    // and composed only of math-safe characters
    if (MATH_FUNCS.test(q)) return true;
    if (SIMPLE_EXPR.test(q) && MATH_CHARS.test(q)) return true;
    return false;
  },

  async execute(query) {
    const safeExpr = _esc(query.trim());
    const html = (templateHtml || "<div>Calculator</div>").replace(
      "{{initialExpr}}",
      safeExpr,
    );
    return { title: "Calculator", html };
  },
};

export default { slot };
