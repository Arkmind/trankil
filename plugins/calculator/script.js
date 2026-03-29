(function () {
  "use strict";

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function factorial(n) {
    n = Math.floor(Math.abs(n));
    if (n > 170) return Infinity;
    if (n < 0) return NaN;
    var r = 1;
    for (var i = 2; i <= n; i++) r *= i;
    return r;
  }

  function safeEval(code) {
    try {
      var fn = new Function(
        "Math",
        "factorial",
        "Infinity",
        "NaN",
        '"use strict"; return (' + code + ")",
      );
      var result = fn(Math, factorial, Infinity, NaN);
      if (result === undefined || result === null) return null;
      if (typeof result === "number") {
        if (isNaN(result)) return "Not a number";
        if (!isFinite(result)) return result > 0 ? "Infinity" : "-Infinity";
      }
      return result;
    } catch (e) {
      return null;
    }
  }

  function formatResult(val) {
    if (typeof val === "string") return val;
    if (typeof val !== "number") return String(val);
    var s = parseFloat(val.toPrecision(10)).toString();
    if (/^-?\d+$/.test(s) && s.replace("-", "").length <= 15) {
      return Number(s).toLocaleString("en-US");
    }
    return s;
  }

  function exprToJs(expr, isRad) {
    var s = expr;
    s = s
      .replace(/\u00d7/g, "*")
      .replace(/\u00f7/g, "/")
      .replace(/\u2212/g, "-");
    s = s.replace(/\u03c0/g, "Math.PI").replace(/\be\b/g, "Math.E");
    if (!isRad) {
      s = s.replace(/\bsin\s*\(/g, "Math.sin((Math.PI/180)*");
      s = s.replace(/\bcos\s*\(/g, "Math.cos((Math.PI/180)*");
      s = s.replace(/\btan\s*\(/g, "Math.tan((Math.PI/180)*");
    } else {
      s = s.replace(/\bsin\s*\(/g, "Math.sin(");
      s = s.replace(/\bcos\s*\(/g, "Math.cos(");
      s = s.replace(/\btan\s*\(/g, "Math.tan(");
    }
    s = s.replace(/\basin\s*\(/g, "Math.asin(");
    s = s.replace(/\bacos\s*\(/g, "Math.acos(");
    s = s.replace(/\batan\s*\(/g, "Math.atan(");
    s = s.replace(/\bln\s*\(/g, "Math.log(");
    s = s.replace(/\blog\s*\(/g, "Math.log10(");
    s = s.replace(/\bsqrt\s*\(/g, "Math.sqrt(");
    s = s.replace(/\u221a\s*\(/g, "Math.sqrt(");
    s = s.replace(/\babs\s*\(/g, "Math.abs(");
    s = s.replace(/\^/g, "**");
    s = s.replace(/([0-9.]+)\s*!/g, "factorial($1)");
    s = s.replace(/(\d+(?:\.\d+)?)\s*EXP\s*/g, "$1e");
    s = s.replace(/(\d+(?:\.\d+)?)\s*%/g, "($1/100)");
    return s;
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ── State (shared across re-inits) ───────────────────────────────────────────

  var MAX_HISTORY = 15;
  var state = {
    expr: "",
    result: "0",
    isRad: false,
    isInv: false,
    ans: 0,
    justEvaluated: false,
    history: [],
  };
  var initialized = false;

  // ── Resolve DOM lazily each time (widget may be replaced on navigation) ──────

  function $(sel) {
    return document.querySelector(sel);
  }

  function evaluateLive() {
    if (!state.expr) {
      state.result = "0";
      return;
    }
    var jsCode = exprToJs(state.expr, state.isRad);
    var val = safeEval(jsCode);
    if (val !== null) {
      state.result = formatResult(val);
    }
  }

  function updateDisplay() {
    var exprEl = $(".calc-widget #calc-expr");
    var resultEl = $(".calc-widget #calc-result");
    if (!exprEl || !resultEl) return;
    exprEl.textContent = state.expr;
    resultEl.textContent = state.result;
    var len = state.result.length;
    resultEl.classList.toggle("calc-result--small", len > 12 && len <= 20);
    resultEl.classList.toggle(
      "calc-result--error",
      state.result === "Error" || state.result === "Not a number",
    );
  }

  function addHistory(expr, result) {
    state.history.unshift({ expr: expr, result: result });
    if (state.history.length > MAX_HISTORY) state.history.pop();
  }

  function renderHistory() {
    var historyList = $(".calc-widget #calc-history-list");
    if (!historyList) return;
    if (state.history.length === 0) {
      historyList.innerHTML =
        '<div class="calc-history-empty">No history yet</div>';
      return;
    }
    historyList.innerHTML = state.history
      .map(function (h, i) {
        return (
          '<div class="calc-history-item" data-hi="' +
          i +
          '">' +
          '<span class="calc-history-expr">' +
          escHtml(h.expr) +
          "</span>" +
          '<span class="calc-history-val">' +
          escHtml(h.result) +
          "</span>" +
          "</div>"
        );
      })
      .join("");
  }

  function syncInvLabels() {
    var sinBtn = $(".calc-widget #calc-sin-btn");
    var cosBtn = $(".calc-widget #calc-cos-btn");
    var tanBtn = $(".calc-widget #calc-tan-btn");
    var lnBtn = $(".calc-widget #calc-ln-btn");
    var logBtn = $(".calc-widget #calc-log-btn");
    var sqrtBtn = $(".calc-widget #calc-sqrt-btn");
    var invBtn = $(".calc-widget #calc-inv-btn");
    if (!sinBtn) return;
    if (state.isInv) {
      sinBtn.textContent = "sin\u207b\u00b9";
      cosBtn.textContent = "cos\u207b\u00b9";
      tanBtn.textContent = "tan\u207b\u00b9";
      lnBtn.textContent = "e\u02e3";
      logBtn.textContent = "10\u02e3";
      sqrtBtn.textContent = "x\u00b2";
      invBtn.classList.add("calc-btn--active");
    } else {
      sinBtn.textContent = "sin";
      cosBtn.textContent = "cos";
      tanBtn.textContent = "tan";
      lnBtn.textContent = "ln";
      logBtn.textContent = "log";
      sqrtBtn.textContent = "\u221a";
      invBtn.classList.remove("calc-btn--active");
    }
  }

  function appendToExpr(str) {
    if (state.justEvaluated) {
      if (/^[+\-\u00d7\u00f7\u2212^%]/.test(str)) {
        state.expr = state.result.replace(/,/g, "") + str;
      } else {
        state.expr = str;
      }
      state.justEvaluated = false;
    } else {
      state.expr += str;
    }
    evaluateLive();
    updateDisplay();
  }

  function handleAction(action) {
    switch (action) {
      case "digit-0":
        appendToExpr("0");
        break;
      case "digit-1":
        appendToExpr("1");
        break;
      case "digit-2":
        appendToExpr("2");
        break;
      case "digit-3":
        appendToExpr("3");
        break;
      case "digit-4":
        appendToExpr("4");
        break;
      case "digit-5":
        appendToExpr("5");
        break;
      case "digit-6":
        appendToExpr("6");
        break;
      case "digit-7":
        appendToExpr("7");
        break;
      case "digit-8":
        appendToExpr("8");
        break;
      case "digit-9":
        appendToExpr("9");
        break;
      case "dot":
        if (!state.justEvaluated && /\.\d*$/.test(state.expr)) return;
        appendToExpr(".");
        break;
      case "add":
        appendToExpr("+");
        break;
      case "subtract":
        appendToExpr("\u2212");
        break;
      case "multiply":
        appendToExpr("\u00d7");
        break;
      case "divide":
        appendToExpr("\u00f7");
        break;
      case "power":
        appendToExpr("^");
        break;
      case "percent":
        appendToExpr("%");
        break;
      case "open-paren":
        appendToExpr("(");
        break;
      case "close-paren":
        appendToExpr(")");
        break;
      case "sin":
        appendToExpr(state.isInv ? "asin(" : "sin(");
        break;
      case "cos":
        appendToExpr(state.isInv ? "acos(" : "cos(");
        break;
      case "tan":
        appendToExpr(state.isInv ? "atan(" : "tan(");
        break;
      case "ln":
        appendToExpr(state.isInv ? "e^(" : "ln(");
        break;
      case "log":
        appendToExpr(state.isInv ? "10^(" : "log(");
        break;
      case "sqrt":
        appendToExpr(state.isInv ? "^2" : "\u221a(");
        break;
      case "factorial":
        appendToExpr("!");
        break;
      case "pi":
        appendToExpr("\u03c0");
        break;
      case "e":
        appendToExpr("e");
        break;
      case "exp":
        appendToExpr("EXP");
        break;
      case "ans":
        appendToExpr(String(state.ans).replace(/,/g, ""));
        break;
      case "equals": {
        if (!state.expr) return;
        var jsCode = exprToJs(state.expr, state.isRad);
        var val = safeEval(jsCode);
        if (val === null) {
          state.result = "Error";
          updateDisplay();
          return;
        }
        var formatted = formatResult(val);
        addHistory(state.expr, formatted);
        state.ans = typeof val === "number" ? val : state.ans;
        state.expr = "";
        state.result = formatted;
        state.justEvaluated = true;
        updateDisplay();
        break;
      }
      case "clear":
        state.expr = "";
        state.result = "0";
        state.justEvaluated = false;
        updateDisplay();
        break;
      case "deg": {
        state.isRad = false;
        var degBtn = $(".calc-widget #calc-deg-btn");
        var radBtn = $(".calc-widget #calc-rad-btn");
        if (degBtn) degBtn.classList.add("calc-btn--active");
        if (radBtn) radBtn.classList.remove("calc-btn--active");
        break;
      }
      case "rad": {
        state.isRad = true;
        var radBtn2 = $(".calc-widget #calc-rad-btn");
        var degBtn2 = $(".calc-widget #calc-deg-btn");
        if (radBtn2) radBtn2.classList.add("calc-btn--active");
        if (degBtn2) degBtn2.classList.remove("calc-btn--active");
        break;
      }
      case "inv":
        state.isInv = !state.isInv;
        syncInvLabels();
        break;
      case "toggle-history": {
        var historyPanel = $(".calc-widget #calc-history-panel");
        if (!historyPanel) break;
        var isVisible = historyPanel.style.display !== "none";
        if (isVisible) {
          historyPanel.style.display = "none";
        } else {
          renderHistory();
          historyPanel.style.display = "block";
        }
        break;
      }
      default:
        break;
    }
  }

  // ── Document-level event delegation (works even if HTML injected after script loads) ──

  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".calc-widget [data-action]");
    if (!btn) return;
    e.preventDefault();
    handleAction(btn.dataset.action);
  });

  document.addEventListener("click", function (e) {
    var item = e.target.closest(".calc-widget .calc-history-item");
    if (!item) return;
    var idx = parseInt(item.dataset.hi, 10);
    if (isNaN(idx) || !state.history[idx]) return;
    state.expr = state.history[idx].expr;
    state.justEvaluated = false;
    evaluateLive();
    updateDisplay();
    var historyPanel = $(".calc-widget #calc-history-panel");
    if (historyPanel) historyPanel.style.display = "none";
  });

  // ── Keyboard Support ─────────────────────────────────────────────────────────

  var KEY_MAP = {
    0: "digit-0",
    1: "digit-1",
    2: "digit-2",
    3: "digit-3",
    4: "digit-4",
    5: "digit-5",
    6: "digit-6",
    7: "digit-7",
    8: "digit-8",
    9: "digit-9",
    ".": "dot",
    "+": "add",
    "-": "subtract",
    "*": "multiply",
    "/": "divide",
    "%": "percent",
    "^": "power",
    "(": "open-paren",
    ")": "close-paren",
    Enter: "equals",
    "=": "equals",
    Escape: "clear",
    Delete: "clear",
    Backspace: "__backspace",
  };

  document.addEventListener("keydown", function (e) {
    if (!$(".calc-widget")) return;
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    var action = KEY_MAP[e.key];
    if (!action) return;
    e.preventDefault();
    if (action === "__backspace") {
      if (state.justEvaluated) {
        state.expr = "";
        state.result = "0";
        state.justEvaluated = false;
      } else {
        state.expr = state.expr.slice(0, -1);
        evaluateLive();
      }
      updateDisplay();
      return;
    }
    handleAction(action);
  });

  // ── Init: detect widget appearing in DOM and pre-populate ────────────────────

  function initWidget() {
    console.log("Initializing calculator widget");
    var widget = $(".calc-widget");
    if (!widget || initialized) return;
    initialized = true;

    var initial = widget.getAttribute("data-initial");
    if (initial) {
      var expr = initial
        .replace(/\*/g, "\u00d7")
        .replace(/\//g, "\u00f7")
        .replace(/sqrt\s*\(/gi, "\u221a(")
        .replace(/-/g, "\u2212");
      state.expr = expr;
      evaluateLive();
    }
    updateDisplay();
  }

  // Poll for the widget (slot panels are injected asynchronously via AJAX)
  function pollForWidget() {
    if (initialized) return;
    if ($(".calc-widget")) {
      initWidget();
    } else {
      requestAnimationFrame(pollForWidget);
    }
  }

  // Try immediately, then poll
  initWidget();
  if (!initialized) pollForWidget();

  console.log("Calculator plugin loaded");
})();
