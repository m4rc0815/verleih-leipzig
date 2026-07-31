// Fuehrt die drei Quellen zu den Angeboten zusammen, die die Seite zeigt:
//
//   content/anzeigen.json  – was Robert bei Kleinanzeigen stehen hat (Quelle)
//   text-aufbereitung.mjs  – zerlegt den Anzeigentext in Beschreibung, Preise,
//                            Konditionen
//   inhalte.mjs            – die Redaktion: kurze Titel, Varianten, Korrekturen
//
// Ergebnis ist eine Liste von Angeboten. Ein Angebot kann Varianten haben; die
// haben dann keine eigene Seite mehr, sondern stehen beim Hauptangebot. Aus 50
// Anzeigen werden so gut 30 Angebote — dieselben Artikel, ohne die Dubletten,
// die bei Kleinanzeigen Sinn ergeben (jede Anzeige = eigene Sichtbarkeit) und
// auf einer eigenen Seite nur ermueden.

import { zerlege } from "./text-aufbereitung.mjs";

// Der Preis, mit dem die Kachel wirbt.
//
// Frueher stand dort das Preisfeld der Anzeige. Das lief mit der Zeit gegen den
// Anzeigentext: die Zapfanlage warb mit 40 €, im Text standen 50 € fuer den
// ersten Tag. Aus der Tabelle abgeleitet kann das nicht mehr auseinanderlaufen.
//
// Gezaehlt werden nur Einstiegspreise — was der erste Tag kostet. Folgetage
// ("jeder weitere Tag: 8 €") und Zusatzleistungen (Nebelfluid, Endreinigung)
// bleiben aussen vor: mit ihnen warb die Huepfburg mit "ab 25 €", obwohl das
// der Folgetag ihres Geblaeses war. Gibt es keinen Einstiegspreis, zaehlen die
// Pakete (Wochenende, Woche) — besser ein zu hoher als ein erfundener Preis.
const alsZahl = (betrag) => parseFloat(String(betrag).replace(/[^\d,.]/g, "").replace(",", "."));

function kleinsterBetrag(preise) {
  const mitRolle = (rollen) =>
    (preise || [])
      .filter((p) => rollen.includes(p.rolle || "einstieg"))
      .map((p) => alsZahl(p.betrag))
      .filter((n) => Number.isFinite(n));

  const einstieg = mitRolle(["einstieg"]);
  if (einstieg.length) return Math.min(...einstieg);
  const paket = mitRolle(["paket"]);
  return paket.length ? Math.min(...paket) : null;
}

function alsPreis(n) {
  if (n === null) return null;
  // 2.2 → "2,20 €", 40 → "40 €"
  const text = Number.isInteger(n) ? String(n) : n.toFixed(2).replace(".", ",");
  return `${text} €`;
}

// Der Satz, der als Beschreibung in der Trefferliste steht.
//
// Nicht einfach der erste Absatz: bei der Huepfburg waere das "Schulanfang
// 2026 und 2027 bereits vermietet." gewesen — ein Terminhinweis, der in Google
// steht, bis ihn jemand entfernt. Gesucht wird der erste Absatz, der den
// Gegenstand tatsaechlich beschreibt.
function beschreibungssatz(absaetze, titel, ort) {
  const beschreibend = absaetze.find((p) => /^ich (vermiete|verkaufe|biete)/i.test(p) && p.length > 60);
  const langGenug = absaetze.find((p) => p.length > 80);
  const satz = beschreibend || langGenug || absaetze[0];
  if (!satz) return `${titel} in ${ort}.`;
  // Auf ganze Saetze kuerzen statt mitten im Wort abzuschneiden.
  if (satz.length <= 160) return satz;
  const teil = satz.slice(0, 157);
  const punkt = teil.lastIndexOf(". ");
  return punkt > 80 ? teil.slice(0, punkt + 1) : `${teil.slice(0, teil.lastIndexOf(" "))}…`;
}

