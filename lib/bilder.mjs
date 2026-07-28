// Erzeugt aus einem Originalbild die beiden WebP-Fassungen der Seite:
// eine kleine fuer die Kachel der Startseite, eine grosse fuer die Detailansicht.
//
// WebP statt JPG, weil es bei gleicher Wahrnehmungsqualitaet rund 30 % kleiner
// ausfaellt — bei 283 Bildern macht das den Unterschied zwischen ~57 MB und ~20 MB.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

export const GROESSEN = {
  kachel: 500, // laengste Kante der Kachelfassung
  detail: 1200, // laengste Kante der Detailfassung
  motiv: { breite: 720, hoehe: 480 }, // Kategorie-Kachel, fest 3:2
};

const QUALITAET = { kachel: 72, detail: 82, motiv: 78 };

// Welche Dateien im Bildordner ueberhaupt Bilder sind. Wichtig, seit Google
// Drive die Quelle ist: dort landen sonst .DS_Store, Thumbs.db oder Notizen mit.
const BILDENDUNGEN = /\.(jpe?g|png|webp|heic|heif|avif|gif|tiff?)$/i;

export function istBild(dateiname) {
  return BILDENDUNGEN.test(String(dateiname || ""));
}

// Name der WebP-Fassung zu einer Bilddatei. Ersetzt die letzte Endung — egal
// welche —, damit auch ein aus Drive nachgelegtes PNG oder HEIC richtig heisst.
export function webpName(dateiname, klein = false) {
  const ohneEndung = String(dateiname || "").replace(/\.[^.]+$/, "");
  return `${ohneEndung}${klein ? "-k" : ""}.webp`;
}

// Name der Motivfassung fuer die Kategorie-Kacheln.
export function motivName(dateiname) {
  return `${String(dateiname || "").replace(/\.[^.]+$/, "")}-m.webp`;
}

// Bild fuer eine Kategorie-Kachel: fest auf 3:2 zugeschnitten, und zwar dort,
// wo das Motiv sitzt.
//
// Vorher schnitt allein das CSS zu, immer oben ansetzend. Bei Roberts
// Hochformat-Aufnahmen landete dann Wand oder Zimmertuer in der Kachel statt
// des Geraets, waehrend die Querformat-Motive vollstaendig zu sehen waren —
// nebeneinander wirkte das zusammengewuerfelt. sharps "attention" sucht den
// Bildbereich mit den meisten Kanten und Farben, also in aller Regel den
// Gegenstand.
export async function erzeugeMotivbild(eingabe, zielOrdner, basisname) {
  fs.mkdirSync(zielOrdner, { recursive: true });
  const ziel = path.join(zielOrdner, `${basisname}-m.webp`);
  await sharp(eingabe)
    .rotate()
    .resize(GROESSEN.motiv.breite, GROESSEN.motiv.hoehe, {
      fit: "cover",
      position: sharp.strategy.attention,
    })
    .webp({ quality: QUALITAET.motiv })
    .toFile(ziel);
  return { ziel, bytes: fs.statSync(ziel).size };
}

export async function erzeugeVarianten(eingabe, zielOrdner, basisname) {
  fs.mkdirSync(zielOrdner, { recursive: true });

  const kachel = path.join(zielOrdner, `${basisname}-k.webp`);
  const detail = path.join(zielOrdner, `${basisname}.webp`);

  // withoutEnlargement: kleine Originale werden nicht kuenstlich hochgerechnet.
  await sharp(eingabe)
    .rotate() // EXIF-Ausrichtung anwenden, sonst liegen Hochformate quer
    .resize({ width: GROESSEN.kachel, height: GROESSEN.kachel, fit: "inside", withoutEnlargement: true })
    .webp({ quality: QUALITAET.kachel })
    .toFile(kachel);

  await sharp(eingabe)
    .rotate()
    .resize({ width: GROESSEN.detail, height: GROESSEN.detail, fit: "inside", withoutEnlargement: true })
    .webp({ quality: QUALITAET.detail })
    .toFile(detail);

  const bytes = fs.statSync(kachel).size + fs.statSync(detail).size;
  return { kachel, detail, bytes };
}
