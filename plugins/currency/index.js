const CURRENCY_MAP = {
  // ISO codes (direct)
  usd: "USD",
  eur: "EUR",
  gbp: "GBP",
  jpy: "JPY",
  cny: "CNY",
  chf: "CHF",
  cad: "CAD",
  aud: "AUD",
  nzd: "NZD",
  sek: "SEK",
  nok: "NOK",
  dkk: "DKK",
  pln: "PLN",
  czk: "CZK",
  huf: "HUF",
  ron: "RON",
  bgn: "BGN",
  try: "TRY",
  mxn: "MXN",
  sgd: "SGD",
  hkd: "HKD",
  krw: "KRW",
  inr: "INR",
  brl: "BRL",
  zar: "ZAR",
  ils: "ILS",
  php: "PHP",
  idr: "IDR",
  myr: "MYR",
  thb: "THB",
  isk: "ISK",
  // English — full names
  dollar: "USD",
  dollars: "USD",
  "us dollar": "USD",
  "us dollars": "USD",
  "american dollar": "USD",
  "american dollars": "USD",
  euro: "EUR",
  euros: "EUR",
  pound: "GBP",
  pounds: "GBP",
  "pound sterling": "GBP",
  sterling: "GBP",
  "british pound": "GBP",
  "british pounds": "GBP",
  yen: "JPY",
  "japanese yen": "JPY",
  yuan: "CNY",
  renminbi: "CNY",
  "chinese yuan": "CNY",
  franc: "CHF",
  francs: "CHF",
  "swiss franc": "CHF",
  "swiss francs": "CHF",
  "canadian dollar": "CAD",
  "canadian dollars": "CAD",
  "australian dollar": "AUD",
  "australian dollars": "AUD",
  "new zealand dollar": "NZD",
  "new zealand dollars": "NZD",
  "swedish krona": "SEK",
  krona: "SEK",
  "norwegian krone": "NOK",
  krone: "NOK",
  "danish krone": "DKK",
  zloty: "PLN",
  "polish zloty": "PLN",
  koruna: "CZK",
  "czech koruna": "CZK",
  forint: "HUF",
  "hungarian forint": "HUF",
  leu: "RON",
  "romanian leu": "RON",
  lev: "BGN",
  "bulgarian lev": "BGN",
  lira: "TRY",
  "turkish lira": "TRY",
  peso: "MXN",
  "mexican peso": "MXN",
  "singapore dollar": "SGD",
  "singapore dollars": "SGD",
  "hong kong dollar": "HKD",
  "hong kong dollars": "HKD",
  won: "KRW",
  "south korean won": "KRW",
  rupee: "INR",
  "indian rupee": "INR",
  rupees: "INR",
  real: "BRL",
  "brazilian real": "BRL",
  rand: "ZAR",
  "south african rand": "ZAR",
  shekel: "ILS",
  sheqel: "ILS",
  "new shekel": "ILS",
  shekels: "ILS",
  "philippine peso": "PHP",
  rupiah: "IDR",
  "indonesian rupiah": "IDR",
  ringgit: "MYR",
  "malaysian ringgit": "MYR",
  baht: "THB",
  "thai baht": "THB",
  "icelandic krona": "ISK",
  // French names
  "dollar américain": "USD",
  "dollars américains": "USD",
  "livre sterling": "GBP",
  livre: "GBP",
  "yen japonais": "JPY",
  "yuan chinois": "CNY",
  "franc suisse": "CHF",
  "francs suisses": "CHF",
  "dollar canadien": "CAD",
  "dollars canadiens": "CAD",
  "dollar australien": "AUD",
  "dollars australiens": "AUD",
  "dollar néo-zélandais": "NZD",
  "couronne suédoise": "SEK",
  "couronne norvégienne": "NOK",
  "couronne danoise": "DKK",
  "zloty polonais": "PLN",
  "forint hongrois": "HUF",
  "lire turque": "TRY",
  "real brésilien": "BRL",
  "roupie indienne": "INR",
  roupie: "INR",
  "won sud-coréen": "KRW",
  "rand sud-africain": "ZAR",
  "dollar de singapour": "SGD",
  "dollar de hong kong": "HKD",
  "peso mexicain": "MXN",
  "ringgit malaisien": "MYR",
  "baht thaïlandais": "THB",
  "shekel israélien": "ILS",
  "couronne islandaise": "ISK",
};

