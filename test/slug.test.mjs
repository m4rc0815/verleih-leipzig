import test from "node:test";
import assert from "node:assert/strict";
import { slugFuer } from "../lib/slug.mjs";

test("bildet kleingeschriebenen Bindestrich-Slug mit Anzeigen-ID", () => {
  assert.equal(
    slugFuer("Profi Sackkarre mieten 250kg Tragkraft", "2939428950"),
    "profi-sackkarre-mieten-250kg-tragkraft-2939428950"
  );
});

test("wandelt Umlaute lesbar um", () => {
  assert.equal(slugFuer("Hüpfburg mieten TÜV geprüft", "1"), "huepfburg-mieten-tuev-geprueft-1");
  assert.equal(slugFuer("Kärcher Nassreiniger", "2"), "kaercher-nassreiniger-2");
  assert.equal(slugFuer("Große Straße", "3"), "grosse-strasse-3");
});

test("entfernt Sonderzeichen und mehrfache Trenner", () => {
  assert.equal(slugFuer("XXL Profi Zapfanlage  MIETEN / Party!", "4"), "xxl-profi-zapfanlage-mieten-party-4");
  assert.equal(slugFuer("4- Gewinnt (Holz)", "5"), "4-gewinnt-holz-5");
});

test("kuerzt sehr lange Titel, haengt die ID aber immer an", () => {
  const lang =
    "Ein ausgesprochen langer Anzeigentitel der weit ueber jede sinnvolle Adresslaenge hinausgeht und immer weiter geht";
  const s = slugFuer(lang, "999");
  assert.ok(s.length <= 80, `Slug zu lang: ${s.length}`);
  assert.ok(s.endsWith("-999"), `ID fehlt: ${s}`);
});

test("unterscheidet gleichnamige Anzeigen ueber die ID", () => {
  const a = slugFuer("Neue Umzugskartons auf Rechnung", "111");
  const b = slugFuer("Neue Umzugskartons auf Rechnung", "222");
  assert.notEqual(a, b);
});
