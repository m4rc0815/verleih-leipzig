import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { erzeugeVarianten, erzeugeMotivbild, GROESSEN, webpName, motivName, istBild } from "../lib/bilder.mjs";

test("bildet den WebP-Namen unabhaengig von der Endung", () => {
  assert.equal(webpName("bild_01.jpg"), "bild_01.webp");
  assert.equal(webpName("bild_01.jpg", true), "bild_01-k.webp");
  assert.equal(webpName("Foto.JPEG"), "Foto.webp");
  assert.equal(webpName("skizze.png", true), "skizze-k.webp");
  assert.equal(webpName("IMG_4711.HEIC"), "IMG_4711.webp");
});

test("laesst Punkte im Dateinamen stehen", () => {
  assert.equal(webpName("bierzelt.2er.set.jpg"), "bierzelt.2er.set.webp");
});

test("bildet den Namen der Motivfassung", () => {
  assert.equal(motivName("bild_01.jpg"), "bild_01-m.webp");
  assert.equal(motivName("Foto.HEIC"), "Foto-m.webp");
});

test("das Motivbild ist immer 3:2, egal wie das Original liegt", async () => {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), "motiv-"));
  // Hochformat: genau der Fall, der in der Kachel vorher schiefging.
  const hoch = path.join(ordner, "hoch.jpg");
  await sharp({ create: { width: 900, height: 1200, channels: 3, background: "#4488cc" } })
    .jpeg().toFile(hoch);

  const { ziel } = await erzeugeMotivbild(hoch, ordner, "hoch");
  const m = await sharp(ziel).metadata();
  assert.equal(m.width, GROESSEN.motiv.breite);
  assert.equal(m.height, GROESSEN.motiv.hoehe);
  assert.equal((m.width / m.height).toFixed(2), "1.50");
  assert.equal(m.format, "webp");

  fs.rmSync(ordner, { recursive: true, force: true });
});

test("erkennt Bilddateien und ignoriert alles andere", () => {
  assert.ok(istBild("bild_01.jpg"));
  assert.ok(istBild("Foto.PNG"));
  assert.ok(istBild("neu.heic"));
  assert.equal(istBild("beschreibung.md"), false);
  assert.equal(istBild(".DS_Store"), false);
  assert.equal(istBild("Thumbs.db"), false);
});


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
