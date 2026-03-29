(function () {
  "use strict";

  const SEARCH_URL = "https://lrclib.net/api/search";

  // Safe DOM-based HTML escaping — avoids regex edge cases
  const _esc = (() => {
    const el = document.createElement("span");
    return (s) => {
      if (s == null) return "";
      el.textContent = String(s);
      return el.innerHTML;
    };
  })();

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

  const _buildLines = (text) =>
    text
      .split("\n")
      .map((l) => l.trimEnd())
      .filter((l) => l.length > 0);

  const _linesToHtml = (lines) =>
    lines.map((l) => `<span class="lyrics-line">${_esc(l)}</span>`).join("\n");

  const _buildWidgetHtml = (track) => {
    const lyricsText = _lyricsText(track);
    if (!lyricsText) return null;

    const lines = _buildLines(lyricsText);
    if (lines.length === 0) return null;

    const previewHtml = _linesToHtml(lines.slice(0, 4));
    const fullHtml = _linesToHtml(lines);

    return `<div class="lyrics-widget">
  <div class="lyrics-header"><span class="lyrics-heading">Lyrics</span></div>
  <div class="lyrics-track-info">
    <span class="lyrics-title">${_esc(track.trackName || "")}</span>
    <span class="lyrics-artist">${_esc(track.artistName || "")}</span>
  </div>
  <div class="lyrics-preview">${previewHtml}</div>
  <details class="lyrics-details">
    <summary class="lyrics-show-all">Full lyrics</summary>
    <div class="lyrics-full">${fullHtml}</div>
  </details>
  <p class="lyrics-source">Source: <a href="https://lrclib.net" class="lyrics-source-link" target="_blank" rel="noopener noreferrer">LrcLib</a></p>
</div>`;
  };

  const _resolve = async (el) => {
    const query = el.getAttribute("data-lyrics-query");
    if (!query) {
      el.remove();
      return;
    }
    try {
      const res = await fetch(`${SEARCH_URL}?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        el.remove();
        return;
      }
      const results = await res.json();
      if (!Array.isArray(results) || results.length === 0) {
        el.remove();
        return;
      }
      const html = _buildWidgetHtml(results[0]);
      if (!html) {
        el.remove();
        return;
      }
      el.outerHTML = html;
    } catch {
      el.remove();
    }
  };

  const _init = () => {
    for (const el of document.querySelectorAll(".lyrics-widget--pending")) {
      _resolve(el);
    }

    // Watch for pending widgets injected after initial load
    const observer = new MutationObserver((mutations) => {
      for (const { addedNodes } of mutations) {
        for (const node of addedNodes) {
          if (node.nodeType !== 1) continue;
          const items = node.classList?.contains("lyrics-widget--pending")
            ? [node]
            : Array.from(
                node.querySelectorAll?.(".lyrics-widget--pending") ?? [],
              );
          for (const el of items) _resolve(el);
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", _init);
  } else {
    _init();
  }
})();