const DISPLAY_NAMES = {
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "British Pound",
  JPY: "Japanese Yen",
  CNY: "Chinese Yuan",
  CHF: "Swiss Franc",
  CAD: "Canadian Dollar",
  AUD: "Australian Dollar",
  NZD: "New Zealand Dollar",
  SEK: "Swedish Krona",
  NOK: "Norwegian Krone",
  DKK: "Danish Krone",
  PLN: "Polish Zloty",
  CZK: "Czech Koruna",
  HUF: "Hungarian Forint",
  RON: "Romanian Leu",
  BGN: "Bulgarian Lev",
  TRY: "Turkish Lira",
  MXN: "Mexican Peso",
  SGD: "Singapore Dollar",
  HKD: "Hong Kong Dollar",
  KRW: "South Korean Won",
  INR: "Indian Rupee",
  BRL: "Brazilian Real",
  ZAR: "South African Rand",
  ILS: "Israeli Shekel",
  PHP: "Philippine Peso",
  IDR: "Indonesian Rupiah",
  MYR: "Malaysian Ringgit",
  THB: "Thai Baht",
  ISK: "Icelandic Króna",
};

// Connectors: "to", "in", "into" (English) | "en", "vers" (French)
const QUERY_PATTERN =
  /^(?:convert\s+)?(\d+(?:[.,]\d+)?\s+)?(.+?)\s+(?:to|in|into|en|vers)\s+(.+)$/i;

const _esc = (s) => {
  if (typeof s !== "string") return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

const _lookup = (fragment) => {
  if (!fragment) return null;
  return CURRENCY_MAP[fragment.trim().toLowerCase()] || null;
};

const _parseQuery = (query) => {
  const m = query.trim().match(QUERY_PATTERN);
  if (!m) return null;

  const amountStr = m[1] ? m[1].trim().replace(",", ".") : "1";
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) return null;

  const fromCode = _lookup(m[2]);
  const toCode = _lookup(m[3]);
  if (!fromCode || !toCode || fromCode === toCode) return null;

  return { amount, fromCode, toCode };
};

let currencyEnabled = true;
let templateHtml = "";

export const slot = {
  id: "currency",
  name: "Currency",
  description:
    'Shows a currency conversion widget for queries like "100 yen to usd" or "euro en dollar".',
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
    currencyEnabled = settings?.enabled !== "false";
  },

  trigger(query) {
    if (!currencyEnabled) return false;
    const q = query.trim();
    if (q.length < 3 || q.length > 120) return false;
    return _parseQuery(q) !== null;
  },

  async execute(query) {
    const parsed = _parseQuery(query.trim());
    if (!parsed) return { html: "" };

    const { amount, fromCode, toCode } = parsed;

    try {
      const res = await fetch(
        `https://api.frankfurter.dev/v2/rates?base=${encodeURIComponent(fromCode)}&quotes=${encodeURIComponent(toCode)}`,
      );
      if (!res.ok) return { html: "" };

      const data = await res.json();
      if (!Array.isArray(data) || !data[0]?.rate) return { html: "" };

      const rate = data[0].rate;
      const rawConverted = amount * rate;
      const convertedAmount =
        rawConverted < 0.01 ? rawConverted.toFixed(6) : rawConverted.toFixed(2);

      const fromName = DISPLAY_NAMES[fromCode] || fromCode;
      const toName = DISPLAY_NAMES[toCode] || toCode;

      const html = templateHtml
        .replace(/\{\{amount\}\}/g, _esc(String(amount)))
        .replace(/\{\{fromCode\}\}/g, _esc(fromCode))
        .replace(/\{\{toCode\}\}/g, _esc(toCode))
        .replace(/\{\{fromName\}\}/g, _esc(fromName))
        .replace(/\{\{toName\}\}/g, _esc(toName))
        .replace(/\{\{convertedAmount\}\}/g, _esc(convertedAmount))
        .replace(/\{\{rate\}\}/g, _esc(String(rate)));

      return { html };
    } catch {
      return { html: "" };
    }
  },
};

export default { slot };
