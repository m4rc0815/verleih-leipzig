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

test("alle Angebotskacheln sind gleich hoch", () => {
  // Gemessen im Raster: Kacheln mit einzeiligem Titel waren 373 px hoch, die
  // mit zweizeiligem 392 px. Die Begrenzung allein reicht nicht — ohne
  // min-height bleibt eine einzeilige Kachel flacher.
  const regel = css.match(/\.angebot-titel \{[^}]+\}/s);
  assert.ok(regel, "Regel .angebot-titel fehlt");
  assert.match(regel[0], /-webkit-line-clamp: 2/, "Titel nicht auf zwei Zeilen begrenzt");
  assert.match(regel[0], /min-height:/, "ohne min-height bleiben kurze Titel flacher");
});

test("die Galeriebuehne hat eine feste Hoehe", () => {
  // Ohne festes Verhaeltnis richtete sich die Hoehe nach dem gerade gezeigten
  // Bild. Bei 23 von 48 mehrbildrigen Anzeigen wechseln Hoch- und Querformat —
  // dort sprang beim Weiterklicken der halbe Seiteninhalt.
  const regel = css.match(/\.galerie-buehne \{[^}]+\}/s);
  assert.ok(regel, "Regel .galerie-buehne fehlt");
  assert.match(regel[0], /aspect-ratio:/, "kein festes Seitenverhaeltnis");
  assert.match(css, /\.galerie-buehne img \{[^}]*object-fit: contain/, "das Bild darf nicht beschnitten werden");
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
