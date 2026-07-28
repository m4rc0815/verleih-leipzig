// HTML-Bausteine der Verleih-Homepage, im NotebookLM-inspirierten Stil der
// Finanz-Webseite — gleiche Struktur, gruener Akzent, andere Inhalte.
import * as cfg from "../config.mjs";
import { webpName } from "../lib/bilder.mjs";
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
