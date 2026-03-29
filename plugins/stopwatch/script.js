(function () {
  "use strict";

  var C = 2 * Math.PI * 54; // SVG arc circumference ≈ 339.29 (r = 54)

  // ── Sound state persists across widget re-inits (survives new searches) ────
  var soundEnabled = false;

  // ── Per-widget state ───────────────────────────────────────────────────────
  var state = {
    mode: "timer", // "timer" | "stopwatch"
    duration: 300, // total seconds (timer mode)
    remaining: 300, // seconds left  (timer mode)
    elapsed: 0, // seconds elapsed (stopwatch mode)
    running: false,
    alarming: false, // alarm looping after timer end
    intervalId: null,
    alarmIntervalId: null,
  };

  var currentWidgetEl = null; // track current DOM element to detect re-renders

  // ── DOM helpers ────────────────────────────────────────────────────────────
  function widget() {
    return document.getElementById("timer-widget");
  }

  // ── Time formatting ────────────────────────────────────────────────────────
  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function formatTime(seconds) {
    var s = Math.max(0, seconds);
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    if (h > 0) return h + ":" + pad(m) + ":" + pad(sec);
    return m + ":" + pad(sec);
  }

  // ── SVG arc ────────────────────────────────────────────────────────────────
  function setArc(ratio, instant) {
    var arc = document.getElementById("timer-progress-arc");
    if (!arc) return;
    var offset = C * (1 - Math.max(0, Math.min(1, ratio)));
    if (instant) {
      arc.classList.add("timer-progress--instant");
      arc.style.strokeDashoffset = offset.toFixed(2);
      // Re-enable transition after browser has applied the instant change
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          arc.classList.remove("timer-progress--instant");
        });
      });
    } else {
      arc.style.strokeDashoffset = offset.toFixed(2);
    }
  }

  function updateArc() {
    var ratio;
    if (state.mode === "timer") {
      ratio = state.duration > 0 ? state.remaining / state.duration : 0;
    } else {
      ratio = (state.elapsed % 60) / 60; // fills per minute
    }
    setArc(ratio);
  }

  // ── Display ────────────────────────────────────────────────────────────────
  function updateDisplay() {
    var el = document.getElementById("timer-display");
    if (!el || el.tagName === "INPUT") return;
    el.textContent =
      state.mode === "timer"
        ? formatTime(state.remaining)
        : formatTime(state.elapsed);
    updateArc();
  }

  // ── Play/pause button icon ─────────────────────────────────────────────────
  var SVG_PLAY =
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="5,3 19,12 5,21"/></svg>';
  var SVG_PAUSE =
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>';

  function updatePlayPauseBtn() {
    var btn = document.getElementById("timer-play-pause-btn");
    if (!btn) return;
    var active = state.running || state.alarming;
    btn.innerHTML = active ? SVG_PAUSE : SVG_PLAY;
    btn.setAttribute("aria-label", active ? "Arrêter" : "Démarrer");
  }

  // ── Sound button icon ──────────────────────────────────────────────────────
  var SVG_SOUND_OFF =
    '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';
  var SVG_SOUND_ON =
    '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';

  function updateSoundBtn() {
    var btn = document.getElementById("timer-sound-btn");
    if (!btn) return;
    btn.innerHTML = soundEnabled ? SVG_SOUND_ON : SVG_SOUND_OFF;
    btn.setAttribute("aria-pressed", soundEnabled ? "true" : "false");
    btn.setAttribute(
      "aria-label",
      soundEnabled ? "Son activé" : "Son désactivé",
    );
    btn.title = soundEnabled ? "Son activé" : "Son désactivé";
  }

  // ── Tab UI ────────────────────────────────────────────────────────────────
  function updateTabs() {
    var timerTab = document.getElementById("timer-tab-timer");
    var swTab = document.getElementById("timer-tab-stopwatch");
    if (!timerTab || !swTab) return;
    timerTab.classList.toggle("timer-tab--active", state.mode === "timer");
    swTab.classList.toggle("timer-tab--active", state.mode === "stopwatch");
  }

  // ── Web Audio alarm (loops until user stops it) ──────────────────────────
  var _audioCtx = null;
  function _getAudioCtx() {
    if (!_audioCtx || _audioCtx.state === "closed") {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (_audioCtx.state === "suspended") _audioCtx.resume();
    return _audioCtx;
  }

  function playBeep() {
    if (!soundEnabled) return;
    try {
      var ctx = _getAudioCtx();
      // Three rapid high beeps per cycle
      [0, 0.22, 0.44].forEach(function (delay) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.value = 1050;
        gain.gain.setValueAtTime(0.95, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + delay + 0.18,
        );
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.18);
      });
    } catch (e) {
      // Web Audio API unavailable — silent fail
    }
  }

  function startAlarm() {
    state.alarming = true;
    playBeep(); // first beep immediately
    if (!state.alarmIntervalId) {
      state.alarmIntervalId = setInterval(playBeep, 1400);
    }
  }

  function stopAlarm() {
    if (state.alarmIntervalId) {
      clearInterval(state.alarmIntervalId);
      state.alarmIntervalId = null;
    }
    state.alarming = false;
  }

  // ── Timer control ─────────────────────────────────────────────────────────
  function startTimer() {
    if (state.intervalId) return;
    stopAlarm(); // clear any leftover alarm before (re)starting
    state.running = true;
    updatePlayPauseBtn();
    state.intervalId = setInterval(function () {
      if (state.mode === "timer") {
        if (state.remaining > 0) {
          state.remaining--;
          updateDisplay();
          if (state.remaining === 0) {
            clearInterval(state.intervalId);
            state.intervalId = null;
            state.running = false;
            setArc(0, true);
            // Keep PAUSE button visible — alarm loops until user presses it
            startAlarm();
            updatePlayPauseBtn();
          }
        }
      } else {
        state.elapsed++;
        updateDisplay();
      }
    }, 1000);
  }

  function stopTimer() {
    stopAlarm();
    if (state.intervalId) {
      clearInterval(state.intervalId);
      state.intervalId = null;
    }
    state.running = false;
    updatePlayPauseBtn();
  }

  function resetTimer() {
    stopTimer(); // also stops alarm via stopTimer → stopAlarm
    if (state.mode === "timer") {
      state.remaining = state.duration;
      setArc(1, true);
    } else {
      state.elapsed = 0;
      setArc(0, true);
    }
    updateDisplay();
  }

  // ── Mode switch (tab click) ────────────────────────────────────────────────
  function switchMode(mode) {
    if (state.mode === mode) return;
    stopTimer();
    state.mode = mode;
    if (mode === "timer") {
      state.remaining = state.duration;
      setArc(1, true);
    } else {
      state.elapsed = 0;
      setArc(0, true);
    }
    updateTabs();
    updateDisplay();
    updatePlayPauseBtn();

    // Update the data-mode attribute so the CSS cursor rule works
    var w = widget();
    if (w) w.setAttribute("data-mode", mode);
  }

  // ── Editable time display (timer mode, stopped only) ──────────────────────
  function makeEditable() {
    if (state.running || state.mode !== "timer") return;
    var el = document.getElementById("timer-display");
    if (!el || el.tagName === "INPUT") return;

    var currentText = el.textContent;
    var input = document.createElement("input");
    input.type = "text";
    input.value = currentText;
    input.className = "timer-display-input";
    input.setAttribute("aria-label", "Modifier la durée");
    el.replaceWith(input);
    input.focus();
    input.select();

    function commit() {
      var val = input.value.trim();
      var parsed = parseTimeInput(val);
      var span = document.createElement("span");
      span.id = "timer-display";
      span.className = "timer-display";
      span.title = "Cliquer pour modifier";
      input.replaceWith(span);
      if (parsed !== null && parsed > 0) {
        state.duration = parsed;
        state.remaining = parsed;
        setArc(1, true);
      }
      updateDisplay();
    }

    input.addEventListener("blur", commit);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        input.blur();
      }
      if (e.key === "Escape") {
        input.removeEventListener("blur", commit);
        var span = document.createElement("span");
        span.id = "timer-display";
        span.className = "timer-display";
        span.title = "Cliquer pour modifier";
        span.textContent = currentText;
        input.replaceWith(span);
      }
    });
  }

  // Accepts "5:30" → 330, "1:30:00" → 5400, "5" → 300, "1:30" → 90
  function parseTimeInput(val) {
    var parts = val.split(":").map(function (p) {
      return parseInt(p.trim(), 10);
    });
    if (parts.length === 0 || parts.some(isNaN)) return null;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] * 60; // single number → minutes
  }

  // ── Fullscreen ─────────────────────────────────────────────────────────────
  var SVG_EXPAND =
    '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>';
  var SVG_COMPRESS =
    '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>';

  function toggleFullscreen() {
    var w = widget();
    if (!w) return;
    var on = w.classList.toggle("timer-widget--fullscreen");
    var btn = document.getElementById("timer-expand-btn");
    if (btn) {
      btn.innerHTML = on ? SVG_COMPRESS : SVG_EXPAND;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.title = on ? "Quitter le plein écran" : "Plein écran";
      btn.setAttribute("aria-label", btn.title);
    }
  }

  // ── Widget initialisation from DOM ─────────────────────────────────────────
  function initFromWidget(w) {
    var duration = parseInt(w.getAttribute("data-duration"), 10) || 300;
    var mode = w.getAttribute("data-mode") || "timer";
    var autostart = w.getAttribute("data-autostart") === "true";

    // Stop any in-progress timer / alarm from a previous widget
    stopAlarm();
    if (state.intervalId) {
      clearInterval(state.intervalId);
      state.intervalId = null;
    }

    state.mode = mode;
    state.duration = duration;
    state.remaining = duration;
    state.elapsed = 0;
    state.running = false;
    state.alarming = false;

    // Init SVG arc immediately (no transition on first paint)
    var arc = document.getElementById("timer-progress-arc");
    if (arc) {
      arc.style.strokeDasharray = C.toFixed(2);
      arc.classList.add("timer-progress--instant");
      arc.style.strokeDashoffset = mode === "timer" ? "0" : C.toFixed(2);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          if (arc) arc.classList.remove("timer-progress--instant");
        });
      });
    }

    updateTabs();
    updateDisplay();
    updatePlayPauseBtn();
    updateSoundBtn();

    if (autostart) {
      startTimer();
    }
  }

  // ── Event delegation ───────────────────────────────────────────────────────
  document.addEventListener("click", function (e) {
    if (!widget()) return;

    // Tab buttons
    var tab = e.target.closest("#timer-widget .timer-tab");
    if (tab) {
      var tabId = tab.getAttribute("data-tab");
      if (tabId) switchMode(tabId);
      return;
    }

    // Editable time display click
    var display = e.target.closest("#timer-widget #timer-display");
    if (display) {
      makeEditable();
      return;
    }

    // Action buttons
    var btn = e.target.closest("#timer-widget [data-action]");
    if (!btn) return;

    switch (btn.getAttribute("data-action")) {
      case "toggle-play":
        if (state.alarming) {
          // Alarm is ringing — stop it and return to ready state
          stopAlarm();
          updatePlayPauseBtn();
        } else if (state.running) {
          stopTimer();
        } else {
          // If timer finished (remaining = 0), reset before restarting
          if (state.mode === "timer" && state.remaining === 0) {
            state.remaining = state.duration;
            setArc(1, true);
            updateDisplay();
          }
          startTimer();
        }
        break;
      case "reset":
        resetTimer();
        break;
      case "toggle-sound":
        soundEnabled = !soundEnabled;
        updateSoundBtn();
        break;
      case "toggle-fullscreen":
        toggleFullscreen();
        break;
    }
  });

  // ── Widget detection via MutationObserver ─────────────────────────────────
  function checkWidget() {
    var w = widget();
    if (!w || w === currentWidgetEl) return;
    currentWidgetEl = w;
    initFromWidget(w);
  }

  var observer = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var nodes = mutations[i].addedNodes;
      for (var j = 0; j < nodes.length; j++) {
        var node = nodes[j];
        if (!node || node.nodeType !== 1) continue;
        if (
          node.id === "timer-widget" ||
          (typeof node.querySelector === "function" &&
            node.querySelector("#timer-widget"))
        ) {
          checkWidget();
          return;
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Immediate check in case the widget is already in the DOM
  checkWidget();
})();
