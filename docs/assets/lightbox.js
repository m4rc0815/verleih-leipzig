// Bildergalerie der Detailseite: Klick auf eine Vorschau tauscht das grosse Bild.
// Bewusst schlicht — kein Overlay, keine Abhaengigkeiten.
(function () {
  var gross = document.getElementById("galerie-gross");
  if (!gross) return;
  var vorschauen = Array.prototype.slice.call(document.querySelectorAll(".galerie-vorschau"));
  if (!vorschauen.length) return;

  function zeige(btn) {
    gross.src = btn.getAttribute("data-gross");
    vorschauen.forEach(function (v) { v.classList.toggle("is-active", v === btn); });
  }

  vorschauen.forEach(function (btn) {
    btn.addEventListener("click", function () { zeige(btn); });
  });

  // Pfeiltasten blaettern durch die Bilder.
  document.addEventListener("keydown", function (e) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    var i = vorschauen.findIndex(function (v) { return v.classList.contains("is-active"); });
    if (i < 0) return;
    var next = e.key === "ArrowRight" ? (i + 1) % vorschauen.length
                                      : (i - 1 + vorschauen.length) % vorschauen.length;
    zeige(vorschauen[next]);
    vorschauen[next].focus();
  });
})();