function eintrag(anzeige, redaktion) {
  const zerlegt = zerlege(anzeige.beschreibung);
  // Preise aus inhalte.mjs haben Vorrang: sie stehen dort, weil die Aufbereitung
  // sie im Fliesstext nicht sicher erkennen konnte.
  const preise = redaktion.preise || zerlegt.preise;
  return {
    slug: anzeige.slug,
    titel: redaktion.titel || anzeige.titel,
    anzeigenTitel: anzeige.titel,
    kategorie: anzeige.kategorie,
    url: anzeige.url,
    ort: anzeige.ort,
    bilder: anzeige.bilder || [],
    art: redaktion.art || "miete",
    hinweis: redaktion.hinweis || "",
    offen: redaktion.offen || "",
    preise,
    abPreisZahl: kleinsterBetrag(preise),
    // Bewusst einzeln statt ...zerlegt: sonst ueberschriebe zerlegt.preise die
    // Korrektur aus inhalte.mjs wieder.
    absaetze: zerlegt.absaetze,
    beschreibungssatz: beschreibungssatz(zerlegt.absaetze, redaktion.titel || anzeige.titel, anzeige.ort || "Leipzig"),
    daten: zerlegt.daten,
    preishinweis: zerlegt.preishinweis,
    lieferung: zerlegt.lieferung,
    pfand: zerlegt.pfand,
    zahlung: zerlegt.zahlung,
    ungeklaert: zerlegt.ungeklaert,
    varianten: [],
  };
}

/**
 * @param anzeigen  content/anzeigen.json → .anzeigen
 * @param inhalte   { ANZEIGEN, KONDITIONEN } aus inhalte.mjs
 * @returns { angebote, warnungen, offeneFragen }
 */
export function baueAngebote(anzeigen, inhalte) {
  const redaktionAller = inhalte.ANZEIGEN || {};
  const warnungen = [];
  const offeneFragen = [];

  // Slugs in inhalte.mjs, zu denen es keine Anzeige (mehr) gibt — sonst
  // verschwindet eine Variante still, wenn Robert eine Anzeige loescht.
  const vorhanden = new Set(anzeigen.map((a) => a.slug));
  for (const slug of Object.keys(redaktionAller)) {
    if (!vorhanden.has(slug)) warnungen.push(`inhalte.mjs kennt "${slug}", die Anzeige gibt es nicht mehr`);
  }

  const alle = new Map();
  for (const a of anzeigen) {
    const e = eintrag(a, redaktionAller[a.slug] || {});
    alle.set(a.slug, e);
    if (e.offen) offeneFragen.push({ titel: e.titel, text: e.offen });
  }

  // Varianten ihren Hauptangeboten zuordnen
  const istVariante = new Set();
  for (const [slug, e] of alle) {
    const redaktion = redaktionAller[slug] || {};
    if (!redaktion.varianteVon) continue;

    const haupt = alle.get(redaktion.varianteVon);
    if (!haupt) {
      warnungen.push(`"${slug}" verweist als Variante auf "${redaktion.varianteVon}" — das gibt es nicht`);
      continue;
    }
    if (redaktion.varianteVon === slug) {
      warnungen.push(`"${slug}" ist als Variante seiner selbst eingetragen`);
      continue;
    }
    haupt.varianten.push({
      slug,
      name: redaktion.variante || e.titel,
      zubehoer: Boolean(redaktion.zubehoer),
      preise: e.preise,
      abPreisZahl: e.abPreisZahl,
      bilder: e.bilder,
      // Der erste Absatz reicht als Beschreibung der Variante; der Rest
      // wiederholt meist, was beim Hauptangebot schon steht.
      beschreibung: e.absaetze[0] || "",
      daten: e.daten,
    });
    istVariante.add(slug);
  }

  const angebote = [...alle.values()].filter((e) => !istVariante.has(e.slug));

  // Der Ab-Preis der Kachel gilt fuer die ganze Gruppe: hat eine Ausfuehrung
  // den guenstigeren Preis, steht der dort. Sonst verspraeche die Kachel mehr,
  // als die Seite haelt.
  //
  // Zubehoer bleibt aussen vor. Das Geblaese zur Huepfburg kostet 25 € am
  // Folgetag — als Gruppenpreis gelesen warb die Huepfburg damit "ab 25 €",
  // obwohl sie selbst gar keinen Preis nennt.
  for (const e of angebote) {
    const ausfuehrungen = e.varianten.filter((v) => !v.zubehoer);
    const zahlen = [e.abPreisZahl, ...ausfuehrungen.map((v) => v.abPreisZahl)].filter((n) => n !== null);
    e.abPreisZahl = zahlen.length ? Math.min(...zahlen) : null;
    e.abPreis = alsPreis(e.abPreisZahl);
    // "ab" nur, wenn es mehr als einen Preis gibt — bei einem einzigen Preis
    // waere es eine Ausrede.
    const preisAnzahl = e.preise.length + ausfuehrungen.reduce((n, v) => n + v.preise.length, 0);
    e.abPreisLabel = e.abPreis ? (preisAnzahl > 1 ? `ab ${e.abPreis}` : e.abPreis) : "auf Anfrage";
  }

  return { angebote, warnungen, offeneFragen };
}
