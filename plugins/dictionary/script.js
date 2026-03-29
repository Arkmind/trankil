(function () {
  function initDictCard(card) {
    var btn = card.querySelector(".dict-more-btn");
    if (!btn) return;

    btn.addEventListener("click", function () {
      var expanded = btn.getAttribute("aria-expanded") === "true";
      var extras = card.querySelectorAll(".dict-extra");

      extras.forEach(function (el) {
        el.style.display = expanded ? "none" : "block";
      });

      btn.setAttribute("aria-expanded", expanded ? "false" : "true");

      // Update button label — keep the arrow span, swap the text node before it
      var arrow = btn.querySelector(".dict-more-arrow");
      if (arrow) {
        var isEn = document.documentElement.lang !== "fr";
        btn.childNodes[0].nodeValue = expanded
          ? isEn
            ? "More "
            : "Plus "
          : isEn
            ? "Less "
            : "Moins ";
      }
    });
  }

  function scanCards() {
    document.querySelectorAll(".dict-card").forEach(function (card) {
      if (!card.dataset.dictInit) {
        card.dataset.dictInit = "1";
        initDictCard(card);
      }
    });
  }

  // Handle cards already in the DOM
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scanCards);
  } else {
    scanCards();
  }

  // Handle cards injected dynamically (slot results arrive after page load)
  var observer = new MutationObserver(function (mutations) {
    var shouldScan = false;
    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].addedNodes.length > 0) {
        shouldScan = true;
        break;
      }
    }
    if (shouldScan) scanCards();
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
