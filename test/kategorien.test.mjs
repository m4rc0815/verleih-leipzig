import test from "node:test";
import assert from "node:assert/strict";
import { kategorieFuer, KATEGORIEN } from "../lib/kategorien.mjs";

test("ordnet Umzugsartikel korrekt zu", () => {
  assert.equal(kategorieFuer("Profi Sackkarre mieten 250kg Tragkraft"), "Umzug & Transport");
  assert.equal(kategorieFuer("Neue Profi Umzugskartons 45kg/50kg robust"), "Umzug & Transport");
  assert.equal(kategorieFuer("Treppensteiger Sackkarre mieten"), "Umzug & Transport");
  assert.equal(kategorieFuer("Neue Bücherkartons Umzugskartons auf Rechnung"), "Umzug & Transport");
});

test("Werkzeug schlaegt das Wort Umzug im Titel", () => {
  // Falle: enthaelt "Umzug", ist aber Werkzeug
  assert.equal(
    kategorieFuer("Leistungsstarker Baustrahler MIETEN Umzug Beleuchtung Malern"),
    "Werkzeug & Reinigung"
  );
  assert.equal(kategorieFuer("Kärcher Profi Hochdruckreiniger HD 5/15 C Plus mieten"), "Werkzeug & Reinigung");
  assert.equal(kategorieFuer("Bosch Linienlaser Laser mieten Stativ"), "Werkzeug & Reinigung");
  assert.equal(kategorieFuer("Werzeug mieten Bohrmaschine Akkuschrauber Leiter"), "Werkzeug & Reinigung");
});

test("Foto & Technik erkennt Kameras und Beamer", () => {
  assert.equal(kategorieFuer("Polaroid Kamera mieten Sofortbildkamera"), "Foto & Technik");
  assert.equal(kategorieFuer("XXL Leinwand 100 Zoll+Beamer mieten"), "Foto & Technik");
  assert.equal(kategorieFuer("Playstation 5 Beamer JBL1000 mieten"), "Foto & Technik");
  assert.equal(kategorieFuer("Hochzeitsfotografie Fotograf Geburtstag"), "Foto & Technik");
});

test("Spiel & Spass erkennt Spielgeraete", () => {
  assert.equal(kategorieFuer("Leistungsstarkes Gebläse Hüpfburg mieten"), "Spiel & Spaß");
  assert.equal(kategorieFuer("Riesen XXXL Jenga 2,20m mieten Hochzeit"), "Spiel & Spaß");
  assert.equal(kategorieFuer("XXL 4- Gewinnt Holz Spielzeug mieten"), "Spiel & Spaß");
  assert.equal(kategorieFuer("SUP Board mieten Stand UP Paddlingboard"), "Spiel & Spaß");
  assert.equal(kategorieFuer("Schwungtuch mieten auf Rechnung"), "Spiel & Spaß");
});

test("alles Uebrige faellt auf Party & Feiern", () => {
  assert.equal(kategorieFuer("XXL Profi Zapfanlage MIETEN Hochzeit"), "Party & Feiern");
  assert.equal(kategorieFuer("Bierzeltgarnitur mieten mit Lehne Biertisch"), "Party & Feiern");
  assert.equal(kategorieFuer("Profi Nebelmaschine MIETEN inkl. LED Beleuchtung"), "Party & Feiern");
  assert.equal(kategorieFuer("Irgendwas völlig Unbekanntes"), "Party & Feiern");
});

test("KATEGORIEN listet alle fuenf in Anzeigereihenfolge", () => {
  assert.deepEqual(KATEGORIEN, [
    "Party & Feiern",
    "Umzug & Transport",
    "Spiel & Spaß",
    "Werkzeug & Reinigung",
    "Foto & Technik",
  ]);
});
