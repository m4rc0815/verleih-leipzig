// Baut docs/ aus content/. docs/ ist reiner Bauausgang und wird vorher geleert,
// damit entfernte Anzeigen keine verwaisten Seiten hinterlassen.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { webcrypto as wc } from "node:crypto";
import * as cfg from "./config.mjs";
import * as T from "./templates/layout.mjs";
import { deriveKey, encryptPage, gatePage, zugangsGeheimnis } from "./crypt.mjs";
import { erzeugeVarianten, istBild, webpName } from "./lib/bilder.mjs";
import { findeBezuege } from "./lib/pruefliste.mjs";
import { KATEGORIEN } from "./lib/kategorien.mjs";
import { kategorieSlug } from "./lib/slug.mjs";

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

// --- Bildliste: der Ordner ist die Wahrheit, nicht anzeigen.json -----------
// Google Drive ist die fuehrende Ablage fuer die Bilder. Deshalb zaehlt, was
// nach `npm run pull` tatsaechlich im Ordner liegt — ein dort geloeschtes Bild
// verschwindet damit von der Seite, ein neu abgelegtes erscheint, ohne dass
// jemand eine Liste pflegen muss. anzeigen.json liefert nur noch die Texte.
function bilderImOrdner(slug) {
  const ordner = path.join(__dirname, cfg.BILDER.ordner, slug);
  if (!fs.existsSync(ordner)) return [];
  return fs
    .readdirSync(ordner)
    .filter(istBild)
    .sort((a, b) => a.localeCompare(b, "de", { numeric: true }));
}

const bildAenderungen = [];
for (const a of anzeigen) {
  const vorher = a.bilder || [];
  const jetzt = bilderImOrdner(a.slug);
  if (vorher.length !== jetzt.length) {
    bildAenderungen.push({ titel: a.titel, vorher: vorher.length, jetzt: jetzt.length });
  }
  a.bilder = jetzt;
}

const ohneBild = anzeigen.filter((a) => !a.bilder.length);

