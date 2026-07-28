// Erzeugt stabile, URL-taugliche Ordnernamen.
//
// Titel allein genuegt nicht: Vier Anzeigen heissen fast identisch
// ("Neue Umzugskartons…"), und Titel aendern sich. Die angehaengte Anzeigen-ID
// macht den Slug eindeutig und ueber Aenderungen hinweg stabil.

const UMLAUTE = {
  ä: "ae", ö: "oe", ü: "ue", Ä: "ae", Ö: "oe", Ü: "ue", ß: "ss",
};

const MAX_TITEL = 60;

// Gemeinsamer Kern: Umlaute ausschreiben, alles klein, alles uebrige zu
// einzelnen Bindestrichen.
function grundform(text) {
  return String(text || "")
    .replace(/[äöüÄÖÜß]/g, (z) => UMLAUTE[z])
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function slugFuer(titel, anzeigenId) {
  const basis = grundform(titel).slice(0, MAX_TITEL).replace(/-+$/g, "");
  return `${basis}-${anzeigenId}`;
}

// Kategorien tragen keine ID: ihr Name ist eindeutig, und die Adresse soll
// lesbar bleiben ("Party & Feiern" → /k/party-feiern/).
export function kategorieSlug(name) {
  return grundform(name);
}
