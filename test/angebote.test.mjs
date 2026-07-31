import test from "node:test";
import assert from "node:assert/strict";
import { baueAngebote } from "../lib/angebote.mjs";

const anzeige = (slug, titel, beschreibung, extra = {}) => ({
  slug,
  titel,
  beschreibung,
  kategorie: "Party & Feiern",
  preis: "40 €",
  url: `https://www.kleinanzeigen.de/s-anzeige/x/${slug}`,
  bilder: ["bild_01.jpg"],
  ...extra,
});

test("eine Variante bekommt keine eigene Kachel mehr", () => {
  const anzeigen = [
    anzeige("garnitur", "Bierzeltgarnitur XL", "Preis 1. Tag: 15€"),
    anzeige("garnitur-lehne", "Bierzeltgarnitur mit Lehne", "Preis 1. Tag: 20€"),
  ];
  const inhalte = {
    ANZEIGEN: {
      garnitur: { titel: "Bierzeltgarnitur" },
      "garnitur-lehne": { varianteVon: "garnitur", variante: "mit Lehne" },
    },
  };
  const { angebote } = baueAngebote(anzeigen, inhalte);
  assert.equal(angebote.length, 1);
  assert.equal(angebote[0].titel, "Bierzeltgarnitur");
  assert.equal(angebote[0].varianten.length, 1);
  assert.equal(angebote[0].varianten[0].name, "mit Lehne");
});

test("der Ab-Preis gilt fuer die ganze Gruppe", () => {
  // Ist die Variante guenstiger, muss die Kachel deren Preis nennen — sonst
  // verspricht sie mehr, als die Seite haelt.
  const anzeigen = [
    anzeige("kamera", "Polaroid", "Preis 1. Tag: 25€"),
    anzeige("instax", "Instax mini", "Pro Tag: 15€"),
  ];
  const inhalte = {
    ANZEIGEN: { kamera: { titel: "Sofortbildkamera" }, instax: { varianteVon: "kamera", variante: "Instax" } },
  };
  const { angebote } = baueAngebote(anzeigen, inhalte);
  assert.equal(angebote[0].abPreisLabel, "ab 15 €");
});

test("Folgetage und Zusaetze bestimmen den Ab-Preis nicht", () => {
  // Die Huepfburg warb einmal mit "ab 25 €" — dem Folgetag ihres Geblaeses.
  const anzeigen = [anzeige("zapf", "Zapfanlage", "Preis 1. Tag: 50€\njeder weitere Tag: 20€\nEndreinigung: 15€")];
  const { angebote } = baueAngebote(anzeigen, { ANZEIGEN: {} });
  assert.equal(angebote[0].abPreisLabel, "ab 50 €");
});

test("ohne Einstiegspreis zaehlt das guenstigste Paket", () => {
  const anzeigen = [anzeige("x", "Etwas", "Langes Wochenende Do-Mo: 80€\n1 Woche: 140€")];
  const { angebote } = baueAngebote(anzeigen, { ANZEIGEN: {} });
  assert.equal(angebote[0].abPreisLabel, "ab 80 €");
});

test("bei genau einem Preis entfaellt das 'ab'", () => {
  const anzeigen = [anzeige("x", "Etwas", "Pro Tag: 20€")];
  const { angebote } = baueAngebote(anzeigen, { ANZEIGEN: {} });
  assert.equal(angebote[0].abPreisLabel, "20 €");
});

test("ohne jeden Preis steht 'auf Anfrage'", () => {
  const anzeigen = [anzeige("x", "Etwas", "Ein schoenes Ding ohne Preisangabe.")];
  const { angebote } = baueAngebote(anzeigen, { ANZEIGEN: {} });
  assert.equal(angebote[0].abPreisLabel, "auf Anfrage");
  assert.equal(angebote[0].abPreisZahl, null);
});

test("Preise aus inhalte.mjs schlagen die aus dem Anzeigentext", () => {
  // Steht der Preis im Fliesstext, erkennt die Aufbereitung ihn nicht — dann
  // traegt ihn die Redaktion nach.
  const anzeigen = [anzeige("karton", "Umzugskartons", "Ich verkaufe neue Kartons, sehr robust.")];
  const inhalte = {
    ANZEIGEN: { karton: { preise: [{ was: "Pro Stück", betrag: "2,20 €", rolle: "einstieg" }] } },
  };
  const { angebote } = baueAngebote(anzeigen, inhalte);
  assert.equal(angebote[0].abPreisLabel, "2,20 €");
});

test("Zubehoer bestimmt den Ab-Preis des Hauptangebots nicht", () => {
  // Das Geblaese zur Huepfburg kostet 45 €. Als Ausfuehrung gelesen warb die
  // Huepfburg mit "ab 45 €", obwohl sie selbst keinen Preis nennt.
  const anzeigen = [
    anzeige("huepfburg", "Hüpfburg", "Eine schöne Hüpfburg mit Rutsche, TÜV-geprüft und leicht aufzubauen."),
    anzeige("geblaese", "Gebläse", "Preis 1. Tag: 45€"),
  ];
  const inhalte = {
    ANZEIGEN: {
      huepfburg: { titel: "Hüpfburg" },
      geblaese: { varianteVon: "huepfburg", variante: "Gebläse einzeln", zubehoer: true },
    },
  };
  const { angebote } = baueAngebote(anzeigen, inhalte);
  assert.equal(angebote[0].abPreisLabel, "auf Anfrage");
  assert.equal(angebote[0].varianten[0].zubehoer, true);
});

