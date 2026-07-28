import test from "node:test";
import assert from "node:assert/strict";
import { kategorieSeite, kategorieBand, kategoriePfad, detailSeite } from "../templates/layout.mjs";

const ANZEIGEN = [
  { slug: "a-1", titel: "Zapfanlage", kategorie: "Party & Feiern", preis: "40 €", beschreibung: "Kalt.", bilder: ["b_01.jpg"], url: "https://example.org/1" },
  { slug: "a-2", titel: "Bierbank", kategorie: "Party & Feiern", preis: "15 €", beschreibung: "Holz.", bilder: ["b_01.jpg"], url: "https://example.org/2" },
  { slug: "b-1", titel: "Sackkarre", kategorie: "Umzug & Transport", preis: "12 €", beschreibung: "Stabil.", bilder: ["b_01.jpg"], url: "https://example.org/3" },
];

const KONFIG = {
  KATEGORIE_MOTIVE: {},
  KATEGORIE_TEXTE: { "Party & Feiern": "Alles für die Feier." },
  KONTAKT: { telefon: "0176 55180756", zeiten: "Mo–So", plzOrt: "04275 Leipzig" },
};

test("die Kategorieseite zeigt nur die Angebote ihrer Kategorie", () => {
  const s = kategorieSeite("Party & Feiern", ANZEIGEN, KONFIG, "../../");
  assert.equal(s.anzahl, 2);
  assert.match(s.content, /Zapfanlage/);
  assert.match(s.content, /Bierbank/);
  assert.doesNotMatch(s.content, /Sackkarre/);
});

test("der Kopf nennt Name, Anzahl und den Einleitungssatz", () => {
  const s = kategorieSeite("Party & Feiern", ANZEIGEN, KONFIG, "../../");
  assert.match(s.hero, /<h1[^>]*>Party &amp; Feiern<\/h1>/);
  assert.match(s.hero, /2 Angebote/);
  assert.match(s.hero, /Alles für die Feier\./);
});

test("ohne Einleitungssatz bleibt die Stelle einfach leer", () => {
  const s = kategorieSeite("Umzug & Transport", ANZEIGEN, KONFIG, "../../");
  assert.match(s.hero, /1 Angebot zum Mieten/, "Einzahl bei genau einem Angebot");
  assert.doesNotMatch(s.hero, /1 Angebote/);
  assert.doesNotMatch(s.hero, /undefined/);
  assert.doesNotMatch(s.hero, /class="hero-lead"/, "ohne Text kein leerer Absatz");
});

test("die Filterleiste der Kategorieseite hat keine Kategorieknoepfe", () => {
  const s = kategorieSeite("Party & Feiern", ANZEIGEN, KONFIG, "../../");
  assert.doesNotMatch(s.content, /class="f-kat"/);
  assert.match(s.content, /id="f-suche"/, "Suchfeld bleibt");
  assert.match(s.content, /id="f-sort"/, "Sortierung bleibt");
});

test("unten stehen die anderen Kategorien, nicht die eigene", () => {
  const s = kategorieSeite("Party & Feiern", ANZEIGEN, KONFIG, "../../");
  assert.match(s.content, /Andere Kategorien/);
  assert.match(s.content, /Umzug &amp; Transport/);
  const eigene = s.content.match(/class="kat-kachel" href="[^"]*party-feiern/g) || [];
  assert.equal(eigene.length, 0, "die eigene Kategorie darf nicht verlinkt sein");
});

test("die Kategorie-Kacheln sind Links auf die jeweilige Seite", () => {
  const { html } = kategorieBand(ANZEIGEN, {}, "");
  assert.match(html, /<a class="kat-kachel" href="k\/party-feiern\/index\.html"/);
  assert.match(html, /<a class="kat-kachel" href="k\/umzug-transport\/index\.html"/);
  assert.doesNotMatch(html, /<button[^>]*kat-kachel/, "keine Knoepfe mehr");
});

test("der Pfad zur Kategorie beruecksichtigt die Verzeichnistiefe", () => {
  assert.equal(kategoriePfad("Party & Feiern", ""), "k/party-feiern/index.html");
  assert.equal(kategoriePfad("Party & Feiern", "../../"), "../../k/party-feiern/index.html");
});

test("die Brotkrumen der Detailseite verlinken die Kategorie", () => {
  const h = detailSeite(ANZEIGEN[0], "../../", {});
  assert.match(h, /<a href="\.\.\/\.\.\/k\/party-feiern\/index\.html">Party &amp; Feiern<\/a>/);
});
