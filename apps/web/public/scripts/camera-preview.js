// Roll Call card preview — format switcher.
// Buttons are discovered by data attribute, so adding a format needs no change
// here. The initial format can come from the URL, which keeps a chosen one
// linkable:  /print/camera?paper=4up
(function () {
  // Must match the PAPERS array in print/camera.astro — an id missing here
  // silently falls back to the first format instead of failing.
  var PAPERS = ["tent", "4up", "flat", "sign", "signletter"];

  function setPaper(paper) {
    document.body.dataset.paper = paper;
    document.querySelectorAll(".paper-pane").forEach(function (pane) {
      pane.classList.toggle("is-active", pane.dataset.pane === paper);
    });
    document.querySelectorAll("[data-paper-btn]").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.paperBtn === paper);
    });
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-paper-btn]");
    if (btn) setPaper(btn.dataset.paperBtn);
  });

  var wanted = new URLSearchParams(location.search).get("paper");
  setPaper(PAPERS.indexOf(wanted) > -1 ? wanted : PAPERS[0]);
})();
