import test from "node:test";
import assert from "node:assert/strict";
import { kachel, detailSeite } from "../templates/layout.mjs";

// Ein Angebot, wie lib/angebote.mjs es liefert — nicht mehr die rohe Anzeige.
const ANGEBOT = {
  slug: "sackkarre-123",
  titel: 'Profi "Sackkarre" & Co',
  anzeigenTitel: "Profi Sackkarre mieten 250kg auf Rechnung",
  kategorie: "Umzug & Transport",
  url: "https://www.kleinanzeigen.de/s-anzeige/x/123-1-1",
  bilder: ["bild_01.jpg", "bild_02.jpg"],
  art: "miete",
  hinweis: "",
  preise: [
    { was: "1. Tag", betrag: "15 €", rolle: "einstieg", zusatz: "" },
    { was: "Jeder weitere Tag", betrag: "8 €", rolle: "folge", zusatz: "" },
  ],
  abPreisZahl: 15,
  abPreisLabel: "ab 15 €",
  absaetze: ["Erster Absatz.", "Zweiter Absatz."],
  daten: ["Tragkraft: 250 kg"],
  preishinweis: null,
  lieferung: [],
  pfand: null,
  zahlung: null,
  varianten: [],
};

const MIT_VARIANTE = {
  ...ANGEBOT,
  varianten: [
    {
      slug: "treppensteiger-456",
      name: "Treppensteiger",
      preise: [{ was: "1. Tag", betrag: "10 €", rolle: "einstieg", zusatz: "" }],
      abPreisZahl: 10,
      bilder: ["bild_01.jpg"],
      beschreibung: "Für Treppen geeignet.",
      daten: [],
    },
  ],
};

test("die Kachel verweist auf die Detailseite und das kleine Bild", () => {
  const h = kachel(ANGEBOT, "");
  assert.match(h, /href="a\/sackkarre-123\/index\.html"/);
  assert.match(h, /bilder\/sackkarre-123\/bild_01-k\.webp/);
  assert.match(h, /loading="lazy"/);
});

test("die Kachel maskiert Anfuehrungszeichen im Titel", () => {
  const h = kachel(ANGEBOT, "");
  assert.doesNotMatch(h, /alt="Profi "Sackkarre/);
  assert.match(h, /&quot;Sackkarre&quot;/);
});

test("die Kachel zeigt den Ab-Preis, nicht das Preisfeld der Anzeige", () => {
  const h = kachel(ANGEBOT, "");
  assert.match(h, /ab 15 €/);
  assert.match(h, /data-preis="15"/);
});

test("die Suche findet ein Angebot auch ueber seinen alten Anzeigentitel", () => {
  // Wer "250kg" eingibt, sucht die Sackkarre — auch wenn der kurze Titel das
  // Gewicht nicht mehr nennt.
  assert.match(kachel(ANGEBOT, ""), /250kg/);
});

test("die Suche findet ein Angebot ueber den Namen seiner Variante", () => {
  assert.match(kachel(MIT_VARIANTE, "").toLowerCase(), /treppensteiger/);
});

test("die Kachel weist auf mehrere Ausfuehrungen hin", () => {
  assert.doesNotMatch(kachel(ANGEBOT, ""), /Ausführungen/);
  assert.match(kachel(MIT_VARIANTE, ""), /2 Ausführungen/);
});

test("die Detailseite zeigt das grosse Bild und alle Vorschauen", () => {
  const h = detailSeite(ANGEBOT, "../../", {});
  assert.match(h, /id="galerie-gross"[^>]*src="\.\.\/\.\.\/bilder\/sackkarre-123\/bild_01\.webp"/);
  assert.equal((h.match(/galerie-vorschau/g) || []).length, 2);
});

test("die Galerie nimmt die Bilder der Varianten mit auf", () => {
  // Die Variante hat keine eigene Seite mehr — ihr Bild waere sonst verloren.
  const h = detailSeite(MIT_VARIANTE, "../../", {});
  assert.equal((h.match(/galerie-vorschau/g) || []).length, 3);
  assert.match(h, /bilder\/treppensteiger-456\/bild_01-k\.webp/);
});

test("eine Variante steuert hoechstens zwei Bilder zur Galerie bei", () => {
  // Bei der Bierzeltgarnitur kamen sonst 35 Vorschaubilder zusammen.
  const viele = {
    ...ANGEBOT,
    varianten: [
      { ...MIT_VARIANTE.varianten[0], bilder: ["b1.jpg", "b2.jpg", "b3.jpg", "b4.jpg", "b5.jpg"] },
    ],
  };
  const h = detailSeite(viele, "../../", {});
  assert.equal((h.match(/galerie-vorschau/g) || []).length, 4); // 2 eigene + 2 der Variante
  assert.doesNotMatch(h, /b3\.webp/);
});

test("die Detailseite setzt jeden Absatz einzeln", () => {
  const h = detailSeite(ANGEBOT, "../../", {});
  assert.match(h, /<p>Erster Absatz\.<\/p>/);
  assert.match(h, /<p>Zweiter Absatz\.<\/p>/);
});

test("die Preistabelle stellt den Einstiegspreis vor den Folgetag", () => {
  const h = detailSeite(ANGEBOT, "../../", {});
  assert.ok(h.indexOf("1. Tag") < h.indexOf("Jeder weitere Tag"));
});

test("Varianten stehen mit eigenem Preis auf der Seite des Hauptangebots", () => {
  const h = detailSeite(MIT_VARIANTE, "../../", {});
  assert.match(h, /Ausführungen/);
  assert.match(h, /Treppensteiger/);
  assert.match(h, /1\. Tag: 10 €/);
});

test("Verkaufsartikel werden als solche gekennzeichnet", () => {
  // Auf einer Verleihseite muss dranstehen, was nicht zurueckkommt.
  assert.doesNotMatch(detailSeite(ANGEBOT, "../../", {}), /Verkauf, keine Miete/);
  assert.match(detailSeite({ ...ANGEBOT, art: "verkauf" }, "../../", {}), /Verkauf, keine Miete/);
});

test("die allgemeine Kondition greift nur, wenn das Angebot nichts eigenes sagt", () => {
  const konditionen = { lieferung: { text: "Pauschal 40 €." }, pfand: { text: "Ausweiskopie." } };
  const allgemein = detailSeite(ANGEBOT, "../../", { konditionen });
  assert.match(allgemein, /Pauschal 40 €\./);

  const eigen = detailSeite({ ...ANGEBOT, lieferung: ["Liefergebühr: 15€ innerhalb Leipzig"] }, "../../", { konditionen });
  assert.match(eigen, /15€ innerhalb Leipzig/);
  assert.doesNotMatch(eigen, /Pauschal 40 €\./);
});

test("kein Pfand wird ausdruecklich ausgewiesen", () => {
  const h = detailSeite({ ...ANGEBOT, pfand: "kein Pfand" }, "../../", {});
  assert.match(h, /kein Pfand/);
});

test("der Anfrage-Knopf erscheint nur, wenn der Anzeigen-Link an ist", () => {
  assert.doesNotMatch(detailSeite(ANGEBOT, "../../", { anzeigenLink: false }), /anfrage-btn/);
  const an = detailSeite(ANGEBOT, "../../", { anzeigenLink: true, anzeigenLinkLabel: "Anfragen" });
  assert.match(an, /anfrage-btn/);
  assert.match(an, /rel="noopener noreferrer"/);
});
