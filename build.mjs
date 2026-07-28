// Baut docs/ aus content/. docs/ ist reiner Bauausgang und wird vorher geleert,
// damit entfernte Anzeigen keine verwaisten Seiten hinterlassen.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { webcrypto as wc } from "node:crypto";
import * as cfg from "./config.mjs";
import * as T from "./templates/layout.mjs";
import { deriveKey, encryptPage, gatePage, zugangsGeheimnis } from "./crypt.mjs";
import { erzeugeVarianten } from "./lib/bilder.mjs";
import { findeBezuege } from "./lib/pruefliste.mjs";
import { KATEGORIEN } from "./lib/kategorien.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS = path.join(__dirname, "docs");
const ASSETS = path.join(__dirname, "assets");
const CONTENT = path.join(__dirname, "content");

// Sicherung: Eine gewerbliche Seite darf nicht ohne Impressum oeffentlich gehen.
if (!cfg.GATE.enabled) {
  const fehlend = ["strasse", "plzOrt"].filter((f) => !String(cfg.KONTAKT[f] || "").trim());
  if (fehlend.length) {
    console.error(
      `\nABBRUCH: Der Passwortschutz ist aus (config.mjs → GATE.enabled = false),\n` +
        `aber im Impressum fehlen noch: ${fehlend.join(", ")}.\n` +
        `Eine gewerbliche Seite ohne vollstaendiges Impressum darf nicht oeffentlich sein.\n` +
        `→ KONTAKT in config.mjs fuellen ODER GATE.enabled wieder auf true setzen.\n`
    );
    process.exit(1);
  }
}

const daten = JSON.parse(fs.readFileSync(path.join(CONTENT, "anzeigen.json"), "utf8"));
const anzeigen = daten.anzeigen;
if (!anzeigen.length) {
  console.error("ABBRUCH: content/anzeigen.json enthaelt keine Anzeigen. Erst `npm run sync` laufen lassen.");
  process.exit(1);
}

fs.rmSync(DOCS, { recursive: true, force: true });
fs.mkdirSync(DOCS, { recursive: true });

// --- Bilder: aus jedem Original die beiden WebP-Fassungen ------------------
let bilderErzeugt = 0;
let bytesGesamt = 0;
for (const a of anzeigen) {
  const quelle = path.join(__dirname, cfg.BILDER.ordner, a.slug);
  const ziel = path.join(DOCS, "bilder", a.slug);
  for (const b of a.bilder) {
    const eingabe = path.join(quelle, b);
    if (!fs.existsSync(eingabe)) {
      console.warn(`  ! Bild fehlt: ${a.slug}/${b}`);
      continue;
    }
    const { bytes } = await erzeugeVarianten(eingabe, ziel, b.replace(/\.jpg$/, ""));
    bilderErzeugt++;
    bytesGesamt += bytes;
  }
}

// --- Seiten ----------------------------------------------------------------
const seiten = []; // gepuffert → am Ende offen oder verschluesselt geschrieben
function schreibeSeite(pfad, html) {
  seiten.push({ pfad, html });
}

// Startseite
const filterleiste = `<div class="filterleiste">
  ${KATEGORIEN.map((k) => `<button type="button" class="f-kat" data-kategorie="${k}">${k}</button>`).join("\n  ")}
  <input type="search" id="f-suche" class="f-suche" placeholder="Suchen…" aria-label="Angebote durchsuchen">
  <select id="f-sort" aria-label="Sortierung">
    <option value="titel">A–Z</option>
    <option value="preis-auf">Preis aufsteigend</option>
    <option value="preis-ab">Preis absteigend</option>
  </select>
</div>
<p class="f-zaehler" id="f-zaehler"></p>`;

schreibeSeite(
  path.join(DOCS, "index.html"),
  T.documentShell({
    title: `${cfg.SITE.projectName} — ${cfg.SITE.tagline}`,
    relRoot: "",
    active: "start",
    hero: T.simpleHero({
      eyebrow: cfg.SITE.projectName,
      title: cfg.SITE.tagline,
      meta: `${anzeigen.length} Angebote · ${cfg.SITE.ort}`,
    }),
    content: `<div class="container">
      ${filterleiste}
      <div class="angebot-grid" id="angebot-grid">
        ${anzeigen.map((a) => T.kachel(a, "")).join("\n")}
      </div>
      <p id="f-leer" hidden>Keine Angebote gefunden.</p>
    </div>`,
    scripts: ["assets/filter.js"],
  })
);

// Detailseiten
for (const a of anzeigen) {
  schreibeSeite(
    path.join(DOCS, "a", a.slug, "index.html"),
    T.documentShell({
      title: `${a.titel} — ${cfg.SITE.projectName}`,
      relRoot: "../../",
      active: "start",
      content: T.detailSeite(a, "../../", {
        anzeigenLink: cfg.ANZEIGEN_LINK.enabled,
        anzeigenLinkLabel: cfg.ANZEIGEN_LINK.label,
      }),
      scripts: ["assets/lightbox.js"],
    })
  );
}

// --- Beiwerk ---------------------------------------------------------------
const assetsOut = path.join(DOCS, "assets");
fs.mkdirSync(assetsOut, { recursive: true });
for (const f of fs.readdirSync(ASSETS)) {
  fs.copyFileSync(path.join(ASSETS, f), path.join(assetsOut, f));
}
fs.writeFileSync(path.join(DOCS, ".nojekyll"), "");

