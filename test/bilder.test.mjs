import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { erzeugeVarianten, GROESSEN } from "../lib/bilder.mjs";

async function testbild(breite, hoehe) {
  return sharp({
    create: { width: breite, height: hoehe, channels: 3, background: { r: 200, g: 120, b: 60 } },
  })
    .jpeg()
    .toBuffer();
}

test("erzeugt Kachel- und Detailfassung als WebP", async () => {
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), "bilder-"));
  const ergebnis = await erzeugeVarianten(await testbild(1200, 1600), ziel, "bild_01");

  assert.ok(fs.existsSync(ergebnis.kachel), "Kachel fehlt");
  assert.ok(fs.existsSync(ergebnis.detail), "Detailbild fehlt");
  assert.match(ergebnis.kachel, /\.webp$/);
  assert.match(ergebnis.detail, /\.webp$/);

  const k = await sharp(ergebnis.kachel).metadata();
  const d = await sharp(ergebnis.detail).metadata();
  assert.equal(k.format, "webp");
  assert.equal(d.format, "webp");
  assert.ok(Math.max(k.width, k.height) <= GROESSEN.kachel, `Kachel zu gross: ${k.width}x${k.height}`);
  assert.ok(Math.max(d.width, d.height) <= GROESSEN.detail, `Detail zu gross: ${d.width}x${d.height}`);
});

test("behaelt das Seitenverhaeltnis bei", async () => {
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), "bilder-"));
  const ergebnis = await erzeugeVarianten(await testbild(1200, 1600), ziel, "hoch");
  const d = await sharp(ergebnis.detail).metadata();
  assert.ok(Math.abs(d.width / d.height - 0.75) < 0.02, `Verhaeltnis verzerrt: ${d.width}x${d.height}`);
});

test("vergroessert kleine Bilder nicht", async () => {
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), "bilder-"));
  const ergebnis = await erzeugeVarianten(await testbild(300, 400), ziel, "klein");
  const d = await sharp(ergebnis.detail).metadata();
  assert.equal(d.width, 300, "wurde hochskaliert");
});

test("liefert die Dateigroessen zurueck", async () => {
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), "bilder-"));
  const ergebnis = await erzeugeVarianten(await testbild(1200, 1600), ziel, "bild_01");
  assert.ok(ergebnis.bytes > 0);
});
