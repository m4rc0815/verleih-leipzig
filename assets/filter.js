// Filtern und Suchen auf der Startseite. Rein clientseitig, ohne Nachladen.
(function () {
  var grid = document.getElementById("angebot-grid");
  if (!grid) return;
  var karten = Array.prototype.slice.call(grid.querySelectorAll(".angebot-card"));
  var suche = document.getElementById("f-suche");
  var knoepfe = Array.prototype.slice.call(document.querySelectorAll(".f-kat"));
  var sortierung = document.getElementById("f-sort");
  var zaehler = document.getElementById("f-zaehler");
  var leer = document.getElementById("f-leer");
  var aktiveKategorie = "";

  function anwenden() {
    var q = ((suche && suche.value) || "").trim().toLowerCase();
    var sichtbar = 0;

    karten.forEach(function (k) {
      var passtSuche = !q || k.dataset.such.indexOf(q) !== -1;
      var passtKat = !aktiveKategorie || k.dataset.kategorie === aktiveKategorie;
      var zeigen = passtSuche && passtKat;
      k.hidden = !zeigen;
      if (zeigen) sichtbar++;
    });

    var art = sortierung ? sortierung.value : "titel";
    karten
      .slice()
      .sort(function (a, b) {
        if (art === "preis-auf") return parseInt(a.dataset.preis, 10) - parseInt(b.dataset.preis, 10);
        if (art === "preis-ab") return parseInt(b.dataset.preis, 10) - parseInt(a.dataset.preis, 10);
        return a.dataset.titel.localeCompare(b.dataset.titel, "de");
      })
      .forEach(function (k) { grid.appendChild(k); });

    if (zaehler) zaehler.textContent = sichtbar + " von " + karten.length + " Angeboten";
    if (leer) leer.hidden = sichtbar !== 0;
  }

  knoepfe.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var wert = btn.dataset.kategorie || "";
      aktiveKategorie = aktiveKategorie === wert ? "" : wert; // nochmal klicken hebt auf
      knoepfe.forEach(function (b) {
        b.classList.toggle("is-active", b.dataset.kategorie === aktiveKategorie && aktiveKategorie !== "");
      });
      anwenden();
    });
  });

  if (suche) suche.addEventListener("input", anwenden);
  if (sortierung) sortierung.addEventListener("change", anwenden);
  anwenden();
})();
