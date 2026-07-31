import test from "node:test";
import assert from "node:assert/strict";
import { zerlege } from "../lib/text-aufbereitung.mjs";

test("die Begruessung und die Grussformel der Anzeige fallen weg", () => {
  const r = zerlege("Herzlich willkommen auf meiner Seite :)\n\nEin Bohrhammer.\n\nViele Grüße :)\nRobert Kipf");
  assert.deepEqual(r.absaetze, ["Ein Bohrhammer."]);
});

test("Verweise auf andere Anzeigen fallen weg", () => {
  // Auf der eigenen Seite gibt es keine "anderen Anzeigen".
  const r = zerlege("Ein Stehtisch.\nViele weitere Sachen zur Vermietung findet ihr in meinen anderen Anzeigen.");
  assert.deepEqual(r.absaetze, ["Ein Stehtisch."]);
});

test("die Preisstaffel wird zur Tabelle", () => {
  const r = zerlege("Preis 1. Tag: 20€\n2 Tage: 30€\nlanges Wochenende Donnerstag-Montag: 50€");
  assert.deepEqual(
    r.preise.map((p) => [p.was, p.betrag, p.rolle]),
    [
      ["1. Tag", "20 €", "einstieg"],
      ["2 Tage", "30 €", "paket"],
      ["Langes Wochenende (Do–Mo)", "50 €", "paket"],
    ]
  );
});

test("mehrere Preise in einer Zeile werden getrennt", () => {
  const r = zerlege("Preis: 1.Tag: 12€, jeder weitere Tag 8€ pro Garnitur");
  assert.equal(r.preise.length, 2);
  assert.equal(r.preise[0].betrag, "12 €");
  assert.equal(r.preise[1].betrag, "8 €");
  assert.equal(r.preise[1].rolle, "folge");
});

test("ein Komma in der Zahl trennt nicht", () => {
  // "2,20€" wurde einmal zu "2" und "20€" — der zehnfache Preis.
  const r = zerlege("Pro Stück: 2,20€");
  assert.equal(r.preise.length, 1);
  assert.equal(r.preise[0].betrag, "2,20 €");
});

test("Folgetage werden erkannt, egal wie Robert sie schreibt", () => {
  for (const zeile of [
    "jeder weitere Tag: 8€",
    "Ab dem zweiten Tag: 8€",
    "ab zweitem Tag 8€",
    "ab 2. Tag: 8€",
    "jeder weirere Tag: 8€", // Tippfehler aus einer echten Anzeige
  ]) {
    const r = zerlege(zeile);
    assert.equal(r.preise[0].rolle, "folge", `nicht erkannt: ${zeile}`);
  }
});

test("Aufpreise fuer Zubehoer zaehlen nicht als Einstiegspreis", () => {
  // Sonst wirbt der Hochdruckreiniger mit dem Preis seiner Bodenfraese.
  const r = zerlege("Bodenfräse: 10€ extra pro Tag");
  assert.equal(r.preise[0].rolle, "zusatz");
});

test("Pfand, Zahlung und Lieferung werden herausgeloest", () => {
  const r = zerlege("Pfand: Foto/Kopie Ausweis\nZahlung: Bar/ PayPal\nLieferung plus Abholung: 40€ extra");
  assert.equal(r.pfand, "Foto/Kopie Ausweis");
  assert.equal(r.zahlung, "Bar/ PayPal");
  assert.deepEqual(r.lieferung, ["Lieferung plus Abholung: 40€ extra"]);
  assert.equal(r.absaetze.length, 0);
});

test("kein Pfand wird als solches vermerkt", () => {
  assert.equal(zerlege("kein Pfand notwendig").pfand, "kein Pfand");
});

test("eine Lieferzeile ohne Betrag bleibt Beschreibung", () => {
  const r = zerlege("Lieferung/Abholung jeden Tag des Jahres möglich.");
  assert.equal(r.lieferung.length, 0);
  assert.equal(r.absaetze.length, 1);
});

test("ein Beschreibungssatz geht nicht verloren, weil 'auf Rechnung' darin vorkommt", () => {
  // Das Muster fuer die allgemeinen Zusagen griff einmal mitten im Satz und
  // loeschte die halbe Produktbeschreibung.
  const satz =
    "Ich verkaufe gewerblich neue Bücherkartons für 2,20€ pro Stück auf Rechnung. " +
    "Sie sind sehr robust bis 50kg Tragkraft mit extra verstärkten Griffen und ideal zum Stapeln.";
  assert.deepEqual(zerlege(satz).absaetze, [satz]);
});

test("ein Preis mitten in einem langen Satz landet nicht in der Tabelle", () => {
  const r = zerlege(
    "Ich vermiete gewerblich eine Popkornmaschine für 50€ pro Veranstaltung, sie schafft 5kg Popcorn pro Stunde und ist leicht zu bedienen."
  );
  assert.equal(r.preise.length, 0);
  assert.equal(r.absaetze.length, 1);
});

test("technische Angaben landen bei den Daten", () => {
  const r = zerlege("Maße:\n\nLänge: 4m\nBreite: 4,30m");
  assert.deepEqual(r.daten, ["Länge: 4m", "Breite: 4,30m"]);
});

test("Merkmalslisten mit Aufzaehlungszeichen werden zur Liste", () => {
  const r = zerlege("* Robuste Wellpappe\n* Doppelter Boden\n* Belastbar bis 30 kg");
  assert.equal(r.daten.length, 3);
  assert.equal(r.daten[0], "Robuste Wellpappe");
  assert.equal(r.absaetze.length, 0);
});

test("Hinweise zur Mietdauer stehen getrennt von der Tabelle", () => {
  const r = zerlege("Längere Mietzeit individuelles Angebot.");
  assert.equal(r.preishinweis, "Längere Mietzeit individuelles Angebot.");
  assert.equal(r.absaetze.length, 0);
});

test("ein leerer Text bricht nichts", () => {
  const r = zerlege("");
  assert.deepEqual(r.absaetze, []);
  assert.deepEqual(r.preise, []);
  assert.equal(r.pfand, null);
});