// --- Bilder: aus jedem Original die beiden WebP-Fassungen ------------------
let bilderErzeugt = 0;
let bytesGesamt = 0;
for (const a of anzeigen) {
  const quelle = path.join(__dirname, cfg.BILDER.ordner, a.slug);
  const ziel = path.join(DOCS, "bilder", a.slug);
  for (const b of a.bilder) {
    const { bytes } = await erzeugeVarianten(path.join(quelle, b), ziel, webpName(b).replace(/\.webp$/, ""));
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
const start = T.startSeite(anzeigen, cfg);

schreibeSeite(
  path.join(DOCS, "index.html"),
  T.documentShell({
    title: `${cfg.SITE.projectName} — ${cfg.SITE.tagline}`,
    relRoot: "",
    active: "start",
    // Die Handy-Fassung sortiert nur auf der Startseite um (Vorstellung unter
    // die Angebote) — die Klasse grenzt das ab.
    bodyClass: "seite-start",
    hero: start.hero,
    content: start.content,
    scripts: ["assets/filter.js"],
  })
);

// Kategorieseiten: eine je Kategorie, damit jede eine eigene Adresse hat und
// der Bestand uebersichtlich bleibt, wenn er weiter waechst.
for (const kat of KATEGORIEN) {
  const seite = T.kategorieSeite(kat, anzeigen, cfg, "../../");
  if (!seite.anzahl) continue; // leere Kategorie bekommt keine Seite
  schreibeSeite(
    path.join(DOCS, "k", kategorieSlug(kat), "index.html"),
    T.documentShell({
      title: `${kat} mieten in ${cfg.SITE.ort} — ${cfg.SITE.projectName}`,
      relRoot: "../../",
      active: "kategorien",
      aktiveKategorie: kat,
      hero: seite.hero,
      content: seite.content,
      scripts: ["assets/filter.js"],
    })
  );
}

// Detailseiten
for (const a of anzeigen) {
  schreibeSeite(
    path.join(DOCS, "a", a.slug, "index.html"),
    T.documentShell({
      title: `${a.titel} — ${cfg.SITE.projectName}`,
      relRoot: "../../",
      active: "start",
      aktiveKategorie: a.kategorie,
      content: T.detailSeite(a, "../../", {
        anzeigenLink: cfg.ANZEIGEN_LINK.enabled,
        anzeigenLinkLabel: cfg.ANZEIGEN_LINK.label,
      }),
      // Auf dem Handy steht die Anfrage neben dem Anruf im festen Balken.
      balkenExtra: cfg.ANZEIGEN_LINK.enabled
        ? `<a class="hb-knopf hb-anfrage" href="${a.url}" target="_blank" rel="noopener noreferrer">Anfragen</a>`
        : "",
      scripts: ["assets/lightbox.js"],
    })
  );
}

// --- Kontakt, Impressum, Datenschutz --------------------------------------
// Fehlende Angaben werden als deutlicher Hinweis dargestellt statt still
// weggelassen — sonst faellt vor dem Oeffentlichgehen niemandem auf, dass sie fehlen.
const k = cfg.KONTAKT;
const fehltHinweis = (was) =>
  `<div class="fehlt-hinweis"><strong>Fehlt noch:</strong> ${was} — einzutragen in <code>config.mjs</code> unter <code>KONTAKT</code>.</div>`;
const fehlt = (wert, was) => (String(wert || "").trim() ? `<p>${wert}</p>` : fehltHinweis(was));

// Telefon und E-Mail als anklickbare Links: auf dem Handy startet das direkt den
// Anruf bzw. die Mail. Fuer tel: wird die fuehrende 0 durch +49 ersetzt, sonst
// scheitert die Wahl aus dem Ausland.
const telefonZeile = (nr, was) =>
  String(nr || "").trim()
    ? `<p><a href="tel:${String(nr).replace(/\D/g, "").replace(/^0/, "+49")}">${nr}</a></p>`
    : fehltHinweis(was);
const mailZeile = (adr, was) =>
  String(adr || "").trim() ? `<p><a href="mailto:${adr}">${adr}</a></p>` : fehltHinweis(was);

schreibeSeite(
  path.join(DOCS, "kontakt.html"),
  T.documentShell({
    title: `Kontakt — ${cfg.SITE.projectName}`,
    relRoot: "",
    active: "kontakt",
    content: `<div class="container prose">
      <h1>Kontakt</h1>
      <p><strong>${k.name}</strong></p>
      ${telefonZeile(k.telefon, "Telefonnummer")}
      ${mailZeile(k.email, "E-Mail-Adresse")}
      ${fehlt(k.strasse, "Straße und Hausnummer")}
      ${fehlt(k.plzOrt, "Postleitzahl und Ort")}
      <h2>Erreichbarkeit</h2>
      <p>${k.zeiten || "Mo–So 7:00–23:00 Uhr"} — auch sonntags und feiertags.</p>
      ${
        cfg.ANZEIGEN_LINK.enabled
          ? `<p>Anfragen laufen derzeit auch über die jeweilige Anzeige. Auf jeder Angebotsseite findest du dafür einen Knopf.</p>`
          : ""
      }
    </div>`,
  })
);

schreibeSeite(
  path.join(DOCS, "impressum.html"),
  T.documentShell({
    title: `Impressum — ${cfg.SITE.projectName}`,
    relRoot: "",
    active: "impressum",
    content: `<div class="container prose">
      <h1>Impressum</h1>
      <h2>Angaben gemäß § 5 DDG</h2>
      <p><strong>${k.name}</strong></p>
      ${fehlt(k.strasse, "Straße und Hausnummer")}
      ${fehlt(k.plzOrt, "Postleitzahl und Ort")}
      <h2>Kontakt</h2>
      ${telefonZeile(k.telefon, "Telefonnummer")}
      ${mailZeile(k.email, "E-Mail-Adresse")}
      <h2>Umsatzsteuer-Identifikationsnummer</h2>
      ${fehlt(k.ustId, "USt-IdNr. (entfällt bei Kleinunternehmerregelung — dann hier vermerken)")}
      <h2>Verantwortlich für den Inhalt</h2>
      <p>${k.name}${k.plzOrt ? `, ${k.plzOrt}` : ""}</p>
    </div>`,
  })
);

schreibeSeite(
  path.join(DOCS, "datenschutz.html"),
  T.documentShell({
    title: `Datenschutz — ${cfg.SITE.projectName}`,
    relRoot: "",
    active: "impressum",
    content: `<div class="container prose">
      <h1>Datenschutzerklärung</h1>
      <div class="fehlt-hinweis"><strong>Noch zu prüfen:</strong> Diese Seite ist ein Entwurf und wurde nicht rechtlich geprüft. Vor dem Öffentlichgehen von jemandem mit Sachkenntnis durchsehen lassen.</div>
      <h2>Hosting</h2>
      <p>Diese Seite wird von GitHub Pages (GitHub Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA) ausgeliefert. Beim Aufruf überträgt dein Browser technisch notwendige Daten, darunter die IP-Adresse. GitHub speichert diese Zugriffsdaten in Server-Protokollen.</p>
      <h2>Keine Cookies, keine Auswertung</h2>
      <p>Diese Seite setzt keine Cookies, bindet keine externen Dienste zur Reichweitenmessung ein und speichert nichts über Besucher.</p>
      <h2>Schriftarten</h2>
      <p>Die Seite lädt Schriftarten von Google Fonts. Dabei wird deine IP-Adresse an Google übertragen.</p>
      <h2>Deine Rechte</h2>
      <p>Du hast das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung deiner Daten sowie ein Beschwerderecht bei einer Aufsichtsbehörde. Wende dich dafür an die im <a href="impressum.html">Impressum</a> genannte Stelle.</p>
    </div>`,
  })
);

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
const katSeiten = KATEGORIEN.filter((k) => anzeigen.some((a) => a.kategorie === k)).length;
console.log(
  `Seiten            : ${seiten.length} (1 Start + ${katSeiten} Kategorien + ${anzeigen.length} Angebote + Kontakt, Impressum, Datenschutz)`
);
console.log(`Bilder umgewandelt: ${bilderErzeugt} → ${(bytesGesamt / 1048576).toFixed(1)} MB WebP`);
console.log(`Kategorien        : ${Object.entries(kat).map(([k, n]) => `${k} ${n}`).join(" · ")}`);
console.log(`Passwortschutz    : ${cfg.GATE.enabled ? `AN — ${verschluesselt} Seiten verschlüsselt` : "AUS — Seiten offen"}`);
console.log(`Kleinanzeigen-Link: ${cfg.ANZEIGEN_LINK.enabled ? "AN" : "AUS"}`);
console.log(`Prüfliste         : ${bezuege.length} Anzeigen mit Bezug → pruefliste.md`);
if (bildAenderungen.length) {
  console.log(`\nBildzahl gegenüber dem letzten Abruf geändert (Quelle: Ordner/Drive):`);
  for (const b of bildAenderungen) {
    const pfeil = b.jetzt > b.vorher ? "+" : "−";
    console.log(`  ${pfeil} ${b.titel.slice(0, 50)}: ${b.vorher} → ${b.jetzt}`);
  }
}
if (start.fehlendeMotive.length) {
  console.log(`\n⚠ Motiv-Slug nicht gefunden (config.mjs → KATEGORIE_MOTIVE), Ersatzbild genommen:`);
  for (const k of start.fehlendeMotive) console.log(`  · ${k}`);
}
if (ohneBild.length) {
  console.log(`\n⚠ ${ohneBild.length} Anzeige(n) ohne Bild — Kachel zeigt nur ein Symbol:`);
  for (const a of ohneBild) console.log(`  · ${a.titel.slice(0, 60)}`);
}
if (!cfg.KONTAKT.telefon && !cfg.KONTAKT.email) {
  console.log(`\n⚠ Kontaktdaten fehlen noch (config.mjs → KONTAKT).`);
}
console.log("──────────────────────────────────────────\n");
