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
        if (art === "preis-auf" || art === "preis-ab") {
          // Angebote ohne Preis ("VB") haben einen leeren Wert und stehen
          // immer hinten — auch beim absteigenden Sortieren.
          var pa = a.dataset.preis, pb = b.dataset.preis;
          if (!pa || !pb) return !pa && !pb ? 0 : (pa ? -1 : 1);
          return art === "preis-auf"
            ? parseInt(pa, 10) - parseInt(pb, 10)
            : parseInt(pb, 10) - parseInt(pa, 10);
        }
        return a.dataset.titel.localeCompare(b.dataset.titel, "de");
      })
      .forEach(function (k) { grid.appendChild(k); });

    if (zaehler) zaehler.textContent = sichtbar + " von " + karten.length + " Angeboten";
    if (leer) leer.hidden = sichtbar !== 0;
  }

  // Die Kategorie-Kacheln weiter oben bedienen denselben Filter wie die Knoepfe.
  var kacheln = Array.prototype.slice.call(document.querySelectorAll(".kat-kachel"));

  function setzeKategorie(wert, springen) {
    aktiveKategorie = aktiveKategorie === wert ? "" : wert; // nochmal klicken hebt auf
    var aktiv = aktiveKategorie;
    knoepfe.concat(kacheln).forEach(function (b) {
      b.classList.toggle("is-active", aktiv !== "" && b.dataset.kategorie === aktiv);
    });
    anwenden();
    // Nur von den Kacheln aus springen: wer unten schon bei der Liste steht,
    // soll nicht bei jedem Filterklick weggescrollt werden.
    if (springen) {
      var ziel = document.getElementById("angebote");
      if (ziel) ziel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  knoepfe.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setzeKategorie(btn.dataset.kategorie || "", false);
    });
  });

  kacheln.forEach(function (kachel) {
    kachel.addEventListener("click", function () {
      setzeKategorie(kachel.dataset.kategorie || "", true);
    });
  });

  if (suche) suche.addEventListener("input", anwenden);
  if (sortierung) sortierung.addEventListener("change", anwenden);
  anwenden();
})();
