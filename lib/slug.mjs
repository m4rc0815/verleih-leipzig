// Erzeugt stabile, URL-taugliche Ordnernamen.
//
// Titel allein genuegt nicht: Vier Anzeigen heissen fast identisch
// ("Neue Umzugskartons…"), und Titel aendern sich. Die angehaengte Anzeigen-ID
// macht den Slug eindeutig und ueber Aenderungen hinweg stabil.

const UMLAUTE = {
  ä: "ae", ö: "oe", ü: "ue", Ä: "ae", Ö: "oe", Ü: "ue", ß: "ss",
};

const MAX_TITEL = 60;

export function slugFuer(titel, anzeigenId) {
  const basis = String(titel || "")
    .replace(/[äöüÄÖÜß]/g, (z) => UMLAUTE[z])
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_TITEL)
    .replace(/-+$/g, "");
  return `${basis}-${anzeigenId}`;
}
