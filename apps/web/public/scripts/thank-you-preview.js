// Thank You card preview — style switcher + paper-size switcher.
// Buttons are discovered by data attribute, so adding a style or paper size
// needs no change here.
//
// Initial state can be driven from the URL, which keeps a chosen style
// linkable:  /print/thank-you?style=b&paper=2up
(function () {
  var STYLES = ["a", "b", "c"];
  var PAPERS = ["5x7", "letter", "a4", "2up"];

  function activate(selector, key, selected) {
    document.querySelectorAll(selector).forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset[key] === selected);
    });
  }

  function setVariant(id) {
    document.querySelectorAll(".variant-pane").forEach(function (pane) {
      pane.classList.toggle("is-active", pane.dataset.pane === id);
    });
    activate("[data-variant-btn]", "variantBtn", id);
  }

  function setPaper(paper) {
    document.body.dataset.paper = paper;
    activate("[data-paper-btn]", "paperBtn", paper);
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-variant-btn], [data-paper-btn]");
    if (!btn) return;
    if (btn.dataset.variantBtn) setVariant(btn.dataset.variantBtn);
    else setPaper(btn.dataset.paperBtn);
  });

  var params = new URLSearchParams(location.search);
  var style = params.get("style");
  var paper = params.get("paper");

  setVariant(STYLES.indexOf(style) >= 0 ? style : STYLES[0]);
  setPaper(PAPERS.indexOf(paper) >= 0 ? paper : PAPERS[0]);
})();
