import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  parseAnzeige,
  dekodiereEntities,
  stripTags,
  extrahiereAnzeigenUrls,
} from "../lib/kleinanzeigen.mjs";

const HTML = fs.readFileSync(path.join(import.meta.dirname, "fixtures/anzeige.html"), "utf8");
const URL_ =
  "https://www.kleinanzeigen.de/s-anzeige/profi-sackkarre-mieten-250kg-tragkraft-auf-rechnung-lieferservice/2939428950-238-4266";

test("dekodiert HTML-Entities inklusive Umlauten und Euro", () => {
  assert.equal(dekodiereEntities("Gr&uuml;&szlig;e &amp; 15&euro;"), "Grüße & 15€");
  assert.equal(dekodiereEntities("&#x2764; &#8364;"), "❤ €");
});

test("entfernt Tags und wandelt <br> in Zeilenumbrueche", () => {
  assert.equal(stripTags("<p>Zeile eins<br>Zeile zwei</p>"), "Zeile eins\nZeile zwei");
});

test("liest die Kernfelder einer Anzeige", () => {
  const a = parseAnzeige(HTML, URL_);
  assert.equal(a.anzeigenId, "2939428950");
  assert.match(a.titel, /Sackkarre/);
  assert.match(a.preis, /15/);
  assert.match(a.ort, /Leipzig/);
  assert.ok(a.beschreibung.length > 300, `Beschreibung zu kurz: ${a.beschreibung.length}`);
  assert.match(a.kategorie, />/); // Breadcrumb mit mehreren Ebenen
});

test("sammelt Bild-URLs in grosser Aufloesung, ohne Dubletten", () => {
  const a = parseAnzeige(HTML, URL_);
  assert.ok(a.bildUrls.length >= 1, "keine Bilder gefunden");
  assert.equal(new Set(a.bildUrls).size, a.bildUrls.length, "Dubletten enthalten");
  for (const u of a.bildUrls) assert.match(u, /rule=\$_57\./);
});

test("liest Anzeigen-Adressen aus einer Bestandsliste, ohne Dubletten", () => {
  const html = `
    <a href="/s-anzeige/profi-sackkarre-mieten/2939428950-238-4266">Sackkarre</a>
    <a href="/s-anzeige/profi-sackkarre-mieten/2939428950-238-4266">nochmal dieselbe</a>
    <a href="/s-anzeige/bosch-linienlaser-mieten/3047127765-298-4266">Laser</a>
    <a href="/s-kategorie/umzug">keine Anzeige</a>`;
  const urls = extrahiereAnzeigenUrls(html);
  assert.equal(urls.length, 2);
  assert.equal(urls[0], "https://www.kleinanzeigen.de/s-anzeige/profi-sackkarre-mieten/2939428950-238-4266");
});

test("faellt bei fehlender Anzeigen-ID auf die URL zurueck", () => {
  const a = parseAnzeige("<html><body>leer</body></html>", URL_);
  assert.equal(a.anzeigenId, "2939428950");
});
