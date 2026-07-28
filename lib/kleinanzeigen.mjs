// Abruf und Auswertung von Kleinanzeigen-Seiten.
//
// Uebernommen aus dem bewaehrten Extraktor, der alle 50 Anzeigen erfasst hat.
// Ein Unterschied: Die Bild-URLs mit rule=$_57 liefern 1200x1600 und werden
// unveraendert weitergereicht — verkleinert wird erst in lib/bilder.mjs.

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

export function dekodiereEntities(s) {
  return String(s || "")
    .replace(/&auml;/g, "ä").replace(/&ouml;/g, "ö").replace(/&uuml;/g, "ü")
    .replace(/&Auml;/g, "Ä").replace(/&Ouml;/g, "Ö").replace(/&Uuml;/g, "Ü")
    .replace(/&szlig;/g, "ß").replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&euro;/g, "€")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&amp;/g, "&"); // zuletzt, sonst werden doppelt kodierte Entities zerlegt
}

export function stripTags(html) {
  return dekodiereEntities(
    String(html || "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")
  ).trim();
}

// Inhalt des Elements mit der angegebenen id/class herausschneiden.
function zwischen(html, kennung) {
  const re = new RegExp(
    `(?:id|class)="[^"]*${kennung}[^"]*"[^>]*>([\\s\\S]*?)<\\/(?:h1|h2|div|p|span|section)>`,
    "i"
  );
  const m = html.match(re);
  return m ? m[1] : "";
}

export function parseAnzeige(html, url) {
  const titel = stripTags(zwischen(html, "viewad-title")) || "Ohne Titel";
  const preis = stripTags(zwischen(html, "viewad-price")) || "";
  const ort = stripTags(zwischen(html, "viewad-locality")) || "";
  const beschreibung = stripTags(zwischen(html, "viewad-description-text")) || "";

  const idTreffer = html.match(/<li>Anzeigen-ID<\/li>\s*<li>(\d+)<\/li>/);
  const anzeigenId =
    (idTreffer && idTreffer[1]) || (url.match(/(\d+)-\d+-\d+$/) || [])[1] || "unbekannt";

  const datumTreffer = html.match(/viewad-extra-info[\s\S]{0,300}?<span>([^<]+)<\/span>/);
  const datum = datumTreffer ? datumTreffer[1].trim() : "";

  const brotStart = html.indexOf('class="breadcrump"');
  const brotStueck = brotStart >= 0 ? html.slice(brotStart, brotStart + 1500) : "";
  const kategorie = [...brotStueck.matchAll(/itemprop="name">([^<]+)<\/span>/g)]
    .map((m) => dekodiereEntities(m[1]))
    .join(" > ");

  // Galeriebilder: rule=$_57 ist die groesste angebotene Fassung (1200x1600).
  // Dubletten ueber die Bild-Kennung im Pfad ausfiltern.
  const gesehen = new Set();
  const bildUrls = [];
  for (const m of html.matchAll(
    /data-imgsrc="(https:\/\/img\.kleinanzeigen\.de\/api\/v1\/prod-ads\/images\/[^"]+?rule=\$_57\.[A-Z]+)"/g
  )) {
    const u = m[1];
    const hash = (u.match(/images\/[0-9a-f]{2}\/([0-9a-f-]+)\?/) || [])[1] || u;
    if (gesehen.has(hash)) continue;
    gesehen.add(hash);
    bildUrls.push(u);
  }

  return { anzeigenId, titel, preis, ort, datum, kategorie, beschreibung, bildUrls, url };
}

async function hole(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "de-DE,de;q=0.9" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} bei ${url}`);
  return res.text();
}

export async function holeAnzeige(url) {
  return parseAnzeige(await hole(url), url);
}

// Zieht die Anzeigen-Adressen aus einer Bestandslisten-Seite. Getrennt vom
// Abruf, damit sich das Auswerten ohne Netz pruefen laesst.
export function extrahiereAnzeigenUrls(html) {
  const urls = new Set();
  for (const m of String(html || "").matchAll(/href="(\/s-anzeige\/[^"]+?\/\d+-\d+-\d+)"/g)) {
    urls.add("https://www.kleinanzeigen.de" + m[1]);
  }
  return [...urls];
}

// Liest die Bestandsliste eines Verkaeufers und liefert alle Anzeigen-URLs.
//
// Kleinanzeigen zeigt nur 25 Anzeigen je Seite. Es wird ueber &pageNum=N
// geblaettert, bis eine Seite keine neue Adresse mehr beisteuert — das deckt
// sowohl die leere Folgeseite als auch eine wiederholte Seite ab.
export async function holeBestandsliste(bestandslisteUrl, maxSeiten = 20) {
  const alle = new Set();
  for (let seite = 1; seite <= maxSeiten; seite++) {
    const adresse = new URL(bestandslisteUrl);
    adresse.searchParams.set("pageNum", String(seite));
    const vorher = alle.size;
    for (const u of extrahiereAnzeigenUrls(await hole(adresse.href))) alle.add(u);
    if (alle.size === vorher) break;
  }
  return [...alle];
}

export async function ladeBild(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} bei Bild ${url}`);
  return Buffer.from(await res.arrayBuffer());
}
