// HTML-Bausteine der Verleih-Homepage, im NotebookLM-inspirierten Stil der
// Finanz-Webseite — gleiche Struktur, gruener Akzent, andere Inhalte.
import * as cfg from "../config.mjs";
import { webpName, motivName } from "../lib/bilder.mjs";
import { KATEGORIEN } from "../lib/kategorien.mjs";
import { kategorieSlug } from "../lib/slug.mjs";
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

export function kategoriePfad(kat, relRoot = "") {
  return `${relRoot}k/${kategorieSlug(kat)}/index.html`;
}

function katLinks(relRoot, aktiveKategorie) {
  // Die Kategorie, auf der man schon steht, ist kein Link: ein Klick darauf
  // fuehrt nirgendwohin, und weil die Seite nicht wechselt, bliebe das
  // aufgeklappte Menue stehen.
  return KATEGORIEN.map((k) =>
    k === aktiveKategorie
      ? `<span class="is-active" aria-current="page">${esc(k)}</span>`
      : `<a href="${kategoriePfad(k, relRoot)}">${esc(k)}</a>`
  ).join("");
}

// Kopfnavigation. Die Kategorien haengen als <details> darunter: das klappt
// ohne JavaScript auf und funktioniert auf Touch, anders als ein Hover-Menue.
function nav(relRoot, active, aktiveKategorie = "") {
  const punkt = (n) =>
    `<a href="${n.href(relRoot)}"${n.key === active ? ' class="is-active"' : ""}>${n.label}</a>`;

  return (
    punkt(NAV[0]) +
    // Bewusst ohne "open": auf einer Kategorieseite stand das Menue sonst
    // dauerhaft aufgeklappt da. nav.js schliesst es nach Auswahl, bei Klick
    // daneben und bei Escape.
    `<details class="nav-kat">
      <summary${active === "kategorien" ? ' class="is-active"' : ""}>Kategorien</summary>
      <div class="nav-kat-liste">${katLinks(relRoot, aktiveKategorie)}</div>
    </details>` +
    NAV.slice(1).map(punkt).join("")
  );
}

// Im Fuss stehen dieselben Ziele flach untereinander — dort waere ein
// aufklappbares Menue nur im Weg.
function fussNav(relRoot, active) {
  return NAV.map(
    (n) =>
      `<a href="${n.href(relRoot)}"${n.key === active ? ' class="is-active"' : ""}>${n.label}</a>`
  ).join("");
}

const chev = '<span class="chev" aria-hidden="true">›</span>';

// Sucht zu einem Slug etwas mit Bildern — im Angebot selbst oder in seinen
// Varianten.
//
// Wer in config.mjs ein Motiv aussucht, sucht nach dem schoensten Bild und
// nicht danach, ob dieser Artikel gerade Hauptangebot oder Variante ist. Seit
// die Ausfuehrungen zusammengefasst sind, waeren sonst gute Motive plötzlich
// "nicht gefunden" — der Treppensteiger etwa, der zur Sackkarre gehoert.
export function bildquelleFuer(slug, angebote) {
  const mitBild = (x) => x && (x.bilder || []).length;
  const haupt = (angebote || []).find((a) => a.slug === slug);
  if (mitBild(haupt)) return haupt;
  const variante = (angebote || []).flatMap((a) => a.varianten || []).find((v) => v.slug === slug);
  return mitBild(variante) ? variante : null;
}

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
  aktiveKategorie = "",
  balkenExtra = "",
  // Pfad dieser Seite unterhalb der Wurzel ("", "kontakt.html", "a/slug/") —
  // gebraucht fuer die kanonische Adresse und og:url.
  pfad = "",
  beschreibung = "",
  bildUrl = "",
  strukturdaten = "",
}) {
  const basis = String(cfg.SITE.baseUrl || "").replace(/\/?$/, "/");
  const adresse = basis + String(pfad).replace(/^\//, "");
  const beschr = beschreibung || `${cfg.SITE.tagline} ${cfg.SITE.ort}`;

  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(beschr)}">
<link rel="canonical" href="${esc(adresse)}">
<link rel="icon" href="${relRoot}assets/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(cfg.SITE.projectName)}">
<meta property="og:locale" content="de_DE">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(beschr)}">
<meta property="og:url" content="${esc(adresse)}">
${bildUrl ? `<meta property="og:image" content="${esc(basis + bildUrl)}">` : ""}
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="${relRoot}assets/style.css?v=${ASSET_VER}">
${strukturdaten ? `<script type="application/ld+json">${strukturdaten}</script>` : ""}
</head>
<body class="${bodyClass}">
<a class="skip-link" href="#main">Zum Inhalt springen</a>
<header class="site-header">
  <div class="container header-inner">
    <a class="wordmark" href="${relRoot}index.html">
      <span class="wm-main">Verleih</span><span class="wm-accent">${esc(cfg.SITE.ort)}</span>
    </a>
    <input type="checkbox" id="nav-toggle" class="nav-toggle-cb" hidden>
    <nav class="main-nav" aria-label="Hauptnavigation">${nav(relRoot, active, aktiveKategorie)}</nav>
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
    <nav class="footer-nav" aria-label="Footer">${fussNav(relRoot, active)}</nav>
    <div class="footer-meta">
      <p>${esc(cfg.SITE.betreiber)} · ${esc(cfg.SITE.ort)}</p>
      <p><a href="${relRoot}agb.html">Mietbedingungen</a> · <a href="${relRoot}datenschutz.html">Datenschutz</a></p>
    </div>
  </div>
