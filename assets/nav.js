// Das Klappmenue "Kategorien" im Kopf. Ein <details> bleibt von sich aus
// offen, bis man wieder auf die Zeile klickt — nach einer Auswahl stand es
// deshalb weiter aufgeklappt im Bild. Hier schliesst es sich, sobald man
// einen Eintrag waehlt, daneben klickt oder Escape drueckt.
(function () {
  var menue = document.querySelector(".nav-kat");
  if (!menue) return;

  function schliessen() {
    menue.removeAttribute("open");
  }

  // Auswahl: sofort schliessen, nicht erst wenn die neue Seite geladen ist.
  // Der Eintrag der aktuellen Seite ist ein <span> und laesst das Menue sonst
  // stehen, weil kein Seitenwechsel folgt — deshalb der ganze Listenbereich.
  menue.querySelector(".nav-kat-liste").addEventListener("click", schliessen);

  document.addEventListener("click", function (e) {
    if (!menue.contains(e.target)) schliessen();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") schliessen();
  });
})();
