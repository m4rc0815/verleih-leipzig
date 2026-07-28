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
};

const QUALITAET = { kachel: 72, detail: 82 };

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
