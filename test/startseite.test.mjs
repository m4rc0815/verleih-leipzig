import test from "node:test";
import assert from "node:assert/strict";
import {
  zusagenBand,
  kategorieBand,
  robertBlock,
  kontaktBand,
  startHero,
} from "../templates/layout.mjs";

const ZUSAGEN = [
  { icon: "lieferung", titel: "Lieferservice", text: "Ich bringe alles vorbei." },
  { icon: "beleg", titel: "Auf Rechnung", text: "Auch für Firmen." },
];

test("die Zusagen-Leiste zeigt genau die konfigurierten Punkte", () => {
  const h = zusagenBand(ZUSAGEN);
  assert.equal((h.match(/class="zusage"/g) || []).length, 2);
  assert.match(h, /Lieferservice/);
  assert.match(h, /Auch für Firmen/);
});

test("die Zusagen-Leiste bleibt weg, wenn nichts konfiguriert ist", () => {
  assert.equal(zusagenBand([]), "");
  assert.equal(zusagenBand(undefined), "");
});

test("ein unbekanntes Symbol bricht die Leiste nicht", () => {
  const h = zusagenBand([{ icon: "gibtsnicht", titel: "Test", text: "Text" }]);
  assert.match(h, /Test/);
  assert.doesNotMatch(h, /undefined/);
});

const ANZEIGEN = [
  { slug: "a-1", titel: "Zapfanlage", kategorie: "Party & Feiern", bilder: ["bild_01.jpg"] },
  { slug: "a-2", titel: "Bierbank", kategorie: "Party & Feiern", bilder: ["bild_01.jpg"] },
  { slug: "b-1", titel: "Sackkarre", kategorie: "Umzug & Transport", bilder: ["bild_01.jpg"] },
];

test("die Kategorie-Kacheln zeigen die richtige Anzahl je Kategorie", () => {
  const { html } = kategorieBand(ANZEIGEN, {}, "");
  assert.match(html, /Party &amp; Feiern/);
  assert.match(html, /2 Angebote/);
  assert.match(html, /1 Angebot</, "Einzahl bei genau einem Angebot");
});

test("die Kategorie-Kacheln nutzen das konfigurierte Motiv", () => {
  const { html } = kategorieBand(ANZEIGEN, { "Party & Feiern": "a-2" }, "");
  assert.match(html, /bilder\/a-2\/bild_01-k\.webp/);
});

test("ein unbekannter Motiv-Slug faellt zurueck und wird gemeldet", () => {
  const { html, fehlend } = kategorieBand(ANZEIGEN, { "Party & Feiern": "gibt-es-nicht" }, "");
  assert.deepEqual(fehlend, ["Party & Feiern"]);
  assert.match(html, /bilder\/a-1\/bild_01-k\.webp/, "faellt auf die erste Anzeige zurueck");
});

test("Kategorien ohne Angebote erscheinen nicht", () => {
  const { html } = kategorieBand(ANZEIGEN, {}, "");
  assert.doesNotMatch(html, /Foto &amp; Technik/);
});

const ROBERT = {
  name: "Robert Kipf",
  initialen: "RK",
  bild: "",
  absaetze: ["Erster Absatz.", "Zweiter Absatz."],
  instagram: "https://www.instagram.com/robertkipf/",
  instagramName: "@robertkipf",
};

test("der Robert-Block zeigt die Initialen, solange kein Foto da ist", () => {
  const h = robertBlock(ROBERT, { telefon: "0176 55180756" }, "");
  assert.match(h, /robert-platzhalter[^>]*>RK</);
  assert.doesNotMatch(h, /<img/);
});

test("der Robert-Block zeigt das Foto, sobald eines eingetragen ist", () => {
  const h = robertBlock({ ...ROBERT, bild: "assets/robert.jpg" }, { telefon: "0176 1" }, "");
  assert.match(h, /<img[^>]+src="assets\/robert\.jpg"/);
  assert.doesNotMatch(h, /robert-platzhalter/);
});

test("der Robert-Block setzt jeden Absatz einzeln", () => {
  const h = robertBlock(ROBERT, { telefon: "0176 1" }, "");
  assert.equal((h.match(/<p>Erster Absatz\.<\/p>/g) || []).length, 1);
  assert.equal((h.match(/<p>Zweiter Absatz\.<\/p>/g) || []).length, 1);
});

test("der Instagram-Link oeffnet sicher in einem neuen Tab", () => {
  const h = robertBlock(ROBERT, { telefon: "0176 1" }, "");
  assert.match(h, /rel="noopener noreferrer"/);
  assert.match(h, /@robertkipf/);
});

test("ohne Instagram-Adresse erscheint kein Link", () => {
  const h = robertBlock({ ...ROBERT, instagram: "" }, { telefon: "0176 1" }, "");
  assert.doesNotMatch(h, /instagram/i);
});

test("das Kontaktband bildet eine gueltige tel-Adresse", () => {
  const h = kontaktBand({ telefon: "0176 55180756", email: "a@b.de", zeiten: "Mo–So", plzOrt: "04275 Leipzig" });
  assert.match(h, /href="tel:\+4917655180756"/);
  assert.match(h, /href="mailto:a@b\.de"/);
});

test("der Kopf nennt bewusst keine Stueckzahl", () => {
  // Der Bestand waechst; eine feste Zahl im Aushaengeschild veraltet und
  // laesst das Angebot kleiner wirken, als es ist.
  const h = startHero({ telefon: "0176 1" });
  assert.match(h, /Zahlreiche Sachen/);
  assert.doesNotMatch(h, /\d+ Sachen/);
  assert.match(h, /href="#angebote"/);
});
