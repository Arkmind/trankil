(function () {
  var initialized = false;

  var CURRENCIES = [
    { code: "AUD", name: "Australian Dollar" },
    { code: "BGN", name: "Bulgarian Lev" },
    { code: "BRL", name: "Brazilian Real" },
    { code: "CAD", name: "Canadian Dollar" },
    { code: "CHF", name: "Swiss Franc" },
    { code: "CNY", name: "Chinese Yuan" },
    { code: "CZK", name: "Czech Koruna" },
    { code: "DKK", name: "Danish Krone" },
    { code: "EUR", name: "Euro" },
    { code: "GBP", name: "British Pound" },
    { code: "HKD", name: "Hong Kong Dollar" },
    { code: "HUF", name: "Hungarian Forint" },
    { code: "IDR", name: "Indonesian Rupiah" },
    { code: "ILS", name: "Israeli Shekel" },
    { code: "INR", name: "Indian Rupee" },
    { code: "ISK", name: "Icelandic Króna" },
    { code: "JPY", name: "Japanese Yen" },
    { code: "KRW", name: "South Korean Won" },
    { code: "MXN", name: "Mexican Peso" },
    { code: "MYR", name: "Malaysian Ringgit" },
    { code: "NOK", name: "Norwegian Krone" },
    { code: "NZD", name: "New Zealand Dollar" },
    { code: "PHP", name: "Philippine Peso" },
    { code: "PLN", name: "Polish Zloty" },
    { code: "RON", name: "Romanian Leu" },
    { code: "SEK", name: "Swedish Krona" },
    { code: "SGD", name: "Singapore Dollar" },
    { code: "THB", name: "Thai Baht" },
    { code: "TRY", name: "Turkish Lira" },
    { code: "USD", name: "US Dollar" },
    { code: "ZAR", name: "South African Rand" },
  ];

  function getName(code) {
    var c = CURRENCIES.find(function (x) {
      return x.code === code;
    });
    return c ? c.name : code;
  }

  // Format with thin-space (\u202f) thousands grouping and smart decimal places
  function fmtDisplay(val) {
    if (isNaN(val) || val === null) return "";
    var decimals = val > 0 && val < 0.01 ? 6 : 2;
    var fixed = Math.abs(val).toFixed(decimals);
    var parts = fixed.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
    return parts.join(".");
  }

  // Parse a potentially grouped number string (strips thin spaces / nbsp)
  function parseNum(str) {
    if (typeof str !== "string") return NaN;
    return parseFloat(str.replace(/[\u202f\u00a0\s,]/g, ""));
  }

  function populateSelect(sel, currentCode) {
    var frag = document.createDocumentFragment();
    CURRENCIES.forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c.code;
      opt.textContent = c.code + " \u2013 " + c.name;
      if (c.code === currentCode) opt.selected = true;
      frag.appendChild(opt);
    });
    sel.innerHTML = "";
    sel.appendChild(frag);
  }

  function initCurrencyWidget(widget) {
    var fromInput = widget.querySelector(".currency-from-input");
    var toInput = widget.querySelector(".currency-to-input");
    var fromSelect = widget.querySelector(".currency-from-select");
    var toSelect = widget.querySelector(".currency-to-select");
    var headerEl = widget.querySelector(".currency-header");
    var resultEl = widget.querySelector(".currency-result");

    if (!fromInput || !toInput || !fromSelect || !toSelect) return;

    var rate = parseFloat(widget.dataset.rate);
    var fromCode = widget.dataset.from;
    var toCode = widget.dataset.to;
    var fetchController = null;

    populateSelect(fromSelect, fromCode);
    populateSelect(toSelect, toCode);

    // Format initial values on load
    var initFrom = parseNum(fromInput.value) || 1;
    var initTo = parseNum(toInput.value);
    fromInput.value = fmtDisplay(initFrom);
    toInput.value = fmtDisplay(isNaN(initTo) ? initFrom * rate : initTo);

    function updateMeta(fromVal, toVal) {
      if (headerEl)
        headerEl.textContent =
          fmtDisplay(fromVal) + " " + getName(fromCode) + " equals";
      if (resultEl)
        resultEl.textContent = fmtDisplay(toVal) + " " + getName(toCode);
    }

    // Strip formatting on focus so the user types raw digits
    fromInput.addEventListener("focus", function () {
      var n = parseNum(fromInput.value);
      if (!isNaN(n)) fromInput.value = String(n);
    });
    fromInput.addEventListener("blur", function () {
      var n = parseNum(fromInput.value);
      if (!isNaN(n) && n >= 0) fromInput.value = fmtDisplay(n);
    });
    fromInput.addEventListener("input", function () {
      var val = parseNum(fromInput.value);
      if (isNaN(val) || val < 0) {
        toInput.value = "";
        return;
      }
      var converted = val * rate;
      toInput.value = fmtDisplay(converted);
      updateMeta(val, converted);
    });

    toInput.addEventListener("focus", function () {
      var n = parseNum(toInput.value);
      if (!isNaN(n)) toInput.value = String(n);
    });
    toInput.addEventListener("blur", function () {
      var n = parseNum(toInput.value);
      if (!isNaN(n) && n >= 0) toInput.value = fmtDisplay(n);
    });
    toInput.addEventListener("input", function () {
      var val = parseNum(toInput.value);
      if (isNaN(val) || val < 0) {
        fromInput.value = "";
        return;
      }
      var converted = val / rate;
      fromInput.value = fmtDisplay(converted);
      updateMeta(converted, val);
    });

    function onCurrencyChange() {
      var newFrom = fromSelect.value;
      var newTo = toSelect.value;
      if (newFrom === newTo) return;

      if (fetchController) fetchController.abort();
      fetchController = new AbortController();
      var signal = fetchController.signal;

      widget.classList.add("currency-loading");

      fetch(
        "https://api.frankfurter.dev/v2/rates?base=" +
          encodeURIComponent(newFrom) +
          "&quotes=" +
          encodeURIComponent(newTo),
        { signal: signal },
      )
        .then(function (res) {
          return res.json();
        })
        .then(function (data) {
          if (!Array.isArray(data) || !data[0] || !data[0].rate) return;
          rate = data[0].rate;
          fromCode = newFrom;
          toCode = newTo;

          var fromVal = parseNum(fromInput.value);
          if (isNaN(fromVal) || fromVal < 0) fromVal = 1;
          var toVal = fromVal * rate;
          fromInput.value = fmtDisplay(fromVal);
          toInput.value = fmtDisplay(toVal);
          updateMeta(fromVal, toVal);
        })
        .catch(function () {
          /* ignore abort + network errors */
        })
        .finally(function () {
          widget.classList.remove("currency-loading");
          fetchController = null;
        });
    }

    fromSelect.addEventListener("change", onCurrencyChange);
    toSelect.addEventListener("change", onCurrencyChange);
  }

  function tryInit() {
    if (initialized) return;
    var widget = document.querySelector(".currency-widget");
    if (widget) {
      initialized = true;
      initCurrencyWidget(widget);
    } else {
      requestAnimationFrame(tryInit);
    }
  }

  tryInit();
})();
