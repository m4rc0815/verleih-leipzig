// Ordnet einen Anzeigentitel genau einer Kategorie zu.
//
// Die Kategorien von Kleinanzeigen taugen nicht (34 von 50 Anzeigen liegen unter
// "Weitere Dienstleistungen"), deshalb entscheiden Schluesselwoerter im Titel.
//
// Reihenfolge ist bedeutsam: Die erste passende Regel gewinnt. "Baustrahler
// MIETEN Umzug Beleuchtung" enthaelt "Umzug", ist aber Werkzeug — darum prueft
// die Umzugsregel nur enge Begriffe (umzugskarton), nie das blosse Wort "umzug".

export const KATEGORIEN = [
  "Party & Feiern",
  "Umzug & Transport",
  "Spiel & Spaß",
  "Werkzeug & Reinigung",
  "Foto & Technik",
];

export const FALLBACK = "Party & Feiern";

const REGELN = [
  {
    kategorie: "Umzug & Transport",
    muster: /umzugskarton|umzugsset|bücherkarton|buecherkarton|sackkarre|treppensteiger|transportwagen/i,
  },
  {
    kategorie: "Werkzeug & Reinigung",
    muster: /baustrahler|bohrmaschine|akkuschrauber|hochdruckreiniger|nassreiniger|teppichreiniger|bolzenschneider|vorschlaghammer|linienlaser|kärcher|karcher|werzeug|werkzeug/i,
  },
  {
    kategorie: "Foto & Technik",
    muster: /kamera|polaroid|instax|beamer|leinwand|playstation|fotograf/i,
  },
  {
    kategorie: "Spiel & Spaß",
    muster: /hüpfburg|huepfburg|jenga|4-\s?gewinnt|4\s?-\s?gewinnt|schwungtuch|holzspielzeug|spielzeug|sup board|paddling/i,
  },
];

export function kategorieFuer(titel) {
  const t = String(titel || "");
  for (const regel of REGELN) {
    if (regel.muster.test(t)) return regel.kategorie;
  }
  return FALLBACK;
}
