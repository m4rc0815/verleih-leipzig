// Baut docs/ aus content/. docs/ ist reiner Bauausgang und wird vorher geleert,
// damit entfernte Anzeigen keine verwaisten Seiten hinterlassen.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { webcrypto as wc } from "node:crypto";
import * as cfg from "./config.mjs";
import * as inhalte from "./inhalte.mjs";
import * as T from "./templates/layout.mjs";
import { deriveKey, encryptPage, gatePage, zugangsGeheimnis } from "./crypt.mjs";
import { erzeugeVarianten, erzeugeMotivbild, istBild, webpName } from "./lib/bilder.mjs";
import { findeBezuege } from "./lib/pruefliste.mjs";
import { baueAngebote } from "./lib/angebote.mjs";
import { localBusiness, produkt } from "./lib/strukturdaten.mjs";
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

// --- Anzeigen zu Angeboten zusammenfassen ---------------------------------
// Aus 50 Anzeigen werden gut 30 Angebote: dieselben Artikel, aber die
// Ausfuehrungen desselben Artikels (vier Bierzeltgarnituren, fuenf
// Kartongroessen) stehen zusammen statt als eigene Kacheln nebeneinander.
// Was dabei wie zusammengehoert, steht in inhalte.mjs.
const { angebote, warnungen, offeneFragen } = baueAngebote(anzeigen, inhalte);

const ohneBild = anzeigen.filter((a) => !a.bilder.length);

// --- Bilder: aus jedem Original die beiden WebP-Fassungen ------------------
// Umgewandelt werden die Bilder ALLER Anzeigen, auch die der Varianten: deren
// Seiten entfallen zwar, ihre Bilder stehen aber in der Galerie des
// Hauptangebots.
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

// --- Motivbilder der Kategorie-Kacheln -------------------------------------
// Fest 3:2 und auf den Gegenstand zugeschnitten. Nur fuer die fuenf
// konfigurierten Motive noetig, nicht fuer alle 283 Bilder.
let motiveErzeugt = 0;
for (const kat of KATEGORIEN) {
  const gewuenscht = cfg.KATEGORIE_MOTIVE[kat];
  const motiv =
    anzeigen.find((a) => a.slug === gewuenscht && a.bilder.length) ||
    anzeigen.find((a) => a.kategorie === kat && a.bilder.length);
  if (!motiv) continue;
  await erzeugeMotivbild(
    path.join(__dirname, cfg.BILDER.ordner, motiv.slug, motiv.bilder[0]),
    path.join(DOCS, "bilder", motiv.slug),
    motiv.bilder[0].replace(/\.[^.]+$/, "")
  );
  motiveErzeugt++;
}

// --- Seiten ----------------------------------------------------------------
const seiten = []; // gepuffert → am Ende offen oder verschluesselt geschrieben
function schreibeSeite(pfad, html) {
  seiten.push({ pfad, html });
}

// Startseite
const start = T.startSeite(angebote, cfg);

// Das erste Hero-Bild dient auch als Vorschaubild beim Teilen.
const teilerBild = (() => {
  const slug = (cfg.SITE.heroBilder || [])[0];
  const quelle =
    angebote.find((a) => a.slug === slug && a.bilder.length) ||
    angebote.flatMap((a) => a.varianten).find((v) => v.slug === slug && v.bilder.length) ||
    angebote.find((a) => a.bilder.length);
  return quelle ? `bilder/${quelle.slug}/${webpName(quelle.bilder[0])}` : "";
})();

