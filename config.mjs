// Konfiguration fuer den Bau der Verleih-Homepage.
// Quelle = content/ (von sync.mjs erzeugt). Ausgabe = docs/ (GitHub-Pages-Quelle).

export const BESTANDSLISTE =
  "https://www.kleinanzeigen.de/s-bestandsliste.html?userId=45885794";

export const SITE = {
  projectName: "Verleih Leipzig",
  tagline: "Party, Umzug und Werkzeug mieten — mit Lieferservice und Rechnung",
  baseUrl: "https://m4rc0815.github.io/verleih-leipzig/",
  betreiber: "Robert Kipf",
  ort: "Leipzig",
};

// --- Passwortschutz waehrend der Bauphase ----------------------------------
// enabled=true ⇒ jede Seite wird beim Bau mit AES-256-GCM verschluesselt; der
// Schluessel entsteht aus Benutzername UND Passwort. Auf false stellen, wenn die
// Seite oeffentlich gehen soll — VORHER Impressum und Datenschutz fuellen.
export const GATE = {
  enabled: true,
  iterations: 200000, // PBKDF2-Runden (SHA-256)
  credentialsFile: ".gate-password", // lokal, gitignored: Zeile 1 Benutzername, Zeile 2 Passwort
  metaFile: "gate-meta.json", // mitversioniert: das oeffentliche Salz
};

// --- Verweis auf die Kleinanzeigen-Anzeige ---------------------------------
// Solange es keinen eigenen Kontaktweg gibt, ist die Anzeige der einzige Weg,
// Robert zu erreichen. Auf false stellen, sobald Telefon/E-Mail eingetragen sind
// und der Verweis verschwinden soll.
export const ANZEIGEN_LINK = {
  enabled: true,
  label: "Auf Kleinanzeigen anfragen",
};

// --- Kontakt & Impressum ---------------------------------------------------
// Leer = die Seite zeigt an dieser Stelle einen deutlichen Hinweis, dass die
// Angaben fehlen. Der Bau bricht ab, wenn GATE.enabled=false ist und diese
// Felder noch leer sind — eine gewerbliche Seite ohne Impressum darf nicht online.
export const KONTAKT = {
  name: "Robert Kipf",
  strasse: "Fichtestr. 29",
  plzOrt: "04275 Leipzig",
  telefon: "0176 55180756",
  email: "robertkipf@gmx.de",
  ustId: "DE409684617",
  zeiten: "Mo–So 7:00–23:00 Uhr",
};

export const BILDER = {
  ordner: "content/bilder",
};

// --- Vorstellung auf der Startseite ----------------------------------------
// Roberts eigener Text, fuer die Homepage geglaettet. Inhalt und Zusagen
// stammen aus seiner Selbstbeschreibung im Kleinanzeigen-Business-Portal.
// Aendern geht hier — die Vorlagen muessen dafuer nicht angefasst werden.
export const ROBERT = {
  name: "Robert Kipf",
  initialen: "RK",
  // Sobald ein Portraet vorliegt: Datei nach assets/ legen und hier eintragen,
  // z. B. "assets/robert.jpg". Leer = gruener Kreis mit den Initialen.
  bild: "",
  absaetze: [
    "Ich bin Robert, Kleingewerbetreibender aus Leipzig. Seit Jahren vermiete ich, was man selten braucht, aber dann dringend: von der Bierzeltgarnitur über die Sackkarre bis zur Hüpfburg.",
    "Zuverlässigkeit und Pünktlichkeit sind mir wichtig — und dass ihr zufrieden seid. Ich arbeite sieben Tage die Woche, das ganze Jahr über. Ruft einfach an, dann finden wir eine Lösung.",
  ],
  instagram: "https://www.instagram.com/robertkipf/",
  instagramName: "@robertkipf",
};

// --- Zusagen-Leiste ---------------------------------------------------------
// Alle vier stammen aus Roberts eigenen Anzeigentexten (Lieferservice 47/50,
// Rechnung 48/50, Wochenende 39/50). "Ohne Kaution" ist erschlossen: Kaution
// kommt in keiner einzigen Anzeige vor — von Robert bestaetigen lassen.
export const ZUSAGEN = [
  { icon: "lieferung", titel: "Lieferservice", text: "Ich bringe die Sachen vorbei und hole sie wieder ab." },
  { icon: "beleg", titel: "Auf Rechnung", text: "Auch für Firmen und Vereine — Zahlung bar, per PayPal oder Überweisung." },
  { icon: "kalender", titel: "7 Tage die Woche", text: "Von 7 bis 23 Uhr erreichbar, auch sonntags und feiertags." },
  { icon: "schild", titel: "Ohne Kaution", text: "Keine Hinterlegung, kein Papierkram vorab." },
];

// --- Einleitungssaetze der Kategorieseiten ---------------------------------
// Je ein Satz, abgeleitet aus den Anzeigentiteln dieser Kategorie — also
// belegt, nicht erfunden. Robert liest gegen; Aendern ist hier eine Zeile.
// Leer lassen = die Kategorieseite zeigt nur Name und Anzahl.
export const KATEGORIE_TEXTE = {
  "Party & Feiern":
    "Zapfanlage, Bierzeltgarnituren, Musikboxen, Nebel- und Zuckerwattemaschine — alles, was eine Feier braucht, von der Hochzeit bis zum Geburtstag im Hof.",
  "Umzug & Transport":
    "Neue Umzugskartons in mehreren Größen, dazu Sackkarre, Treppensteiger und Transportwagen — geliefert und nach dem Umzug wieder abgeholt.",
  "Spiel & Spaß":
    "Hüpfburg mit TÜV, XXL-Jenga, 4-Gewinnt, Schwungtuch und SUP-Board — für Kindergeburtstage, Sommerfeste und den Tag am Wasser.",
  "Werkzeug & Reinigung":
    "Kärcher-Hochdruck- und Teppichreiniger, Bohrmaschine, Baustrahler und Linienlaser — Geräte, die man ein Wochenende braucht und nicht kaufen muss.",
  "Foto & Technik":
    "Beamer mit 100-Zoll-Leinwand, Sofortbildkameras und die PlayStation dazu — für Filmabend, Hochzeit oder Fotoecke auf der Feier.",
};

// --- Motive der Kategorie-Kacheln ------------------------------------------
// Fest gewaehlt, damit dort nicht zufaellig ein Kartonstapel vor weisser Wand
// landet. Fehlt ein Slug (Anzeige geloescht), nimmt der Bau das erste Bild der
// ersten Anzeige dieser Kategorie und warnt in der Ausgabe.
export const KATEGORIE_MOTIVE = {
  "Party & Feiern": "15-bierzeltgarnituren-mieten-mit-lieferservice-biertisch-gar-2799184091",
  "Umzug & Transport": "profi-sackkarre-mieten-250kg-tragkraft-auf-rechnung-lieferse-2939428950",
  "Spiel & Spaß": "huepfburg-mieten-tuev-geprueft-mit-lieferservice-rechnung-2807492142",
  "Werkzeug & Reinigung": "kaercher-profi-hochdruckreiniger-hd-5-15-c-plus-mieten-mit-f-3238091408",
  "Foto & Technik": "polaroid-kamera-mieten-sofortbildkamera-mit-lieferservice-3225566560",
};
