// Prueft Eigenschaften des Stylesheets, die sonst nur im Browser auffallen.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const css = readFileSync(fileURLToPath(new URL("../assets/style.css", import.meta.url)), "utf8");

test("gefilterte Angebotskacheln verschwinden wirklich", () => {
  // filter.js setzt das hidden-Attribut. Weil .angebot-card auf display:flex
  // steht, ueberstimmt diese Regel das eingebaute Verhalten des Browsers —
  // ohne die eigene [hidden]-Regel bleiben gefilterte Kacheln sichtbar.
  assert.match(
    css,
    /\.angebot-card\[hidden\]\s*\{\s*display:\s*none/,
    "Regel .angebot-card[hidden] { display: none } fehlt"
  );
});

test("die Handy-Regeln gelten nur unterhalb von 700 px", () => {
  const block = css.slice(css.indexOf("=== Handy-Fassung"));
  assert.ok(block.length > 500, "Der Handy-Block wurde nicht gefunden");
  assert.match(block, /@media \(max-width: 700px\)/);
  // Ausserhalb der Media Query duerfen nur die beiden Ausblend-Regeln stehen,
  // sonst faerbt die Handy-Fassung auf den Desktop ab.
  const vorDerQuery = block.slice(0, block.indexOf("@media"));
  assert.doesNotMatch(vorDerQuery, /\.hero-title-xl|\.zusagen-reihe|\.kat-raster|\.f-zeile\s*\{/);
});

test("die Umsortierung greift nur auf der Startseite", () => {
  // Ohne die Einschraenkung rutscht auf den Kategorieseiten der Abschnitt
  // "Andere Kategorien" vor die Angebote.
  const orderRegeln = css.match(/^\s*(body[^{]*)?main > [^{]+\{\s*order:/gm) || [];
  assert.ok(orderRegeln.length > 0, "keine order-Regeln gefunden");
  for (const r of orderRegeln) {
    assert.match(r, /body\.seite-start/, `order-Regel ohne Startseiten-Bezug: ${r.trim()}`);
  }
});
