// HTML-Bausteine der Verleih-Homepage, im NotebookLM-inspirierten Stil der
// Finanz-Webseite — gleiche Struktur, gruener Akzent, andere Inhalte.
import * as cfg from "../config.mjs";
import { webpName } from "../lib/bilder.mjs";
import { KATEGORIEN } from "../lib/kategorien.mjs";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

// Cache-Buster: kurzer Hash über den Inhalt der style.css.
// Ändert sich nur, wenn sich das CSS ändert → Browser laden dann automatisch neu,
// statt bis zu 10 Min die zwischengespeicherte Datei zu verwenden.
const ASSET_VER = (() => {
  try {
    const cssPath = fileURLToPath(new URL("../assets/style.css", import.meta.url));
    return createHash("sha1").update(readFileSync(cssPath)).digest("hex").slice(0, 8);
  } catch {
    return "1";
  }
})();

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const NAV = [
  { key: "start", label: "Alle Angebote", href: (r) => `${r}index.html` },
  { key: "kontakt", label: "Kontakt", href: (r) => `${r}kontakt.html` },
  { key: "impressum", label: "Impressum", href: (r) => `${r}impressum.html` },
];

function nav(relRoot, active) {
  return NAV.map(
    (n) =>
      `<a href="${n.href(relRoot)}"${n.key === active ? ' class="is-active"' : ""}>${n.label}</a>`
  ).join("");
}

const chev = '<span class="chev" aria-hidden="true">›</span>';

export function chevronLink(text, href) {
  if (href) return `<a class="chevron-link" href="${href}">${chev} ${esc(text)}</a>`;
  return `<span class="chevron-link">${chev} ${esc(text)}</span>`;
}

