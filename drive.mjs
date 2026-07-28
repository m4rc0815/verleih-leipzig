// Abgleich der Bilder mit Google Drive.
//
// Google Drive ist die fuehrende Ablage ("Master"): Was dort in einem
// Anzeigenordner liegt, steht auf der Homepage. Ein dort geloeschtes Bild
// verschwindet beim naechsten Bau, ein neu abgelegtes erscheint.
//
//   npm run pull    Drive -> lokal  (holt Aenderungen, uebernimmt Loeschungen)
//   npm run push    lokal -> Drive  (nach `npm run sync`, damit Neues ankommt)
//   npm run drive-check          nur vergleichen, nichts aendern
//
// Die Ordnernamen unterscheiden sich zwischen beiden Seiten: In Drive heissen
// sie "NN Titel" (durchnummeriert, aus dem urspruenglichen Archiv gewachsen),
// lokal nach dem Slug, weil daraus die Adressen der Detailseiten entstehen.
// lib/drive-zuordnung.mjs uebersetzt zwischen beidem.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import * as cfg from "./config.mjs";
import { ordneZu } from "./lib/drive-zuordnung.mjs";
import { istBild } from "./lib/bilder.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BILDER = path.join(__dirname, cfg.BILDER.ordner);
const REMOTE = "gdrive:Claude/Robert";

// Unterhalb dieses Anteils bricht pull ab: schuetzt davor, dass ein halb
// hochgeladener oder falsch benannter Drive-Ordner die lokalen Bilder ausloescht.
const MIN_ANTEIL = 0.5;

function rclone(args, { still = false } = {}) {
  return execFileSync("rclone", args, {
    encoding: "utf8",
    stdio: still ? ["ignore", "pipe", "ignore"] : ["ignore", "pipe", "inherit"],
    maxBuffer: 32 * 1024 * 1024,
  });
}

function driveOrdnerListe() {
  return rclone(["lsf", REMOTE, "--dirs-only"], { still: true })
    .split("\n")
    .map((z) => z.replace(/\/$/, "").trim())
    .filter(Boolean)
    .filter((n) => n !== "homepage-originale-1200px"); // Zwischenablage, wird nicht mehr gebraucht
}

// Name -> Groesse. Die Groesse muss mit verglichen werden, nicht nur die Anzahl:
// Sonst gilt ein Ordner als gleich, obwohl dort noch die kleinen Bilder aus dem
// alten Archiv liegen — gleiche Dateinamen, gleiche Anzahl, anderer Inhalt.
function dateienLokal(slug) {
  const ordner = path.join(BILDER, slug);
  const map = new Map();
  if (!fs.existsSync(ordner)) return map;
  for (const f of fs.readdirSync(ordner).filter(istBild)) {
    map.set(f, fs.statSync(path.join(ordner, f)).size);
  }
  return map;
}

function dateienDrive(driveOrdner) {
  const map = new Map();
  try {
    // "sp" = Groesse und Pfad, durch ";" getrennt
    const roh = rclone(["lsf", `${REMOTE}/${driveOrdner}`, "--format", "sp", "--separator", ";"], {
      still: true,
    });
    for (const zeile of roh.split("\n")) {
      const [groesse, name] = zeile.split(";");
      if (name && istBild(name.trim())) map.set(name.trim(), Number(groesse));
    }
  } catch {
    /* Ordner fehlt in Drive */
  }
  return map;
}

function unterschied(lokal, drive) {
  if (lokal.size !== drive.size) return true;
  for (const [name, groesse] of lokal) {
    if (!drive.has(name) || drive.get(name) !== groesse) return true;
  }
  return false;
}

function zuordnung() {
  const daten = JSON.parse(fs.readFileSync(path.join(__dirname, "content/anzeigen.json"), "utf8"));
  const r = ordneZu(daten.anzeigen, driveOrdnerListe());
  if (r.ohneOrdner.length || r.unbenutzt.length) {
    console.warn(`\n⚠ Zuordnung unvollständig:`);
    for (const a of r.ohneOrdner) console.warn(`  Anzeige ohne Drive-Ordner: ${a.titel}`);
    for (const o of r.unbenutzt) console.warn(`  Drive-Ordner ohne Anzeige : ${o}`);
    console.warn("");
  }
  return r.treffer;
}

