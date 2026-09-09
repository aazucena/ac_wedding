// Menu card preview — card-stock switcher (5×7, A5 or 4×9).
// Buttons are discovered by data attribute, so adding a size needs no change
// here; it only needs a matching @page rule in styles/menu-card.css.
//
// Initial size can be driven from the URL, which keeps a choice linkable:
//   /print/menu?size=a5
(function () {
  var SIZES = ["5x7", "a5", "4x9"];

  function setSize(size) {
    document.body.dataset.size = size;
    document.querySelectorAll("[data-size-btn]").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.sizeBtn === size);
    });
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-size-btn]");
    if (btn) setSize(btn.dataset.sizeBtn);
  });

  var size = new URLSearchParams(location.search).get("size");
  setSize(SIZES.indexOf(size) >= 0 ? size : SIZES[0]);
})();
