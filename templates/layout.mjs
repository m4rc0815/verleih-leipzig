// HTML-Templates im NotebookLM-inspirierten Stil.
import * as cfg from "../config.mjs";
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
  { key: "start", label: "Start", href: (r) => `${r}index.html` },
  { key: "analysen", label: "Analysen", href: (r) => `${r}analysen/index.html` },
  { key: "rankings", label: "Rankings", href: (r) => `${r}rankings/index.html` },
  { key: "markt", label: "Markt", href: (r) => `${r}markt/index.html` },
  { key: "archiv", label: "Archiv", href: (r) => `${r}archiv/index.html` },
  { key: "disclaimer", label: "Disclaimer", href: (r) => `${r}disclaimer.html` },
];

function nav(relRoot, active) {
  return NAV.map(
    (n) =>
      `<a href="${n.href(relRoot)}"${n.key === active ? ' class="is-active"' : ""}>${n.label}</a>`
  ).join("");
}

const chev = '<span class="chev" aria-hidden="true">›</span>';

// Score deutsch formatieren: Dezimal-Komma, Ganzzahlen mit ",0" (z. B. 7 → "7,0", 7.55 → "7,55")
const fmtScore = (r) =>
  (Number.isInteger(r) ? r.toFixed(1) : String(r)).replace(".", ",");

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
  scripts = "",
  bodyClass = "",
}) {
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · ${esc(cfg.SITE.projectName)}</title>
<meta name="description" content="${esc(cfg.SITE.tagline)} — ${esc(cfg.SITE.disclaimerShort)}">
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
      <span class="wm-main">Finanzanalysen</span><span class="wm-accent">mit&nbsp;Claude</span>
    </a>
    <input type="checkbox" id="nav-toggle" class="nav-toggle-cb" hidden>
    <nav class="main-nav" aria-label="Hauptnavigation">${nav(relRoot, active)}</nav>
    <label for="nav-toggle" class="nav-toggle" aria-label="Menü öffnen">☰</label>
  </div>
</header>
<div class="disclaimer-banner"><div class="container"><strong>Keine Anlageberatung.</strong> Rein informative Auswertung öffentlich verfügbarer Daten — Investitionsentscheidungen eigenverantwortlich. <a href="${relRoot}disclaimer.html">Mehr dazu ›</a></div></div>
<main id="main">
${hero || ""}
${content}
</main>
<footer class="site-footer">
  <div class="container footer-grid">
    <div class="footer-brand">
      <p class="wordmark wordmark-footer"><span class="wm-main">Finanzanalysen</span><span class="wm-accent">mit&nbsp;Claude</span></p>
      <p class="footer-note">${esc(cfg.SITE.disclaimerShort)}</p>
    </div>
    <nav class="footer-nav" aria-label="Footer">${nav(relRoot, active)}</nav>
    <div class="footer-meta">
      <p>✦ ${esc(cfg.SITE.claudeBadge)}</p>
      <p><a href="${relRoot}disclaimer.html">Disclaimer &amp; Hinweise</a></p>
    </div>
  </div>
</footer>
<script src="${relRoot}assets/counter.js" defer></script>
${scripts}
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Heroes
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

export function analysisHero(a) {
  const rating =
    a.rating !== null
      ? `<span class="badge badge-rating">Score ${esc(fmtScore(a.rating))}</span>`
      : `<span class="badge badge-watch">Watchlist</span>`;
  const archivBadge = a.archived ? `<span class="badge badge-archiv">Archiv</span>` : "";
  const eyebrow = `${a.archived ? "Archiv · " : ""}${esc(a.sektor)} · ${esc(a.region)}`;
  const back = a.archived
    ? `<a href="../archiv/index.html">${chev} Zum Archiv</a>`
    : `<a href="../analysen/index.html">${chev} Alle Analysen</a>`;
  const note = a.archived
    ? `<p class="archiv-hinweis">📦 Archivierte Analyse — Datenstand ${esc(fmt(a.datum))}; Kurse und Kennzahlen können veraltet sein. Aktuelle Analysen unter <a href="../analysen/index.html">Analysen</a>.</p>`
    : "";
  return `<section class="hero hero-detail${a.archived ? " hero-archiv" : ""}">
  <div class="container">
    <p class="eyebrow">${eyebrow}</p>
    <h1 class="hero-title">${esc(a.unternehmen)}</h1>
    <p class="hero-meta">${esc(a.ticker)} · Datenstand ${esc(fmt(a.datum))}</p>
    <div class="badge-row">${archivBadge}${rating}<span class="badge">${esc(a.region)}</span><span class="badge">${esc(a.sektor)}</span></div>
    ${note}
    <p class="backlink">${back}</p>
  </div>
</section>`;
}

// ---------------------------------------------------------------------------
// Analysen-Übersicht (filterbar)
// ---------------------------------------------------------------------------
export function analysenIndex(analyses, { sektoren, regionen, relRoot, intro }) {
  const opt = (arr) => arr.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join("");
  const cards = analyses.map((a) => analyseCard(a, relRoot)).join("\n");
  return `<section class="section">
  <div class="container">
    ${intro ? `<div class="archiv-note">${intro}</div>` : ""}
    <div class="filterbar">
      <input type="search" id="f-search" class="f-input" placeholder="Unternehmen oder Ticker suchen…" aria-label="Suche">
      <select id="f-sektor" class="f-select" aria-label="Branche"><option value="">Alle Branchen</option>${opt(sektoren)}</select>
      <select id="f-region" class="f-select" aria-label="Region"><option value="">Alle Regionen</option>${opt(regionen)}</select>
      <select id="f-sort" class="f-select" aria-label="Sortierung">
        <option value="name">Name A–Z</option>
        <option value="rating">Score (hoch → niedrig)</option>
        <option value="datum">Neueste zuerst</option>
      </select>
      <p class="result-count" id="f-count"></p>
    </div>
    <div class="card-grid" id="analyse-grid">
${cards}
    </div>
    <p class="no-results" id="f-empty" hidden>Keine Analysen passen zu deiner Auswahl.</p>
  </div>
</section>`;
}

function analyseCard(a, relRoot) {
  const score =
    a.rating !== null
      ? `<span class="badge badge-rating">Score ${esc(fmtScore(a.rating))}</span>`
      : `<span class="badge badge-watch">Watchlist</span>`;
  return `      <a class="card analyse-card" href="${relRoot}${a.url}"
        data-name="${esc(a.unternehmen.toLowerCase())}" data-ticker="${esc(a.ticker.toLowerCase())}"
        data-sektor="${esc(a.sektor)}" data-region="${esc(a.region)}"
        data-rating="${a.rating ?? ""}" data-datum="${esc(a.datum)}">
        <p class="eyebrow">${esc(a.sektor)}</p>
        <h3 class="card-title">${esc(a.unternehmen)}</h3>
        <p class="card-meta">${esc(a.ticker)} · ${esc(a.region)}</p>
        <div class="card-foot">
          <span class="card-badges">${a.archived ? `<span class="badge badge-archiv">Archiv</span>` : ""}${score}</span>
          <span class="chevron-link">${chev} Zur Analyse</span>
        </div>
      </a>`;
}

// ---------------------------------------------------------------------------
// Rankings- / Markt-Übersicht
// ---------------------------------------------------------------------------
export function rankingsIndex(rankings, relRoot) {
  return `<section class="section"><div class="container">
    <div class="card-grid">
${rankings.map((r) => featureCard(r, relRoot, "Zum Ranking")).join("\n")}
    </div></div></section>`;
}

export function marktIndex(markt, relRoot) {
  return `<section class="section"><div class="container">
    <div class="card-grid">
${markt.map((m) => featureCard(m, relRoot, "Öffnen")).join("\n")}
    </div></div></section>`;
}

function featureCard(item, relRoot, cta) {
  return `      <a class="card feature-card" href="${relRoot}${item.url}">
        <p class="eyebrow">${esc(item.eyebrow)}</p>
        <h3 class="card-title">${esc(item.title)}</h3>
        <p class="card-text">${esc(item.teaser)}</p>
        <span class="chevron-link">${chev} ${esc(cta)}</span>
      </a>`;
}

// ---------------------------------------------------------------------------
// Startseite
// ---------------------------------------------------------------------------
export function landing({ rankings, markt, neueste, total, archivCount = 0, buildDate, relRoot }) {
  const rankCols = rankings
    .map(
      (r) => `      <div class="col">
        <p class="eyebrow eyebrow-dark">${esc(r.eyebrow)}</p>
        <h3 class="col-title">${esc(r.title)}</h3>
        <p class="col-text">${esc(r.teaser)}</p>
        <a class="chevron-link" href="${relRoot}${r.url}">${chev} Zum Ranking</a>
      </div>`
    )
    .join("\n");

  const neuCards = neueste.map((a) => analyseCard(a, relRoot)).join("\n");

  const marktCols = markt
    .map(
      (m) => `      <div class="col">
        <p class="eyebrow">${esc(m.eyebrow)}</p>
        <h3 class="col-title">${esc(m.title)}</h3>
        <p class="col-text">${esc(m.teaser)}</p>
        <a class="chevron-link" href="${relRoot}${m.url}">${chev} Öffnen</a>
      </div>`
    )
    .join("\n");

  return `<section class="hero hero-home">
  <div class="container">
    <p class="eyebrow">${esc(cfg.SITE.projectName)}</p>
    <h1 class="hero-title hero-title-xl">${esc(cfg.SITE.tagline)}</h1>
    <p class="hero-lead">${total} fundierte Aktienanalysen, drei Rankings und ein tagesaktuelles Markt-Dashboard — quellengestützt, einheitlich aufgebaut und kostenlos einsehbar.</p>
    <div class="hero-actions">
      <a class="btn" href="${relRoot}analysen/index.html">${chev} Alle Analysen</a>
      <a class="btn btn-ghost" href="${relRoot}rankings/index.html">${chev} Zu den Rankings</a>
    </div>
    ${buildDate ? `<p class="hero-stamp">Stand ${esc(buildDate)}</p>` : ""}
  </div>
</section>

<section class="band band-dark">
  <div class="container band-split">
    <div>
      <p class="eyebrow eyebrow-on-dark">Worum es geht</p>
      <h2 class="band-title">Aktien verständlich ausgewertet.</h2>
    </div>
    <div class="band-text">
      <p>Jede Analyse folgt demselben Aufbau: Kursentwicklung, Bewertung (KGV, KBV, P/S), Dividende, Insider-Trades, Quartalszahlen, Wettbewerb und eine Fünf-Jahres-Einschätzung mit Bär-, Basis- und Bull-Szenario. Die Rankings führen die Einzelwerte auf einer einheitlichen Matrix zusammen.</p>
      <p class="muted">Die Inhalte dienen ausschließlich der Information und stellen keine Anlageberatung dar.</p>
    </div>
  </div>
</section>

<section class="band band-yellow">
  <div class="container">
    <p class="eyebrow eyebrow-dark">Bestenlisten</p>
    <h2 class="band-title">Rankings</h2>
    <div class="cols-3 cols-divided">
${rankCols}
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-head">
      <div>
        <p class="eyebrow">Zuletzt erstellt</p>
        <h2 class="band-title">Neueste Analysen</h2>
      </div>
      <a class="chevron-link" href="${relRoot}analysen/index.html">${chev} Alle ${total} Analysen</a>
    </div>
    <div class="card-grid">
${neuCards}
    </div>
  </div>
</section>

${archivCount ? `<section class="section section-archiv">
  <div class="container archiv-strip">
    <div>
      <p class="eyebrow">Archiv</p>
      <h2 class="band-title">Frühere Analysen</h2>
      <p class="col-text">${archivCount} archivierte Analysen aus früheren Wellen — Datenstand älter, zur Nachverfolgung weiterhin einsehbar.</p>
    </div>
    <a class="btn btn-ghost" href="${relRoot}archiv/index.html">${chev} Zum Archiv</a>
  </div>
</section>` : ""}

<section class="band band-light">
  <div class="container">
    <p class="eyebrow">Marktdaten</p>
    <h2 class="band-title">Markt im Überblick</h2>
    <div class="cols-2 cols-divided">
${marktCols}
    </div>
  </div>
</section>`;
}

// ---------------------------------------------------------------------------
// Disclaimer
// ---------------------------------------------------------------------------
export function disclaimerPage(buildDate) {
  return `<section class="section"><div class="container prose narrow">
    <h2>Keine Anlageberatung</h2>
    <p>Die auf dieser Webseite veröffentlichten Aktienanalysen, Rankings und Marktüberblicke sind <strong>rein informativ</strong> und stellen <strong>keine Anlageberatung, Anlageempfehlung oder Aufforderung</strong> zum Kauf oder Verkauf von Wertpapieren dar. Sie ersetzen keine individuelle, fachkundige Beratung. Investitionsentscheidungen treffen Leserinnen und Leser eigenverantwortlich.</p>

    <h2>Mit Claude erstellt</h2>
    <p>Sämtliche Inhalte wurden mithilfe des KI-Assistenten <strong>Claude</strong> erstellt und basieren auf öffentlich verfügbaren Daten sowie persönlichen Einschätzungen. Trotz sorgfältiger Aufbereitung können die Inhalte Fehler enthalten oder unvollständig sein. Es wird keine Gewähr für Richtigkeit, Vollständigkeit und Aktualität übernommen.</p>

    <h2>Aktualität der Daten</h2>
    <p>Kurse, Kennzahlen und Nachrichten beziehen sich auf den jeweils angegebenen Datenstand und können zum Zeitpunkt des Lesens bereits veraltet sein. Das Markt-Dashboard bindet teils externe Live-Charts (stooq.com) ein, deren Inhalte von Dritten bereitgestellt werden.</p>

    <h2>Haftung</h2>
    <p>Eine Haftung für Vermögensschäden, die aus der Nutzung oder Nichtnutzung der bereitgestellten Informationen entstehen, ist — soweit gesetzlich zulässig — ausgeschlossen. Für die Inhalte externer Links sind ausschließlich deren Betreiber verantwortlich.</p>

    <p class="muted">Letzter Stand der Seite: ${esc(buildDate || "—")}.</p>
    <p class="visit-counter">Besucher gesamt: <span id="visit-count">…</span></p>
  </div></section>`;
}

function fmt(iso) {
  const m = String(iso ?? "").match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : String(iso ?? "");
}