</footer>
${handyBalken(balkenExtra)}
<script src="${relRoot}assets/nav.js"></script>
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
  telefon: `<path d="M5 3h4l2 5-2.5 1.5a12 12 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>`,
};

function symbol(name) {
  const pfade = ICONS[name] || ICONS.schild; // unbekannter Name bricht die Seite nicht
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${pfade}</svg>`;
}

// Fester Balken am unteren Rand, den nur schmale Geraete sehen — ab 701px
// blendet ihn das CSS aus. Ein Verleih lebt vom Anruf; auf dem Handy soll der
// nie weiter weg sein als ein Daumen. `extra` nimmt auf den Detailseiten den
// Anfrage-Knopf auf.
function handyBalken(extra = "") {
  const tel = (cfg.KONTAKT || {}).telefon;
  if (!tel) return "";
  return `<div class="handy-balken">
  <a class="hb-knopf hb-anruf" href="${telHref(tel)}"><span class="hb-icon">${symbol("telefon")}</span>${esc(tel)}</a>
  ${extra}
</div>`;
}

// Bewusst ohne Stueckzahl: der Bestand waechst, und eine feste Zahl im
// Aushaengeschild wirkt kleiner, als das Angebot tatsaechlich ist.
// Die Bildwand rechts neben dem Titel. Drei von vier untersuchten
// Verleih-Seiten zeigen oben ein grossformatiges Foto, meist mit dunklem
// Schleier darunter. Robert hat kein Werbefoto, dafuer 283 eigene Aufnahmen —
// vier davon nebeneinander sagen sofort, worum es geht. Sie sind bereits als
// 500er Quadrate vorhanden, es entsteht also keine neue Bilddatei.
function heroBildwand(anzeigen, relRoot = "") {
  const gewaehlt = (cfg.SITE.heroBilder || [])
    .map((slug) => bildquelleFuer(slug, anzeigen))
    .filter(Boolean);
  const auswahl = (gewaehlt.length ? gewaehlt : (anzeigen || []).filter((a) => (a.bilder || []).length))
    .slice(0, 4);
  if (!auswahl.length) return "";
  return `<div class="hero-bildwand nur-breit" aria-hidden="true">
      ${auswahl
        .map(
          (a) =>
            `<img class="hero-bild" src="${relRoot}bilder/${a.slug}/${webpName(a.bilder[0], true)}" alt="" width="500" height="500">`
        )
        .join("\n      ")}
    </div>`;
}

export function startHero(kontakt = {}, anzeigen = null) {
  const wand = anzeigen ? heroBildwand(anzeigen) : "";
  return `<section class="hero hero-home">
  <div class="container${wand ? " hero-zweispaltig" : ""}">
   <div class="hero-text">
    <p class="eyebrow">${esc(cfg.SITE.projectName)} · Südvorstadt</p>
    <h1 class="hero-title hero-title-xl">Mieten statt kaufen.</h1>
    <p class="hero-lead nur-breit">Bierzeltgarnituren, Sackkarren, Hüpfburgen, Beamer. Auf Wunsch liefere ich und hole wieder ab, sieben Tage die Woche, gerne auf Rechnung.</p>
    <p class="hero-lead nur-schmal">Bierzeltgarnituren, Sackkarren, Hüpfburgen, Beamer. Sieben Tage die Woche, gerne auf Rechnung.</p>
    <div class="hero-suche nur-schmal">
      <input type="search" id="f-suche-oben" class="js-suche" placeholder="Wonach suchst du?" aria-label="Angebote durchsuchen">
    </div>
    <div class="hero-actions">
      <a class="btn" href="#angebote">${chev} Alle Angebote ansehen</a>
      ${kontakt.telefon ? `<a class="btn btn-ghost" href="${telHref(kontakt.telefon)}">${chev} ${esc(kontakt.telefon)}</a>` : ""}
    </div>
   </div>
   ${wand}
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

// Einstiege nach Kategorie. Jede Kachel fuehrt auf die eigene Seite der
// Kategorie (/k/<slug>/) — frueher filterte sie nur die Liste darunter, was
// keine verlinkbare Adresse ergab und mit wachsendem Bestand unuebersichtlich
// wurde.
//
// opt.ausser laesst eine Kategorie weg (auf deren eigener Seite), opt.eyebrow
// und opt.titel setzen die Ueberschriften.
//
// Liefert { html, fehlend }: fehlend nennt die Kategorien, deren konfiguriertes
// Motiv nicht gefunden wurde, damit der Bau darauf hinweisen kann.
export function kategorieBand(anzeigen, motive = {}, relRoot = "", opt = {}) {
  const ausser = opt.ausser || "";
  const eyebrow = opt.eyebrow || "Wonach suchst du?";
  const titel = opt.titel || "Für Feier, Umzug und Baustelle";
  const fehlend = [];
  const kacheln = [];

  for (const kat of KATEGORIEN) {
    if (kat === ausser) continue;
    const treffer = anzeigen.filter((a) => a.kategorie === kat);
    if (!treffer.length) continue;

    // Das Motiv darf auch eine Variante sein: gesucht wird nach dem schoensten
    // Bild, nicht nach der Angebotsstruktur. Bei "Umzug & Transport" ist das
    // der Treppensteiger im Garten — seit er zur Sackkarre gehoert, hat er
    // keine eigene Kachel mehr, taugt als Motiv aber unveraendert.
    const gewuenscht = motive[kat];
    let motiv = null;
    if (gewuenscht) {
      const haupt = treffer.find((a) => a.slug === gewuenscht);
      const alsVariante = treffer
        .flatMap((a) => a.varianten || [])
        .find((v) => v.slug === gewuenscht);
      motiv = haupt || alsVariante || null;
      if (!motiv) fehlend.push(kat);
    }
    if (!motiv) motiv = treffer.find((a) => a.bilder && a.bilder.length);

    // Die Kachel fuehrt immer zur Kategorieseite, das Bild darf trotzdem von
    // einer Variante stammen.
    // Die Motivfassung ist fest 3:2 und auf den Gegenstand zugeschnitten —
    // anders als die quadratische Kachelfassung, die das CSS oben beschneiden
    // muesste.
    const bild =
      motiv && motiv.bilder && motiv.bilder.length
        ? `${relRoot}bilder/${motiv.slug}/${motivName(motiv.bilder[0])}`
        : "";

    kacheln.push(`<a class="kat-kachel" href="${kategoriePfad(kat, relRoot)}">
    <span class="kat-bild">${
      bild
        ? // ohne loading="lazy": die fuenf Kacheln stehen weit oben und sind
          // zusammen nur rund 330 KB gross — nachgeladen wuerden sie sichtbar
          // spaeter erscheinen als der Text daneben.
          `<img src="${esc(bild)}" alt="" width="720" height="480">`
        : `<span class="angebot-kein-bild" aria-hidden="true">📦</span>`
    }</span>
    <span class="kat-name">${esc(kat)}</span>
    <span class="kat-anzahl">${treffer.length} ${treffer.length === 1 ? "Angebot" : "Angebote"}</span>
  </a>`);
  }

  const html = `<section class="section section-kat">
  <div class="container">
    <p class="eyebrow">${esc(eyebrow)}</p>
    <h2 class="band-title">${esc(titel)}</h2>
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
// Suche, Kategorieknoepfe und Sortierung. Auf einer Kategorieseite entfallen
// die Knoepfe — man ist bereits in der Kategorie.
function filterleiste(mitKategorien = true) {
  // "Alle" steht am Ende der Reihe und hebt den Filter auf. Ohne diesen Knopf
  // muesste man den gewaehlten noch einmal treffen, um wieder alles zu sehen —
  // das ahnt niemand.
  const knoepfe = KATEGORIEN.map(
    (k) => `<button type="button" class="f-kat" data-kategorie="${esc(k)}">${esc(k)}</button>`
  ).concat(`<button type="button" class="f-kat f-alle is-active" data-kategorie="">Alle</button>`);

  return `<div class="filterleiste">
  ${mitKategorien ? `<div class="f-kat-reihe">${knoepfe.join("")}</div>` : ""}
  <div class="f-zeile">
    <input type="search" id="f-suche" class="f-suche js-suche" placeholder="Suchen…" aria-label="Angebote durchsuchen">
    <select id="f-sort" aria-label="Sortierung">
      <option value="titel">A–Z</option>
      <option value="preis-auf">Preis aufsteigend</option>
      <option value="preis-ab">Preis absteigend</option>
    </select>
  </div>
</div>
<p class="f-zaehler" id="f-zaehler"></p>`;
}

function angebotsGitter(liste, relRoot = "") {
  return `<div class="angebot-grid" id="angebot-grid">
      ${liste.map((a) => kachel(a, relRoot)).join("\n")}
    </div>
    <p id="f-leer" hidden>Keine Angebote gefunden.</p>`;
}

// Die Angebote der Startseite nach Kategorien gegliedert, mit wechselnder
// Flaeche. Vorher lief die Liste 5507 px am Stueck — 70 % der Seitenlaenge
// ohne jeden Halt. Der Wechsel steckt als Klasse im Markup und nicht in einer
// nth-child-Regel: sobald der Filter einen Block leert, verrutschte die
// Zaehlung sonst und zwei gleiche Flaechen stiessen aneinander.
function angebotsBloecke(anzeigen, relRoot = "") {
  let sichtbar = 0;
  const bloecke = KATEGORIEN.map((kat) => {
    const treffer = anzeigen.filter((a) => a.kategorie === kat);
    if (!treffer.length) return "";
    const weiss = sichtbar++ % 2 === 1;
    return `<section class="angebot-block${weiss ? " ist-weiss" : ""}" data-block="${esc(kat)}">
    <div class="container">
      <div class="block-kopf">
        <h3 class="block-titel">${esc(kat)}</h3>
        <a class="block-link" href="${kategoriePfad(kat, relRoot)}">Alle ${treffer.length} ansehen</a>
      </div>
      <div class="angebot-grid">
        ${treffer.map((a) => kachel(a, relRoot)).join("\n        ")}
      </div>
    </div>
  </section>`;
  });
  return `${bloecke.join("\n")}
  <div class="container"><p id="f-leer" hidden>Keine Angebote gefunden.</p></div>`;
}

export function startSeite(anzeigen, konfig) {
  const kategorien = kategorieBand(anzeigen, konfig.KATEGORIE_MOTIVE, "");

  const angebote = `<section class="section" id="angebote">
  <div class="container">
    <p class="eyebrow">Der ganze Bestand</p>
    <h2 class="band-title">Alle Angebote</h2>
    ${filterleiste(true)}
  </div>
  ${angebotsBloecke(anzeigen, "")}
</section>`;

  return {
    hero: startHero(konfig.KONTAKT, anzeigen),
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
// Kategorieseite
// ---------------------------------------------------------------------------
// Eigene Adresse je Kategorie (/k/party-feiern/) mit nur den Angeboten dieser
// Kategorie. Damit bleibt der Bestand uebersichtlich, wenn er weiter waechst,
// und jede Kategorie ist verlinkbar.
//
// Liefert { hero, content, anzahl }.
export function kategorieSeite(kat, alleAnzeigen, konfig, relRoot = "../../") {
  const treffer = alleAnzeigen.filter((a) => a.kategorie === kat);
  const text = (konfig.KATEGORIE_TEXTE || {})[kat] || "";
  const andere = kategorieBand(alleAnzeigen, konfig.KATEGORIE_MOTIVE, relRoot, {
    ausser: kat,
    eyebrow: "Weiter stöbern",
    titel: "Andere Kategorien",
  });

  const hero = `<section class="hero hero-kat">
  <div class="container">
    <nav class="brotkrumen"><a href="${relRoot}index.html">Start</a> › <span>${esc(kat)}</span></nav>
    <h1 class="hero-title">${esc(kat)}</h1>
    <p class="hero-meta">${treffer.length} ${treffer.length === 1 ? "Angebot" : "Angebote"} zum Mieten</p>
    ${text ? `<p class="hero-lead">${esc(text)}</p>` : ""}
  </div>
</section>`;

  // Umschaltreihe: von hier aus ist jede andere Kategorie einen Klick weit weg,
  // ohne den Umweg ueber die Startseite. Die eigene Kategorie steht markiert
  // dabei, damit man sieht, wo man ist; "Alle" fuehrt zum ganzen Bestand.
  const wechsel = `<nav class="kat-wechsel" aria-label="Kategorie wechseln">
    ${KATEGORIEN.map((k) =>
      k === kat
        ? `<span class="kat-pille is-active" aria-current="page">${esc(k)}</span>`
        : `<a class="kat-pille" href="${kategoriePfad(k, relRoot)}">${esc(k)}</a>`
    ).join("")}
    <a class="kat-pille kat-alle" href="${relRoot}index.html#angebote">Alle</a>
  </nav>`;

  const liste = `<section class="section" id="angebote">
  <div class="container">
    ${wechsel}
    ${filterleiste(false)}
    ${angebotsGitter(treffer, relRoot)}
  </div>
</section>`;

  return {
    hero,
    content: [liste, andere.html, kontaktBand(konfig.KONTAKT)].join("\n"),
    anzahl: treffer.length,
  };
}

// ---------------------------------------------------------------------------
// Kachel der Startseite
// ---------------------------------------------------------------------------
// Die data-Attribute steuern Filter und Suche — die Werte sind bereits
// kleingeschrieben, damit filter.js nicht jedes Mal umwandeln muss.
export function kachel(a, relRoot = "") {
  const bilder = a.bilder || [];
  const varianten = a.varianten || [];
  const bild = bilder.length ? `${relRoot}bilder/${a.slug}/${webpName(bilder[0], true)}` : "";

  // Die Suche soll auch Varianten finden: wer "Instax" eingibt, meint die
  // Sofortbildkamera, auch wenn die Variante keine eigene Kachel mehr hat.
  const suchtext = [
    a.titel,
    a.anzeigenTitel, // die alten Kleinanzeigen-Worte bleiben auffindbar
    a.kategorie,
    ...varianten.map((v) => v.name),
    ...(a.absaetze || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return `<a class="angebot-card" href="${relRoot}a/${a.slug}/index.html"
   data-titel="${esc(String(a.titel).toLowerCase())}"
   data-kategorie="${esc(a.kategorie)}"
   data-such="${esc(suchtext.slice(0, 500))}"
   data-preis="${esc(a.abPreisZahl ?? "")}">
  <div class="angebot-bild">
    ${bild ? `<img src="${esc(bild)}" alt="${esc(a.titel)}" loading="lazy" width="500" height="500">`
           : `<div class="angebot-kein-bild" aria-hidden="true">📦</div>`}
  </div>
  <div class="angebot-text">
    <h3 class="angebot-titel">${esc(a.titel)}</h3>
    <span class="angebot-preis">${esc(a.abPreisLabel || "auf Anfrage")}</span>
    ${varianten.length ? `<span class="angebot-varianten">${varianten.length + 1} Ausführungen</span>` : ""}
  </div>
</a>`;
}

// ---------------------------------------------------------------------------
// Detailseite
// ---------------------------------------------------------------------------
// Grosses Bild mit Vorschaureihe, dann Beschreibung, Preistabelle, technische
// Daten und die Konditionen.
//
// Frueher stand hier der Anzeigentext am Stueck — mit Begruessung, Preisen im
// Fliesstext, Verweisen auf andere Anzeigen und Grussformel. Jetzt hat jede
// dieser Angaben ihren Platz, und wer nur wissen will, was es kostet, findet
// eine Tabelle statt eines Absatzes.

// Preistabelle. Folgetage und Zusaetze stehen unten, damit oben die Preise
// stehen, nach denen tatsaechlich gefragt wird.
function preisTabelle(preise, preishinweis) {
  if (!preise || !preise.length) return "";
  const reihenfolge = { einstieg: 0, paket: 1, folge: 2, zusatz: 3 };
  const sortiert = [...preise].sort(
    (a, b) => (reihenfolge[a.rolle] ?? 1) - (reihenfolge[b.rolle] ?? 1)
  );
  return `<section class="preis-block">
    <h2>Was es kostet</h2>
    <table class="preis-tabelle">
      <tbody>
      ${sortiert
        .map(
          (p) => `<tr class="preis-${esc(p.rolle || "einstieg")}">
        <th scope="row">${esc(p.was)}${p.zusatz ? ` <span class="preis-zusatz">${esc(p.zusatz)}</span>` : ""}</th>
        <td>${esc(p.betrag)}</td>
      </tr>`
        )
        .join("\n      ")}
      </tbody>
    </table>
    ${preishinweis ? `<p class="preis-hinweis">${esc(preishinweis)}</p>` : ""}
  </section>`;
}

// Die Ausfuehrungen eines Angebots. Sie hatten frueher je eine eigene Anzeige
// und damit eine eigene Kachel — vier Bierzeltgarnituren nebeneinander sahen
// aus wie vier Angebote, waren aber Groessen desselben Artikels.
function variantenBlock(alle) {
  if (!alle || !alle.length) return "";
  // Ausfuehrungen und Zubehoer getrennt: das Geblaese ist keine Groesse der
  // Huepfburg, sondern etwas, das man dazu mietet.
  return [
    variantenListe(alle.filter((v) => !v.zubehoer), "Ausführungen"),
    variantenListe(alle.filter((v) => v.zubehoer), "Dazu mieten"),
  ].join("\n");
}

function variantenListe(varianten, titel) {
  if (!varianten.length) return "";
  return `<section class="varianten-block">
    <h2>${esc(titel)}</h2>
    <ul class="varianten-liste">
      ${varianten
        .map((v) => {
          const preis = v.preise.find((p) => (p.rolle || "einstieg") === "einstieg") || v.preise[0];
          return `<li>
        <span class="variante-name">${esc(v.name)}</span>
        ${preis ? `<span class="variante-preis">${esc(preis.was)}: ${esc(preis.betrag)}</span>` : ""}
        ${v.beschreibung ? `<span class="variante-text">${esc(v.beschreibung)}</span>` : ""}
      </li>`;
        })
        .join("\n      ")}
    </ul>
  </section>`;
}

function datenBlock(daten) {
  if (!daten || !daten.length) return "";
  return `<section class="daten-block">
    <h2>Daten und Lieferumfang</h2>
    <ul class="daten-liste">
      ${daten.map((d) => `<li>${esc(d)}</li>`).join("\n      ")}
    </ul>
  </section>`;
}

// Lieferung, Pfand, Zahlung, Zeiten. Was das Angebot selbst sagt, hat Vorrang
// vor der allgemeinen Regel — sonst stuende bei den Kartons die 40-€-Pauschale,
// obwohl sie dort 15 € kostet.
function konditionsBlock(a, konditionen = {}) {
  const zeile = (titel, text) =>
    text ? `<div class="kondition"><dt>${esc(titel)}</dt><dd>${esc(text)}</dd></div>` : "";

  return `<section class="kondition-block">
    <h2>Gut zu wissen</h2>
    <dl class="kondition-liste">
      ${zeile("Lieferung", a.lieferung.length ? a.lieferung.join(" · ") : (konditionen.lieferung || {}).text)}
      ${zeile("Pfand", a.pfand === "kein Pfand" ? "Für dieses Angebot verlange ich kein Pfand." : a.pfand ? `${a.pfand}. Bargeld hinterlegen musst du nicht.` : (konditionen.pfand || {}).text)}
      ${zeile("Zahlung", a.zahlung ? `${a.zahlung}. Auf Rechnung auch für Firmen und Vereine.` : (konditionen.zahlung || {}).text)}
      ${zeile("Abholung", (konditionen.zeiten || {}).text)}
    </dl>
  </section>`;
}

export function detailSeite(angebot, relRoot = "../../", opt = {}) {
  // Fehlt ein Feld, faellt nur der zugehoerige Block weg statt der ganzen Seite.
  const a = {
    bilder: [], varianten: [], preise: [], absaetze: [], daten: [],
    lieferung: [], pfand: null, zahlung: null, preishinweis: null,
    hinweis: "", art: "miete", abPreisLabel: "auf Anfrage",
    ...angebot,
  };

  // Die Bilder der Varianten gehoeren in dieselbe Galerie: sie zeigen denselben
  // Artikel in anderer Groesse, und ihre eigenen Seiten gibt es nicht mehr.
  //
  // Aber nicht alle: Bei der Bierzeltgarnitur kamen so 35 Vorschaubilder
  // zusammen, dreizehn eigene plus die von drei Ausfuehrungen. Zwei je
  // Ausfuehrung zeigen, worum es geht; der Rest ist Wiederholung derselben
  // Bank aus anderem Winkel.
  const BILDER_JE_VARIANTE = 2;
  const alleBilder = [
    ...a.bilder.map((b) => ({ slug: a.slug, datei: b })),
    ...a.varianten.flatMap((v) =>
      (v.bilder || []).slice(0, BILDER_JE_VARIANTE).map((b) => ({ slug: v.slug, datei: b }))
    ),
  ];
  const bilder = alleBilder.map(({ slug, datei }) => ({
    gross: `${relRoot}bilder/${slug}/${webpName(datei)}`,
    klein: `${relRoot}bilder/${slug}/${webpName(datei, true)}`,
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

  const beschreibung = a.absaetze.length
    ? `<div class="angebot-beschreibung prose">${a.absaetze.map((p) => `<p>${esc(p)}</p>`).join("\n")}</div>`
    : "";

  // Anfragewege: anrufen, schreiben, notfalls ueber die Anzeige. Der Anruf
  // steht zuerst — er fuehrt am schnellsten zum Ergebnis und ist der Weg, den
  // Robert selbst bevorzugt.
  const kontakt = opt.kontakt || {};
  const anfrageKnoepfe = [
    kontakt.telefon
      ? `<a class="anfrage-btn" href="${telHref(kontakt.telefon)}">${esc(kontakt.telefon)} anrufen</a>`
      : "",
    opt.anfrage && opt.anfrage.mail && kontakt.email
      ? `<a class="anfrage-btn anfrage-btn-zweit" href="mailto:${esc(kontakt.email)}?subject=${encodeURIComponent(
          opt.anfrage.betreff(a.titel)
        )}&body=${encodeURIComponent(opt.anfrage.vorlage(a.titel))}">Per E-Mail anfragen</a>`
      : "",
    opt.anzeigenLink
      ? `<a class="anfrage-btn anfrage-btn-zweit" href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">${esc(opt.anzeigenLinkLabel)}</a>`
      : "",
  ].filter(Boolean);

  const anfrage = anfrageKnoepfe.length
    ? `<section class="anfrage-block">
    <h2>Interesse?</h2>
    <div class="anfrage-reihe">${anfrageKnoepfe.join("\n      ")}</div>
  </section>`
    : "";

  return `<article class="angebot-detail container">
  <nav class="brotkrumen"><a href="${relRoot}index.html">Start</a> › <a href="${kategoriePfad(a.kategorie, relRoot)}">${esc(a.kategorie)}</a></nav>
  <header class="angebot-kopf">
    <h1>${esc(a.titel)}</h1>
    <div class="angebot-fakten">
      <span class="fakt-preis">${esc(a.abPreisLabel)}</span>
      ${a.art === "verkauf" ? `<span class="fakt fakt-verkauf">Verkauf, keine Miete</span>` : ""}
      ${a.varianten.length ? `<span class="fakt">${a.varianten.length + 1} Ausführungen</span>` : ""}
    </div>
    ${a.hinweis ? `<p class="angebot-hinweis">${esc(a.hinweis)}</p>` : ""}
  </header>
  ${galerie}
  ${beschreibung}
  ${preisTabelle(a.preise, a.preishinweis)}
  ${variantenBlock(a.varianten)}
  ${datenBlock(a.daten)}
  ${konditionsBlock(a, opt.konditionen)}
  ${anfrage}
</article>`;
}