// ---------------------------------------------------------------------------
// Grundgerüst
// ---------------------------------------------------------------------------
export function documentShell({
  title,
  relRoot = "",
  active = "",
  hero = "",
  content = "",
  scripts = [],
  bodyClass = "",
}) {
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(cfg.SITE.tagline)} — ${esc(cfg.SITE.ort)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${relRoot}assets/style.css?v=${ASSET_VER}">
</head>
<body class="${bodyClass}">
<a class="skip-link" href="#main">Zum Inhalt springen</a>
<header class="site-header">
  <div class="container header-inner">
    <a class="wordmark" href="${relRoot}index.html">
      <span class="wm-main">Verleih</span><span class="wm-accent">${esc(cfg.SITE.ort)}</span>
    </a>
    <input type="checkbox" id="nav-toggle" class="nav-toggle-cb" hidden>
    <nav class="main-nav" aria-label="Hauptnavigation">${nav(relRoot, active)}</nav>
    <label for="nav-toggle" class="nav-toggle" aria-label="Menü öffnen">☰</label>
  </div>
</header>
<main id="main">
${hero || ""}
${content}
</main>
<footer class="site-footer">
  <div class="container footer-grid">
    <div class="footer-brand">
      <p class="wordmark wordmark-footer"><span class="wm-main">Verleih</span><span class="wm-accent">${esc(cfg.SITE.ort)}</span></p>
      <p class="footer-note">${esc(cfg.SITE.tagline)}</p>
    </div>
    <nav class="footer-nav" aria-label="Footer">${nav(relRoot, active)}</nav>
    <div class="footer-meta">
      <p>${esc(cfg.SITE.betreiber)} · ${esc(cfg.SITE.ort)}</p>
      <p><a href="${relRoot}datenschutz.html">Datenschutz</a></p>
    </div>
  </div>
</footer>
${(scripts || []).map((s) => `<script src="${relRoot}${s}"></script>`).join("\n")}
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------
export function simpleHero({ eyebrow, title, meta }) {
  return `<section class="hero">
  <div class="container">
    ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ""}
    <h1 class="hero-title">${esc(title)}</h1>
    ${meta ? `<p class="hero-meta">${esc(meta)}</p>` : ""}
  </div>
</section>`;
}

// ---------------------------------------------------------------------------
// Bausteine der Startseite
// ---------------------------------------------------------------------------

// Telefonnummer als waehlbare Adresse. Die fuehrende 0 wird zu +49, sonst
// scheitert die Wahl aus dem Ausland und auf manchen Handys.
export function telHref(nummer) {
  return "tel:" + String(nummer || "").replace(/\D/g, "").replace(/^0/, "+49");
}

// Strichzeichnungen fuer die Zusagen-Leiste. Inline, damit keine zusaetzliche
// Datei geladen werden muss und die Farbe der Schrift folgt.
const ICONS = {
  lieferung: `<path d="M3 7h11v8H3zM14 10h4l3 3v2h-7z"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>`,
  beleg: `<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>`,
  kalender: `<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>`,
  schild: `<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>`,
};

function symbol(name) {
  const pfade = ICONS[name] || ICONS.schild; // unbekannter Name bricht die Seite nicht
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${pfade}</svg>`;
}

export function startHero(anzahl, kontakt = {}) {
  return `<section class="hero hero-home">
  <div class="container">
    <p class="eyebrow">${esc(cfg.SITE.projectName)} · seit Jahren im Süden der Stadt</p>
    <h1 class="hero-title hero-title-xl">Mieten statt kaufen.</h1>
    <p class="hero-lead">${anzahl} Sachen für Feier, Umzug und Baustelle — geliefert, auf Rechnung, ohne Kaution. Von einem Menschen aus Leipzig, nicht von einem Konzern.</p>
    <div class="hero-actions">
      <a class="btn" href="#angebote">${chev} Alle Angebote ansehen</a>
      ${kontakt.telefon ? `<a class="btn btn-ghost" href="${telHref(kontakt.telefon)}">${chev} ${esc(kontakt.telefon)}</a>` : ""}
    </div>
  </div>
</section>`;
}

export function zusagenBand(zusagen) {
  if (!zusagen || !zusagen.length) return "";
  return `<section class="zusagen-band">
  <div class="container zusagen-reihe">
    ${zusagen
      .map(
        (z) => `<div class="zusage">
      <span class="zusage-icon">${symbol(z.icon)}</span>
      <div><strong>${esc(z.titel)}</strong><span>${esc(z.text)}</span></div>
    </div>`
      )
      .join("\n    ")}
  </div>
</section>`;
}

// Fuenf Einstiege nach Kategorie. Ein Klick filtert die Liste weiter unten —
// keine eigene Unterseite, das nutzt die vorhandene Filterlogik.
//
// Liefert { html, fehlend }: fehlend nennt die Kategorien, deren konfiguriertes
// Motiv nicht gefunden wurde, damit der Bau darauf hinweisen kann.
export function kategorieBand(anzeigen, motive = {}, relRoot = "") {
  const fehlend = [];
  const kacheln = [];

  for (const kat of KATEGORIEN) {
    const treffer = anzeigen.filter((a) => a.kategorie === kat);
    if (!treffer.length) continue;

    const gewuenscht = motive[kat];
    let motiv = gewuenscht ? treffer.find((a) => a.slug === gewuenscht) : null;
    if (gewuenscht && !motiv) fehlend.push(kat);
    if (!motiv) motiv = treffer.find((a) => a.bilder && a.bilder.length);

    const bild =
      motiv && motiv.bilder && motiv.bilder.length
        ? `${relRoot}bilder/${motiv.slug}/${webpName(motiv.bilder[0], true)}`
        : "";

    kacheln.push(`<button type="button" class="kat-kachel" data-kategorie="${esc(kat)}">
    <span class="kat-bild">${
      bild
        ? `<img src="${esc(bild)}" alt="" loading="lazy" width="240" height="160">`
        : `<span class="angebot-kein-bild" aria-hidden="true">📦</span>`
    }</span>
    <span class="kat-name">${esc(kat)}</span>
    <span class="kat-anzahl">${treffer.length} ${treffer.length === 1 ? "Angebot" : "Angebote"}</span>
  </button>`);
  }

  const html = `<section class="section section-kat">
  <div class="container">
    <p class="eyebrow">Wonach suchst du?</p>
    <h2 class="band-title">Alles für Feier, Umzug und Baustelle</h2>
    <div class="kat-raster">
  ${kacheln.join("\n  ")}
    </div>
  </div>
</section>`;

  return { html, fehlend };
}

export function robertBlock(robert, kontakt = {}, relRoot = "") {
  const portraet = robert.bild
    ? `<img class="robert-foto" src="${esc(relRoot + robert.bild)}" alt="${esc(robert.name)}" width="240" height="240">`
    : `<div class="robert-platzhalter" aria-hidden="true">${esc(robert.initialen || "")}</div>`;

  const insta = robert.instagram
    ? `<a class="chevron-link" href="${esc(robert.instagram)}" target="_blank" rel="noopener noreferrer">${chev} ${esc(robert.instagramName || "Instagram")}</a>`
    : "";

  return `<section class="section robert-section">
  <div class="container robert-grid">
    <div class="robert-bild">${portraet}</div>
    <div class="robert-text">
      <p class="eyebrow">Wer dahintersteht</p>
      <h2 class="band-title">${esc(robert.name)}</h2>
      ${(robert.absaetze || []).map((p) => `<p>${esc(p)}</p>`).join("\n      ")}
      <p class="robert-links">
        ${kontakt.telefon ? `<a class="btn" href="${telHref(kontakt.telefon)}">${esc(kontakt.telefon)} anrufen</a>` : ""}
        ${insta}
      </p>
    </div>
  </div>
</section>`;
}

export function kontaktBand(kontakt = {}) {
  return `<section class="band band-dark kontakt-band">
  <div class="container">
    <p class="eyebrow eyebrow-on-dark">Fragen? Einfach anrufen</p>
    <h2 class="band-title">${esc(kontakt.telefon || "")}</h2>
    <p class="kontakt-zeiten">${esc(kontakt.zeiten || "")} · ${esc(kontakt.plzOrt || "")}${
      kontakt.email ? ` · <a href="mailto:${esc(kontakt.email)}">${esc(kontakt.email)}</a>` : ""
    }</p>
    ${kontakt.telefon ? `<p><a class="btn" href="${telHref(kontakt.telefon)}">Jetzt anrufen</a></p>` : ""}
  </div>
</section>`;
}

// Setzt die ganze Startseite zusammen. Bewusst hier und nicht in build.mjs,
// damit die Vorschau exakt dasselbe zeigt, was gebaut wird — sonst prueft man
// eine Kopie statt des Originals.
//
// Liefert { hero, content, fehlendeMotive }.
export function startSeite(anzeigen, konfig) {
  const kategorien = kategorieBand(anzeigen, konfig.KATEGORIE_MOTIVE, "");

  const filterleiste = `<div class="filterleiste">
  ${KATEGORIEN.map((k) => `<button type="button" class="f-kat" data-kategorie="${esc(k)}">${esc(k)}</button>`).join("\n  ")}
  <input type="search" id="f-suche" class="f-suche" placeholder="Suchen…" aria-label="Angebote durchsuchen">
  <select id="f-sort" aria-label="Sortierung">
    <option value="titel">A–Z</option>
    <option value="preis-auf">Preis aufsteigend</option>
    <option value="preis-ab">Preis absteigend</option>
  </select>
</div>
<p class="f-zaehler" id="f-zaehler"></p>`;

  const angebote = `<section class="section" id="angebote">
  <div class="container">
    <p class="eyebrow">Der ganze Bestand</p>
    <h2 class="band-title">Alle ${anzeigen.length} Angebote</h2>
    ${filterleiste}
    <div class="angebot-grid" id="angebot-grid">
      ${anzeigen.map((a) => kachel(a, "")).join("\n")}
    </div>
    <p id="f-leer" hidden>Keine Angebote gefunden.</p>
  </div>
</section>`;

  return {
    hero: startHero(anzeigen.length, konfig.KONTAKT),
    content: [
      zusagenBand(konfig.ZUSAGEN),
      kategorien.html,
      robertBlock(konfig.ROBERT, konfig.KONTAKT, ""),
      angebote,
      kontaktBand(konfig.KONTAKT),
    ].join("\n"),
    fehlendeMotive: kategorien.fehlend,
  };
}

// ---------------------------------------------------------------------------
// Kachel der Startseite
// ---------------------------------------------------------------------------
// Die data-Attribute steuern Filter und Suche — die Werte sind bereits
// kleingeschrieben, damit filter.js nicht jedes Mal umwandeln muss.
export function kachel(a, relRoot = "") {
  const bild = a.bilder.length
    ? `${relRoot}bilder/${a.slug}/${webpName(a.bilder[0], true)}`
    : "";
  const suchtext = `${a.titel} ${a.kategorie} ${a.beschreibung}`.toLowerCase();
  return `<a class="angebot-card" href="${relRoot}a/${a.slug}/index.html"
   data-titel="${esc(a.titel.toLowerCase())}"
   data-kategorie="${esc(a.kategorie)}"
   data-such="${esc(suchtext.slice(0, 400))}"
   data-preis="${esc(preisZahl(a.preis))}">
  <div class="angebot-bild">
    ${bild ? `<img src="${esc(bild)}" alt="${esc(a.titel)}" loading="lazy" width="500" height="500">`
           : `<div class="angebot-kein-bild" aria-hidden="true">📦</div>`}
  </div>
  <div class="angebot-text">
    <span class="angebot-kategorie">${esc(a.kategorie)}</span>
    <h3 class="angebot-titel">${esc(a.titel)}</h3>
    <span class="angebot-preis">${esc(a.preis || "auf Anfrage")}</span>
  </div>
</a>`;
}

// Preis als Zahl fuer die Sortierung. "VB" und Leerwerte bekommen bewusst
// KEINE Ersatzzahl: eine grosse Ersatzzahl wuerde sie beim absteigenden
// Sortieren nach vorne holen. Der leere Wert sagt filter.js "kein Preis" —
// diese Angebote stehen dann in beiden Richtungen hinten.
export function preisZahl(preis) {
  const m = String(preis || "").match(/(\d+)/);
  return m ? m[1] : "";
}

// ---------------------------------------------------------------------------
// Detailseite
// ---------------------------------------------------------------------------
// Grosses Bild mit Vorschaureihe darunter, danach der vollstaendige Anzeigentext.
// Der Text wird unveraendert uebernommen — nur Zeilenumbrueche werden zu Absaetzen.
export function detailSeite(a, relRoot = "../../", opt = {}) {
  const bilder = a.bilder.map((b) => ({
    gross: `${relRoot}bilder/${a.slug}/${webpName(b)}`,
    klein: `${relRoot}bilder/${a.slug}/${webpName(b, true)}`,
  }));

  const galerie = bilder.length
    ? `<div class="galerie">
  <figure class="galerie-buehne">
    <img id="galerie-gross" src="${esc(bilder[0].gross)}" alt="${esc(a.titel)}" width="1200" height="1200">
  </figure>
  ${bilder.length > 1 ? `<div class="galerie-reihe" role="list">
    ${bilder.map((b, i) => `<button type="button" class="galerie-vorschau${i === 0 ? " is-active" : ""}" role="listitem"
      data-gross="${esc(b.gross)}" aria-label="Bild ${i + 1} von ${bilder.length}">
      <img src="${esc(b.klein)}" alt="" loading="lazy" width="120" height="120">
    </button>`).join("")}
  </div>` : ""}
</div>`
    : "";

  const absaetze = String(a.beschreibung)
    .split(/\n{2,}/)
    .map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("\n");

  const anfrage = opt.anzeigenLink
    ? `<a class="anfrage-btn" href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">${esc(opt.anzeigenLinkLabel)}</a>`
    : "";

  return `<article class="angebot-detail container">
  <nav class="brotkrumen"><a href="${relRoot}index.html">Alle Angebote</a> › <span>${esc(a.kategorie)}</span></nav>
  <header class="angebot-kopf">
    <h1>${esc(a.titel)}</h1>
    <div class="angebot-fakten">
      <span class="fakt-preis">${esc(a.preis || "auf Anfrage")}</span>
      ${a.ort ? `<span class="fakt">${esc(a.ort)}</span>` : ""}
      ${a.datum ? `<span class="fakt">${esc(a.datum)}</span>` : ""}
    </div>
  </header>
  ${galerie}
  <div class="angebot-beschreibung prose">${absaetze}</div>
  ${anfrage}
</article>`;
}
