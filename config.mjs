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
  strasse: "",
  plzOrt: "",
  telefon: "",
  email: "",
  ustId: "",
};

export const BILDER = {
  ordner: "content/bilder",
};