const befehl = process.argv[2] || "check";
const paare = zuordnung();
let lokalGesamt = 0;
let driveGesamt = 0;
const abweichungen = [];

let bytesLokal = 0;
let bytesDrive = 0;
for (const p of paare) {
  const l = dateienLokal(p.slug);
  const d = dateienDrive(p.driveOrdner);
  lokalGesamt += l.size;
  driveGesamt += d.size;
  for (const g of l.values()) bytesLokal += g;
  for (const g of d.values()) bytesDrive += g;
  if (unterschied(l, d)) abweichungen.push({ ...p, lokal: l.size, drive: d.size });
}

const mb = (b) => (b / 1048576).toFixed(1);
console.log(
  `Anzeigen: ${paare.length} · Bilder lokal: ${lokalGesamt} (${mb(bytesLokal)} MB) · ` +
    `in Drive: ${driveGesamt} (${mb(bytesDrive)} MB)`
);

if (befehl === "check") {
  if (!abweichungen.length) {
    console.log("✓ Kein Unterschied.");
  } else {
    console.log(`\n${abweichungen.length} Ordner unterscheiden sich:`);
    for (const a of abweichungen) {
      console.log(`  ${a.driveOrdner}: lokal ${a.lokal} · Drive ${a.drive}`);
    }
    console.log("\n→ npm run pull  übernimmt den Stand aus Drive");
    console.log("→ npm run push  überträgt den lokalen Stand nach Drive");
  }
  process.exit(0);
}

if (befehl === "pull") {
  if (driveGesamt === 0) {
    console.error(`\nABBRUCH: In Drive liegen keine Bilder. Stimmt der Pfad ${REMOTE}?`);
    process.exit(1);
  }
  if (lokalGesamt > 0 && driveGesamt / lokalGesamt < MIN_ANTEIL) {
    console.error(
      `\nABBRUCH: Drive hat nur ${driveGesamt} von ${lokalGesamt} Bildern ` +
        `(unter ${MIN_ANTEIL * 100} %).\n` +
        `Das sieht nach einem unvollständigen Ordner aus, nicht nach einer gewollten Löschung.\n` +
        `Wenn du wirklich so viele Bilder entfernt hast, lösche sie auch lokal von Hand.`
    );
    process.exit(1);
  }
  if (!abweichungen.length) {
    console.log("✓ Nichts zu holen, alles gleich.");
    process.exit(0);
  }
  for (const a of abweichungen) {
    console.log(`  ← ${a.driveOrdner} (${a.drive} Bilder)`);
    // --exclude *.md: die beschreibung.md aus dem Archiv bleibt in Drive liegen.
    rclone(["sync", `${REMOTE}/${a.driveOrdner}`, path.join(BILDER, a.slug), "--exclude", "*.md"], {
      still: true,
    });
  }
  console.log(`\n✓ ${abweichungen.length} Ordner aktualisiert. Jetzt "npm run build" ausführen.`);
  process.exit(0);
}

if (befehl === "push") {
  if (!abweichungen.length) {
    console.log("✓ Nichts zu übertragen, alles gleich.");
    process.exit(0);
  }
  for (const a of abweichungen) {
    console.log(`  → ${a.driveOrdner} (${a.lokal} Bilder)`);
    rclone(["sync", path.join(BILDER, a.slug), `${REMOTE}/${a.driveOrdner}`, "--exclude", "*.md"], {
      still: true,
    });
  }
  console.log(`\n✓ ${abweichungen.length} Ordner in Drive aktualisiert.`);
  process.exit(0);
}

console.error(`Unbekannter Befehl "${befehl}". Erlaubt: pull, push, check`);
process.exit(1);