schreibeSeite(
  path.join(DOCS, "index.html"),
  T.documentShell({
    title: `${cfg.SITE.projectName} — ${cfg.SITE.seitentitel}`,
    relRoot: "",
    active: "start",
    pfad: "",
    bildUrl: teilerBild,
    strukturdaten: localBusiness(cfg),
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
  const seite = T.kategorieSeite(kat, angebote, cfg, "../../");
  if (!seite.anzahl) continue; // leere Kategorie bekommt keine Seite
  schreibeSeite(
    path.join(DOCS, "k", kategorieSlug(kat), "index.html"),
    T.documentShell({
      title: `${kat} mieten in ${cfg.SITE.ort} — ${cfg.SITE.projectName}`,
      relRoot: "../../",
      active: "kategorien",
      aktiveKategorie: kat,
      pfad: `k/${kategorieSlug(kat)}/`,
      beschreibung: (cfg.KATEGORIE_TEXTE || {})[kat] || `${kat} mieten in ${cfg.SITE.ort}.`,
      hero: seite.hero,
      content: seite.content,
      scripts: ["assets/filter.js"],
    })
  );
}

// Detailseiten — eine je Angebot. Varianten haben keine eigene mehr; sie
// stehen auf der Seite ihres Hauptangebots.
for (const a of angebote) {
  const bildPfade = a.bilder.map((b) => `bilder/${a.slug}/${webpName(b)}`);
  schreibeSeite(
    path.join(DOCS, "a", a.slug, "index.html"),
    T.documentShell({
      title: `${a.titel} ${a.art === "verkauf" ? "kaufen" : "mieten"} in ${cfg.SITE.ort} — ${cfg.SITE.projectName}`,
      relRoot: "../../",
      active: "start",
      aktiveKategorie: a.kategorie,
      pfad: `a/${a.slug}/`,
      beschreibung: a.beschreibungssatz,
      bildUrl: bildPfade[0] || "",
      strukturdaten: produkt(a, cfg, bildPfade.slice(0, 3)),
      content: T.detailSeite(a, "../../", {
        anzeigenLink: cfg.ANZEIGEN_LINK.enabled,
        anzeigenLinkLabel: cfg.ANZEIGEN_LINK.label,
        konditionen: inhalte.KONDITIONEN,
        kontakt: cfg.KONTAKT,
        anfrage: cfg.ANFRAGE,
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
    pfad: "kontakt.html",
    beschreibung: `So erreichst du ${cfg.SITE.betreiber}: Telefon, E-Mail und Zeiten.`,
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
    pfad: "impressum.html",
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

// --- AGB / Mietbedingungen -------------------------------------------------
// Alle drei verglichenen Leipziger Verleiher haben welche. Ohne eigene
// Bedingungen gilt im Streitfall allein das Gesetz, und das ist fuer den
// Vermieter nicht die guenstigere Fassung: ohne Vereinbarung gibt es
// beispielsweise keine Stornoregel und keine Frist fuer die Rueckgabe.
//
// Das hier ist ein ENTWURF nach Roberts tatsaechlicher Praxis (Pfand per
// Ausweiskopie, Lieferpauschale, Zahlung bar/PayPal/Ueberweisung). Er ist
// nicht rechtlich geprueft, und der Hinweis darauf steht bewusst als erstes
// auf der Seite — bis jemand mit Sachkenntnis darueber gesehen hat.
schreibeSeite(
  path.join(DOCS, "agb.html"),
  T.documentShell({
    title: `Mietbedingungen — ${cfg.SITE.projectName}`,
    relRoot: "",
    active: "impressum",
    pfad: "agb.html",
    beschreibung: `Mietbedingungen von ${cfg.SITE.projectName}: Mietzeit, Preise, Pfand, Schäden, Rücktritt.`,
    content: `<div class="container prose">
      <h1>Mietbedingungen</h1>
      <div class="fehlt-hinweis"><strong>Noch zu prüfen:</strong> Diese Bedingungen sind ein Entwurf und wurden nicht rechtlich geprüft. Vor dem Öffentlichgehen von jemandem mit Sachkenntnis durchsehen lassen.</div>

      <h2>1. Wofür diese Bedingungen gelten</h2>
      <p>Sie gelten für alle Mietverträge zwischen ${k.name}, ${k.plzOrt || "Leipzig"} (im Folgenden „Vermieter") und dir als Mieterin oder Mieter. Für den Verkauf von Umzugskartons und Zubehör gelten sie sinngemäß.</p>

      <h2>2. Wie der Vertrag zustande kommt</h2>
      <p>Die Angebote auf dieser Seite sind noch kein bindendes Angebot. Der Vertrag kommt zustande, wenn der Vermieter deine Anfrage bestätigt — telefonisch, per E-Mail oder bei der Übergabe.</p>

      <h2>3. Mietzeit</h2>
      <p>Die Mietzeit beginnt mit der Übergabe und endet mit der Rückgabe. Ein Miettag umfasst 24 Stunden, sofern nichts anderes vereinbart ist. Übergabe und Rückgabe sind täglich zwischen 7 und 23 Uhr möglich, auch sonntags und feiertags.</p>
      <p>Gibst du später zurück als vereinbart, wird jeder angefangene weitere Tag nach dem Preis für Folgetage berechnet. Wenn du absehen kannst, dass es später wird, sag bitte vorher Bescheid.</p>

      <h2>4. Preise und Zahlung</h2>
      <p>Es gelten die bei der Bestätigung vereinbarten Preise. Zahlbar bar, per PayPal oder per Überweisung, spätestens bei der Rückgabe. Auf Wunsch stellt der Vermieter eine Rechnung aus, auch für Firmen und Vereine.</p>

      <h2>5. Pfand</h2>
      <p>Bei den meisten Angeboten genügt ein Foto oder eine Kopie deines Ausweises. Diese Kopie dient allein der Absicherung der Rückgabe, wird nicht weitergegeben und nach vollständiger Rückgabe gelöscht. Näheres steht in der <a href="datenschutz.html">Datenschutzerklärung</a>. Ein Geldpfand verlangt der Vermieter nicht.</p>

      <h2>6. Deine Pflichten</h2>
      <p>Behandle die Mietsache sorgfältig und benutze sie nur so, wie sie gedacht ist. Weitergeben an Dritte, vermieten oder ins Ausland verbringen geht nur mit vorheriger Zustimmung. Bei Geräten mit Anleitung gilt die Anleitung.</p>
      <p>Bei Hüpfburgen gilt zusätzlich: Sie darf nur unter Aufsicht einer erwachsenen Person benutzt werden, nicht bei starkem Wind oder Gewitter, und sie muss mit den mitgelieferten Erdnägeln gesichert werden.</p>

      <h2>7. Schäden und Verlust</h2>
      <p>Melde einen Schaden bitte sofort und nicht erst bei der Rückgabe. Für Schäden, die über normale Abnutzung hinausgehen, und für Verlust haftest du in Höhe der Reparaturkosten, höchstens bis zum Zeitwert. Normale Gebrauchsspuren sind mit der Miete abgegolten.</p>
      <p>Gib die Sachen bitte so sauber zurück, wie du sie bekommen hast. Wo eine Endreinigung angeboten wird, kannst du sie zum angegebenen Preis dazubuchen.</p>

      <h2>8. Haftung des Vermieters</h2>
      <p>Der Vermieter haftet unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei Schäden an Leben, Körper und Gesundheit. Bei einfacher Fahrlässigkeit haftet er nur für die Verletzung wesentlicher Vertragspflichten und der Höhe nach begrenzt auf den vertragstypischen, vorhersehbaren Schaden.</p>

      <h2>9. Rücktritt</h2>
      <p>Sag bitte so früh wie möglich ab, wenn ein Termin platzt. Bis 48 Stunden vor Mietbeginn ist die Absage kostenfrei. Danach kann der Vermieter 50 Prozent des vereinbarten Mietpreises verlangen, es sei denn, er vermietet die Sache anderweitig.</p>
      <p>Kann der Vermieter die Sache aus Gründen nicht bereitstellen, die er zu vertreten hat, erstattet er bereits gezahlte Beträge vollständig.</p>

      <h2>10. Lieferung</h2>
      <p>Lieferung und Abholung sind gegen Aufpreis möglich; der Betrag steht beim jeweiligen Angebot. Geliefert wird bis zur Wohnungstür. Sei zum vereinbarten Zeitpunkt erreichbar — für vergebliche Anfahrten kann der Vermieter die Pauschale berechnen.</p>

      <h2>11. Schlussbestimmungen</h2>
      <p>Es gilt deutsches Recht. Sollte eine Bestimmung unwirksam sein, bleiben die übrigen wirksam.</p>
      <p>Zur Teilnahme an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle ist der Vermieter nicht verpflichtet und nicht bereit.</p>

      <p class="prose-stand">Stand: ${daten.abgerufen}</p>
    </div>`,
  })
);

schreibeSeite(
  path.join(DOCS, "datenschutz.html"),
  T.documentShell({
    title: `Datenschutz — ${cfg.SITE.projectName}`,
    relRoot: "",
    active: "impressum",
    pfad: "datenschutz.html",
    content: `<div class="container prose">
      <h1>Datenschutzerklärung</h1>
      <div class="fehlt-hinweis"><strong>Noch zu prüfen:</strong> Diese Seite ist ein Entwurf und wurde nicht rechtlich geprüft. Vor dem Öffentlichgehen von jemandem mit Sachkenntnis durchsehen lassen.</div>
      <h2>Hosting</h2>
      <p>Diese Seite wird von GitHub Pages (GitHub Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA) ausgeliefert. Beim Aufruf überträgt dein Browser technisch notwendige Daten, darunter die IP-Adresse. GitHub speichert diese Zugriffsdaten in Server-Protokollen.</p>
      <h2>Keine Cookies, keine Auswertung</h2>
      <p>Diese Seite setzt keine Cookies, bindet keine externen Dienste zur Reichweitenmessung ein und speichert nichts über Besucher.</p>
      <h2>Schriftarten</h2>
      <p>Die Schriftarten liegen auf diesem Server und werden von hier ausgeliefert. Es wird dafür keine Verbindung zu Google Fonts oder einem anderen fremden Anbieter aufgebaut.</p>
      <h2>Wenn du anfragst</h2>
      <p>Rufst du an oder schreibst du eine E-Mail, verarbeitet ${k.name} deine Angaben nur, um deine Anfrage zu beantworten und den Mietvertrag abzuwickeln. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. Nach Abschluss werden die Daten gelöscht, soweit keine steuerlichen Aufbewahrungsfristen entgegenstehen.</p>
      <h2>Ausweiskopie als Pfand</h2>
      <p>Bei der Übergabe wird in der Regel ein Foto oder eine Kopie deines Ausweises als Pfand genommen. Zweck ist allein, die Rückgabe der Mietsache abzusichern; Rechtsgrundlage ist Art. 6 Abs. 1 lit. b und f DSGVO. Die Kopie wird nicht an Dritte weitergegeben und nach vollständiger Rückgabe unverzüglich gelöscht oder vernichtet.</p>
      <p>Du bist nicht verpflichtet, eine Kopie zu überlassen. Wenn du das nicht möchtest, sprich ${cfg.SITE.betreiber} bitte an — dann wird eine andere Lösung vereinbart oder der Vertrag kommt nicht zustande.</p>
      <p>Nicht benötigte Angaben auf dem Ausweis (zum Beispiel Seriennummer, Zugangsnummer oder Größe) darfst du vor der Aufnahme abdecken.</p>
      <h2>Deine Rechte</h2>
      <p>Du hast das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung deiner Daten sowie ein Beschwerderecht bei einer Aufsichtsbehörde. Wende dich dafür an die im <a href="impressum.html">Impressum</a> genannte Stelle.</p>
    </div>`,
  })
);

// --- Beiwerk ---------------------------------------------------------------
// Rekursiv, weil unter assets/ seit den lokalen Schriften ein Unterordner
// liegt (assets/fonts/) — copyFileSync waere daran gescheitert.
const assetsOut = path.join(DOCS, "assets");
fs.cpSync(ASSETS, assetsOut, { recursive: true });
fs.writeFileSync(path.join(DOCS, ".nojekyll"), "");

// --- Wegweiser fuer Suchmaschinen ------------------------------------------
// Solange der Passwortschutz an ist, gibt es hier nichts zu indexieren: die
// Seiten sind verschluesselt, und eine Sitemap wuerde Suchmaschinen auf
// Adressen fuehren, hinter denen nur die Anmeldemaske steht.
const basisUrl = String(cfg.SITE.baseUrl || "").replace(/\/?$/, "/");

if (cfg.GATE.enabled) {
  fs.writeFileSync(path.join(DOCS, "robots.txt"), "User-agent: *\nDisallow: /\n");
} else {
  fs.writeFileSync(
    path.join(DOCS, "robots.txt"),
    `User-agent: *\nAllow: /\n\nSitemap: ${basisUrl}sitemap.xml\n`
  );

  const adressen = [
    "",
    ...KATEGORIEN.filter((kat) => angebote.some((a) => a.kategorie === kat)).map(
      (kat) => `k/${kategorieSlug(kat)}/`
    ),
    ...angebote.map((a) => `a/${a.slug}/`),
    "kontakt.html",
    "impressum.html",
    "agb.html",
    "datenschutz.html",
  ];

  fs.writeFileSync(
    path.join(DOCS, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      adressen
        .map(
          (p) =>
            `  <url><loc>${basisUrl}${p}</loc><lastmod>${daten.abgerufen}</lastmod></url>`
        )
        .join("\n") +
      `\n</urlset>\n`
  );
}

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
// Geprueft wird der AUFBEREITETE Text, nicht mehr der rohe Anzeigentext: die
// Begruessung und die Verweise auf andere Anzeigen entfernt die Aufbereitung
// bereits. Was hier noch auftaucht, steht wirklich auf der Seite und muss von
// Hand entschieden werden.
const bezuege = angebote
  .map((a) => ({
    titel: a.titel,
    slug: a.slug,
    treffer: findeBezuege([...a.absaetze, ...a.daten].join("\n")),
  }))
  .filter((e) => e.treffer.length);

fs.writeFileSync(
  path.join(__dirname, "pruefliste.md"),
  `# Prüfliste: Textstellen mit Kleinanzeigen-Bezug\n\n` +
    `Stand: ${daten.abgerufen} · ${bezuege.length} von ${angebote.length} Angeboten betroffen\n\n` +
    `Geprüft wird der Text, der nach der Aufbereitung übrig bleibt — also das, was\n` +
    `tatsächlich auf der Seite steht. Begrüßung, Grußformel und Verweise auf andere\n` +
    `Anzeigen entfernt \`lib/text-aufbereitung.mjs\` bereits selbst.\n\n` +
    (bezuege.length
      ? bezuege
          .map(
            (e) =>
              `## ${e.titel}\n\`a/${e.slug}/\`\n\n` +
              e.treffer.map((t) => `- Zeile ${t.nr}: „${t.zeile}"`).join("\n")
          )
          .join("\n\n") + "\n"
      : "Nichts zu tun: keine Kleinanzeigen-Formulierung mehr auf der Seite.\n")
);

const kat = {};
for (const a of angebote) kat[a.kategorie] = (kat[a.kategorie] || 0) + 1;
const variantenGesamt = angebote.reduce((n, a) => n + a.varianten.length, 0);

console.log("\n── Bau-Bericht ───────────────────────────");
const katSeiten = KATEGORIEN.filter((k) => angebote.some((a) => a.kategorie === k)).length;
console.log(
  `Seiten            : ${seiten.length} (1 Start + ${katSeiten} Kategorien + ${angebote.length} Angebote + Kontakt, Impressum, Mietbedingungen, Datenschutz)`
);
console.log(`Angebote          : ${anzeigen.length} Anzeigen → ${angebote.length} Angebote (${variantenGesamt} als Variante zugeordnet)`);
console.log(`Bilder umgewandelt: ${bilderErzeugt} → ${(bytesGesamt / 1048576).toFixed(1)} MB WebP`);
console.log(`Motive der Kacheln : ${motiveErzeugt} × 3:2 zugeschnitten`);
console.log(`Kategorien        : ${Object.entries(kat).map(([k, n]) => `${k} ${n}`).join(" · ")}`);
console.log(`Passwortschutz    : ${cfg.GATE.enabled ? `AN — ${verschluesselt} Seiten verschlüsselt` : "AUS — Seiten offen"}`);
console.log(`Kleinanzeigen-Link: ${cfg.ANZEIGEN_LINK.enabled ? "AN" : "AUS"}`);
console.log(`Prüfliste         : ${bezuege.length} Angebote mit Bezug → pruefliste.md`);

if (warnungen.length) {
  console.log(`\n⚠ inhalte.mjs passt nicht mehr zu den Anzeigen:`);
  for (const w of warnungen) console.log(`  · ${w}`);
}
if (offeneFragen.length) {
  console.log(`\n○ Offene Punkte für Robert (${offeneFragen.length}) — Notizen aus inhalte.mjs:`);
  for (const o of offeneFragen) console.log(`  · ${o.titel}: ${o.text}`);
}
const ohnePreis = angebote.filter((a) => a.abPreisZahl === null);
if (ohnePreis.length) {
  console.log(`\n⚠ ${ohnePreis.length} Angebot(e) ohne Preis — die Kachel sagt nur "auf Anfrage":`);
  for (const a of ohnePreis) console.log(`  · ${a.titel}`);
}
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
