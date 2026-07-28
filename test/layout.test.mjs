import test from "node:test";
import assert from "node:assert/strict";
import { preisZahl, kachel, detailSeite } from "../templates/layout.mjs";

const ANZEIGE = {
  slug: "sackkarre-123",
  titel: 'Profi "Sackkarre" & Co',
  preis: "15 €",
  ort: "04275 Leipzig",
  datum: "25.07.2026",
  kategorie: "Umzug & Transport",
  beschreibung: "Erster Absatz.\nZweite Zeile.\n\nZweiter Absatz.",
  url: "https://www.kleinanzeigen.de/s-anzeige/x/123-1-1",
  bilder: ["bild_01.jpg", "bild_02.jpg"],
};

test("liest die Zahl aus dem Preis", () => {
  assert.equal(preisZahl("15 €"), "15");
  assert.equal(preisZahl("120 €"), "120");
});

test("Preise ohne Zahl liefern einen leeren Sortierwert", () => {
  // "VB" und Leerwerte duerfen keine Ersatzzahl bekommen — sonst landen sie
  // beim absteigenden Sortieren vorne statt hinten.
  assert.equal(preisZahl("VB"), "");
  assert.equal(preisZahl(""), "");
  assert.equal(preisZahl(null), "");
});

test("die Kachel verweist auf die Detailseite und das kleine Bild", () => {
  const h = kachel(ANZEIGE, "");
  assert.match(h, /href="a\/sackkarre-123\/index\.html"/);
  assert.match(h, /bilder\/sackkarre-123\/bild_01-k\.webp/);
  assert.match(h, /loading="lazy"/);
});

test("die Kachel maskiert Anfuehrungszeichen im Titel", () => {
  const h = kachel(ANZEIGE, "");
  assert.doesNotMatch(h, /alt="Profi "Sackkarre/);
  assert.match(h, /&quot;Sackkarre&quot;/);
});

test("die Detailseite zeigt das grosse Bild und alle Vorschauen", () => {
  const h = detailSeite(ANZEIGE, "../../", {});
  assert.match(h, /id="galerie-gross"[^>]*src="\.\.\/\.\.\/bilder\/sackkarre-123\/bild_01\.webp"/);
  assert.equal((h.match(/galerie-vorschau/g) || []).length, 2);
});

test("die Detailseite macht aus Leerzeilen Absaetze", () => {
  const h = detailSeite(ANZEIGE, "../../", {});
  assert.equal((h.match(/<p>/g) || []).length, 2);
  assert.match(h, /Erster Absatz\.<br>Zweite Zeile\./);
});

test("der Anfrage-Knopf erscheint nur, wenn der Anzeigen-Link an ist", () => {
  assert.doesNotMatch(detailSeite(ANZEIGE, "../../", { anzeigenLink: false }), /anfrage-btn/);
  const an = detailSeite(ANZEIGE, "../../", { anzeigenLink: true, anzeigenLinkLabel: "Anfragen" });
  assert.match(an, /anfrage-btn/);
  assert.match(an, /rel="noopener noreferrer"/);
});
