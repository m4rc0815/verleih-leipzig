import test from "node:test";
import assert from "node:assert/strict";
import { findeBezuege } from "../lib/pruefliste.mjs";

test("findet Verweise auf andere Anzeigen", () => {
  const treffer = findeBezuege("Viele weitere Sachen zur Vermietung findet ihr in meinen anderen Anzeigen.");
  assert.equal(treffer.length, 1);
  assert.match(treffer[0].zeile, /anderen Anzeigen/);
  assert.equal(treffer[0].nr, 1);
});

test("findet Verweise auf die eigene Kleinanzeigen-Seite", () => {
  const treffer = findeBezuege("Herzlich willkommen auf meiner Seite :)");
  assert.equal(treffer.length, 1);
});

test("meldet die richtige Zeilennummer", () => {
  const text = "Zeile eins\nZeile zwei\nWeitere Sackkarren findet ihr auf meiner Seite.\nZeile vier";
  const treffer = findeBezuege(text);
  assert.equal(treffer.length, 1);
  assert.equal(treffer[0].nr, 3);
});

test("findet mehrere Stellen im selben Text", () => {
  const text = "Willkommen auf meiner Seite\nProduktinfo\nMehr in meinen anderen Anzeigen";
  assert.equal(findeBezuege(text).length, 2);
});

test("meldet unauffaelligen Text nicht", () => {
  assert.deepEqual(findeBezuege("Robuste Sackkarre bis 250 kg. Zahlung bar oder PayPal."), []);
});