// --- Zugangsdaten und Salz -------------------------------------------------
function leseZugang() {
  const envU = (process.env.SITE_USER || "").trim();
  const envP = (process.env.SITE_PASSWORD || "").trim();
  if (envU && envP) return { benutzer: envU, passwort: envP };

  const datei = path.join(__dirname, cfg.GATE.credentialsFile);
  if (fs.existsSync(datei)) {
    const zeilen = fs.readFileSync(datei, "utf8").split("\n").map((z) => z.trim()).filter(Boolean);
    if (zeilen.length >= 2) return { benutzer: zeilen[0], passwort: zeilen[1] };
    throw new Error(
      `"${cfg.GATE.credentialsFile}" braucht zwei Zeilen: Zeile 1 Benutzername, Zeile 2 Passwort.`
    );
  }
  throw new Error(
    `Passwortschutz ist an (config.mjs → GATE.enabled), aber es gibt keine Zugangsdaten.\n` +
      `→ Datei "${cfg.GATE.credentialsFile}" anlegen (Zeile 1 Benutzername, Zeile 2 Passwort)\n` +
      `  ODER SITE_USER und SITE_PASSWORD als Umgebungsvariablen setzen.`
  );
}

function ladeOderErzeugeSalz() {
  const datei = path.join(__dirname, cfg.GATE.metaFile);
  if (fs.existsSync(datei)) {
    const m = JSON.parse(fs.readFileSync(datei, "utf8"));
    if (m.salt && m.iterations) return m;
  }
  const meta = {
    salt: Buffer.from(wc.getRandomValues(new Uint8Array(16))).toString("base64"),
    iterations: cfg.GATE.iterations,
  };
  fs.writeFileSync(datei, JSON.stringify(meta, null, 2) + "\n");
  return meta;
}

const relRootFuer = (p) => {
  const rel = path.relative(DOCS, path.dirname(p));
  return !rel || rel === "." ? "" : rel.split(path.sep).map(() => "..").join("/") + "/";
};

let verschluesselt = 0;
if (cfg.GATE.enabled) {
  const { benutzer, passwort } = leseZugang();
  const meta = ladeOderErzeugeSalz();
  const key = await deriveKey(zugangsGeheimnis(benutzer, passwort), meta.salt, meta.iterations);
  for (const s of seiten) {
    const id = path.relative(DOCS, s.pfad).split(path.sep).join("/");
    const { iv, ct } = await encryptPage(s.html, key, meta.salt, id);
    fs.mkdirSync(path.dirname(s.pfad), { recursive: true });
    fs.writeFileSync(
      s.pfad,
      gatePage({ relRoot: relRootFuer(s.pfad), salt: meta.salt, iterations: meta.iterations, iv, ct })
    );
    verschluesselt++;
  }
} else {
  for (const s of seiten) {
    fs.mkdirSync(path.dirname(s.pfad), { recursive: true });
    fs.writeFileSync(s.pfad, s.html);
  }
}

// --- Bericht ---------------------------------------------------------------
const bezuege = anzeigen
  .map((a) => ({ titel: a.titel, slug: a.slug, treffer: findeBezuege(a.beschreibung) }))
  .filter((e) => e.treffer.length);

fs.writeFileSync(
  path.join(__dirname, "pruefliste.md"),
  `# Prüfliste: Textstellen mit Kleinanzeigen-Bezug\n\n` +
    `Stand: ${daten.abgerufen} · ${bezuege.length} von ${anzeigen.length} Anzeigen betroffen\n\n` +
    `Diese Formulierungen stammen aus den Kleinanzeigen-Texten und klingen auf einer\n` +
    `eigenen Homepage schief. Vor dem Öffentlichgehen mit Robert durchgehen.\n\n` +
    bezuege
      .map(
        (e) =>
          `## ${e.titel}\n\`a/${e.slug}/\`\n\n` +
          e.treffer.map((t) => `- Zeile ${t.nr}: „${t.zeile}"`).join("\n")
      )
      .join("\n\n") +
    "\n"
);

const kat = {};
for (const a of anzeigen) kat[a.kategorie] = (kat[a.kategorie] || 0) + 1;

console.log("\n── Bau-Bericht ───────────────────────────");
console.log(`Seiten            : ${seiten.length} (1 Start + ${anzeigen.length} Angebote)`);
console.log(`Bilder umgewandelt: ${bilderErzeugt} → ${(bytesGesamt / 1048576).toFixed(1)} MB WebP`);
console.log(`Kategorien        : ${Object.entries(kat).map(([k, n]) => `${k} ${n}`).join(" · ")}`);
console.log(`Passwortschutz    : ${cfg.GATE.enabled ? `AN — ${verschluesselt} Seiten verschlüsselt` : "AUS — Seiten offen"}`);
console.log(`Kleinanzeigen-Link: ${cfg.ANZEIGEN_LINK.enabled ? "AN" : "AUS"}`);
console.log(`Prüfliste         : ${bezuege.length} Anzeigen mit Bezug → pruefliste.md`);
if (!cfg.KONTAKT.telefon && !cfg.KONTAKT.email) {
  console.log(`\n⚠ Kontaktdaten fehlen noch (config.mjs → KONTAKT).`);
}
console.log("──────────────────────────────────────────\n");