test("eine echte Ausfuehrung bestimmt den Ab-Preis sehr wohl", () => {
  const anzeigen = [
    anzeige("gross", "Garnitur groß", "Preis 1. Tag: 20€"),
    anzeige("klein", "Garnitur klein", "Preis 1. Tag: 12€"),
  ];
  const inhalte = {
    ANZEIGEN: { gross: { titel: "Garnitur" }, klein: { varianteVon: "gross", variante: "klein" } },
  };
  assert.equal(baueAngebote(anzeigen, inhalte).angebote[0].abPreisLabel, "ab 12 €");
});

test("die Beschreibung nimmt den beschreibenden Satz, nicht den ersten", () => {
  // Die Huepfburg begann mit "Schulanfang 2026 und 2027 bereits vermietet." —
  // ein Terminhinweis, der so in der Google-Trefferliste gelandet waere.
  const anzeigen = [
    anzeige(
      "x",
      "Hüpfburg",
      "Schulanfang 2026 bereits vermietet.\n\nIch vermiete gewerblich eine schöne Hüpfburg mit Rutsche, zertifiziert und leicht aufzubauen."
    ),
  ];
  const { angebote } = baueAngebote(anzeigen, { ANZEIGEN: {} });
  assert.match(angebote[0].beschreibungssatz, /^Ich vermiete gewerblich/);
  assert.ok(angebote[0].beschreibungssatz.length <= 160);
});

test("die Beschreibung bleibt auch bei sehr langen Saetzen kurz genug", () => {
  const lang = "Ich vermiete gewerblich " + "ein sehr schönes Gerät ".repeat(20);
  const { angebote } = baueAngebote([anzeige("x", "X", lang)], { ANZEIGEN: {} });
  assert.ok(angebote[0].beschreibungssatz.length <= 160);
});

test("eine Preiskorrektur ersetzt nur ihre Zeile", () => {
  const anzeigen = [anzeige("zapf", "Zapfanlage", "Preis 1. Tag: 50€\njeder weitere Tag: 20€\n1 Woche: 140€")];
  const inhalte = { ANZEIGEN: { zapf: { preisKorrektur: { "1. Tag": "40 €" } } } };
  const { angebote, warnungen } = baueAngebote(anzeigen, inhalte);
  assert.deepEqual(
    angebote[0].preise.map((p) => [p.was, p.betrag]),
    [["1. Tag", "40 €"], ["Jeder weitere Tag", "20 €"], ["1 Woche", "140 €"]]
  );
  assert.equal(angebote[0].abPreisLabel, "ab 40 €");
  assert.deepEqual(warnungen, []);
});

test("eine Preiskorrektur, die keine Zeile trifft, wird gemeldet", () => {
  // Sonst steht wieder der alte Preis auf der Seite, ohne dass es auffaellt.
  const anzeigen = [anzeige("zapf", "Zapfanlage", "Pro Veranstaltung: 50€")];
  const inhalte = { ANZEIGEN: { zapf: { titel: "Zapfanlage", preisKorrektur: { "1. Tag": "40 €" } } } };
  const { angebote, warnungen } = baueAngebote(anzeigen, inhalte);
  assert.equal(angebote[0].preise[0].betrag, "50 €");
  assert.equal(warnungen.length, 1);
  assert.match(warnungen[0], /1\. Tag.*Zapfanlage/);
});

test("ein Verweis auf ein nicht vorhandenes Hauptangebot wird gemeldet", () => {
  const anzeigen = [anzeige("a", "A", "Pro Tag: 5€")];
  const inhalte = { ANZEIGEN: { a: { varianteVon: "gibt-es-nicht" } } };
  const { angebote, warnungen } = baueAngebote(anzeigen, inhalte);
  // Das Angebot verschwindet nicht still, es bleibt sichtbar und wird gemeldet.
  assert.equal(angebote.length, 1);
  assert.equal(warnungen.length, 1);
  assert.match(warnungen[0], /gibt-es-nicht/);
});

test("ein Eintrag zu einer geloeschten Anzeige wird gemeldet", () => {
  const { warnungen } = baueAngebote([anzeige("a", "A", "Pro Tag: 5€")], {
    ANZEIGEN: { a: {}, "alte-anzeige": { titel: "Weg" } },
  });
  assert.equal(warnungen.length, 1);
  assert.match(warnungen[0], /alte-anzeige/);
});

test("eine Variante ihrer selbst wird abgefangen", () => {
  const { angebote, warnungen } = baueAngebote([anzeige("a", "A", "Pro Tag: 5€")], {
    ANZEIGEN: { a: { varianteVon: "a" } },
  });
  assert.equal(angebote.length, 1);
  assert.equal(warnungen.length, 1);
});

test("offene Fragen werden gesammelt, stehen aber nicht auf der Seite", () => {
  const { angebote, offeneFragen } = baueAngebote([anzeige("a", "A", "Pro Tag: 5€")], {
    ANZEIGEN: { a: { titel: "A", offen: "Preis mit Robert klaeren" } },
  });
  assert.equal(offeneFragen.length, 1);
  assert.equal(offeneFragen[0].text, "Preis mit Robert klaeren");
  assert.equal(angebote[0].hinweis, "");
});
