// Filtern, Suchen und Sortieren der Angebotsliste. Rein clientseitig, ohne
// Nachladen. Laeuft auf der Startseite (mit Kategorieknoepfen) und auf den
// Kategorieseiten (ohne — dort ist die Kategorie durch die Seite gesetzt).
(function () {
  // Die Startseite hat ein Gitter je Kategorieblock, die Kategorieseiten genau
  // eines. Beides laeuft durch dieselbe Logik.
  var gitter = Array.prototype.slice.call(document.querySelectorAll(".angebot-grid"));
  if (!gitter.length) return;
  var bloecke = Array.prototype.slice.call(document.querySelectorAll(".angebot-block"));
  var karten = [];
  gitter.forEach(function (g) {
    karten = karten.concat(Array.prototype.slice.call(g.querySelectorAll(".angebot-card")));
  });
  var knoepfe = Array.prototype.slice.call(document.querySelectorAll(".f-kat"));
  var sortierung = document.getElementById("f-sort");
  var zaehler = document.getElementById("f-zaehler");
  var leer = document.getElementById("f-leer");
  var aktiveKategorie = "";

  // Zwei Suchfelder: eines im Kopfbereich (nur auf schmalen Geraeten sichtbar),
  // eines in der Filterleiste. Beide zeigen immer denselben Text und filtern
  // dieselbe Liste — sonst wundert man sich, warum die Eingabe verschwindet.
  var suchfelder = Array.prototype.slice.call(document.querySelectorAll(".js-suche"));

  function suchbegriff() {
    for (var i = 0; i < suchfelder.length; i++) {
      if (suchfelder[i].value) return suchfelder[i].value.trim().toLowerCase();
    }
    return "";
  }

  function anwenden() {
    var q = suchbegriff();
    var sichtbar = 0;

    karten.forEach(function (k) {
      var passtSuche = !q || k.dataset.such.indexOf(q) !== -1;
      var passtKat = !aktiveKategorie || k.dataset.kategorie === aktiveKategorie;
      var zeigen = passtSuche && passtKat;
      k.hidden = !zeigen;
      if (zeigen) sichtbar++;
    });

    var art = sortierung ? sortierung.value : "titel";
    function reihenfolge(a, b) {
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
    }
    // Sortiert wird innerhalb jedes Blocks. Ueber die Blockgrenze hinweg zu
    // sortieren wuerde die Gliederung nach Kategorien aufloesen.
    gitter.forEach(function (g) {
      Array.prototype.slice
        .call(g.querySelectorAll(".angebot-card"))
        .sort(reihenfolge)
        .forEach(function (k) { g.appendChild(k); });
    });

    // Ein Block ohne sichtbare Kachel verschwindet mitsamt seiner Ueberschrift.
    bloecke.forEach(function (b) {
      b.hidden = !b.querySelector(".angebot-card:not([hidden])");
    });

    if (zaehler) zaehler.textContent = sichtbar + " von " + karten.length + " Angeboten";
    if (leer) leer.hidden = sichtbar !== 0;
  }

  // Ein Klick setzt die Kategorie, "Alle" (leerer Wert) hebt sie auf. Frueher
  // musste man den gewaehlten Knopf ein zweites Mal treffen — das fand niemand.
  knoepfe.forEach(function (btn) {
    btn.addEventListener("click", function () {
      aktiveKategorie = btn.dataset.kategorie || "";
      knoepfe.forEach(function (b) {
        b.classList.toggle("is-active", (b.dataset.kategorie || "") === aktiveKategorie);
      });
      anwenden();
    });
  });

  suchfelder.forEach(function (feld) {
    feld.addEventListener("input", function () {
      suchfelder.forEach(function (anderes) {
        if (anderes !== feld) anderes.value = feld.value;
      });
      anwenden();
    });
  });

  if (sortierung) sortierung.addEventListener("change", anwenden);
  anwenden();
})();
