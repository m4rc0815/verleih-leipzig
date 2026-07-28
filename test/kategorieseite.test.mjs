import test from "node:test";
import assert from "node:assert/strict";
import {
  kategorieSeite,
  kategorieBand,
  kategoriePfad,
  detailSeite,
  startSeite,
  documentShell,
} from "../templates/layout.mjs";

const ANZEIGEN = [
  { slug: "a-1", titel: "Zapfanlage", kategorie: "Party & Feiern", preis: "40 €", beschreibung: "Kalt.", bilder: ["b_01.jpg"], url: "https://example.org/1" },
  { slug: "a-2", titel: "Bierbank", kategorie: "Party & Feiern", preis: "15 €", beschreibung: "Holz.", bilder: ["b_01.jpg"], url: "https://example.org/2" },
  { slug: "b-1", titel: "Sackkarre", kategorie: "Umzug & Transport", preis: "12 €", beschreibung: "Stabil.", bilder: ["b_01.jpg"], url: "https://example.org/3" },
];

const KONFIG = {
  KATEGORIE_MOTIVE: {},
  KATEGORIE_TEXTE: { "Party & Feiern": "Alles für die Feier." },
  KONTAKT: { telefon: "0176 55180756", zeiten: "Mo–So", plzOrt: "04275 Leipzig" },
  ZUSAGEN: [{ icon: "lieferung", titel: "Lieferservice", text: "Ich bringe alles vorbei." }],
  ROBERT: { name: "Robert Kipf", initialen: "RK", bild: "", absaetze: ["Text."] },
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

test("oben steht eine Umschaltreihe zu allen Kategorien", () => {
  const s = kategorieSeite("Party & Feiern", ANZEIGEN, KONFIG, "../../");
  // Die eigene Kategorie ist markiert und nicht verlinkt, die anderen sind Links.
  assert.match(s.content, /<span class="kat-pille is-active"[^>]*>Party &amp; Feiern<\/span>/);
  assert.match(s.content, /<a class="kat-pille" href="\.\.\/\.\.\/k\/umzug-transport\/index\.html">/);
  assert.match(s.content, /kat-alle" href="\.\.\/\.\.\/index\.html#angebote">Alle</);
});

test("die Startseite hat einen Alle-Knopf, der anfangs gilt", () => {
  const s = kategorieSeite("Party & Feiern", ANZEIGEN, KONFIG, "../../");
  assert.doesNotMatch(s.content, /class="f-kat f-alle/, "auf der Kategorieseite filtert nichts");
  // Auf der Startseite dagegen schon — dort ist "Alle" der Ausgangszustand.
  const start = startSeite(ANZEIGEN, KONFIG);
  assert.match(start.content, /class="f-kat f-alle is-active" data-kategorie=""/);
  const knopfReihe = start.content.match(/<div class="f-kat-reihe">(.*?)<\/div>/s)[1];
  assert.ok(
    knopfReihe.lastIndexOf("Alle") > knopfReihe.lastIndexOf("Foto"),
    "Alle steht am Ende der Reihe"
  );
});

test("der Pfad zur Kategorie beruecksichtigt die Verzeichnistiefe", () => {
  assert.equal(kategoriePfad("Party & Feiern", ""), "k/party-feiern/index.html");
  assert.equal(kategoriePfad("Party & Feiern", "../../"), "../../k/party-feiern/index.html");
});

test("das Klappmenue startet geschlossen, auch auf einer Kategorieseite", () => {
  // Mit dem open-Attribut stand es dort dauerhaft aufgeklappt im Bild.
  const html = documentShell({ title: "T", active: "kategorien", aktiveKategorie: "Party & Feiern" });
  assert.match(html, /<details class="nav-kat">/);
  assert.doesNotMatch(html, /<details[^>]* open/);
  assert.match(html, /assets\/nav\.js/, "das Skript zum Schliessen wird geladen");
});

test("die Brotkrumen der Detailseite verlinken die Kategorie", () => {
  const h = detailSeite(ANZEIGEN[0], "../../", {});
  assert.match(h, /<a href="\.\.\/\.\.\/k\/party-feiern\/index\.html">Party &amp; Feiern<\/a>/);
});
