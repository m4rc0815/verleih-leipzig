import test from "node:test";
import assert from "node:assert/strict";
import { ordneZu, ordnerName, titelFuerOrdner } from "../lib/drive-zuordnung.mjs";

test("bildet den Drive-Ordnernamen mit zweistelliger Nummer", () => {
  assert.equal(ordnerName(1, "Profi Sackkarre mieten"), "01 Profi Sackkarre mieten");
  assert.equal(ordnerName(22, "XXL Zapfanlage"), "22 XXL Zapfanlage");
});

test("ersetzt Schraegstriche im Titel, weil Ordnernamen keine enthalten koennen", () => {
  assert.equal(
    titelFuerOrdner("Profi Sackkarre auf Rechnung/Lieferservice"),
    "Profi Sackkarre auf Rechnung-Lieferservice"
  );
});

test("ordnet Ordner und Anzeigen ueber den Titel zu", () => {
  const anzeigen = [
    { slug: "sackkarre-1", titel: "Profi Sackkarre auf Rechnung/Lieferservice" },
    { slug: "nebel-2", titel: "Profi Nebelmaschine MIETEN" },
  ];
  const ordner = ["01 Profi Sackkarre auf Rechnung-Lieferservice", "02 Profi Nebelmaschine MIETEN"];
  const r = ordneZu(anzeigen, ordner);
  assert.equal(r.treffer.length, 2);
  assert.equal(r.ohneOrdner.length, 0);
  assert.equal(r.unbenutzt.length, 0);
  assert.equal(r.treffer[0].driveOrdner, "01 Profi Sackkarre auf Rechnung-Lieferservice");
});

test("verwechselt eine Zahl AM TITELANFANG nicht mit der Ordnungsnummer", () => {
  // Der echte Stolperstein: die Anzeige heisst "15 Bierzeltgarnituren…" und
  // liegt im Ordner "22 15 Bierzeltgarnituren…". Wird die Zahl auch im Titel
  // abgeschnitten, findet die Zuordnung nichts.
  const anzeigen = [{ slug: "bierzelt-1", titel: "15 Bierzeltgarnituren mieten mit Lieferservice" }];
  const ordner = ["22 15 Bierzeltgarnituren mieten mit Lieferservice"];
  const r = ordneZu(anzeigen, ordner);
  assert.equal(r.treffer.length, 1, "Zuordnung fehlgeschlagen");
  assert.equal(r.treffer[0].driveOrdner, "22 15 Bierzeltgarnituren mieten mit Lieferservice");
});

test("meldet Anzeigen ohne Ordner und Ordner ohne Anzeige getrennt", () => {
  const r = ordneZu([{ slug: "neu-9", titel: "Ganz neue Anzeige" }], ["07 Alter Ordner"]);
  assert.equal(r.treffer.length, 0);
  assert.equal(r.ohneOrdner.length, 1);
  assert.equal(r.unbenutzt.length, 1);
});

test("ignoriert Gross-/Kleinschreibung und doppelte Leerzeichen", () => {
  const r = ordneZu(
    [{ slug: "x-1", titel: "XXL  Profi   Zapfanlage MIETEN" }],
    ["04 xxl profi zapfanlage mieten"]
  );
  assert.equal(r.treffer.length, 1);
});
