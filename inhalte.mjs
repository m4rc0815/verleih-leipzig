// Eigene Angaben zu den einzelnen Angeboten — die Ebene zwischen Roberts
// Kleinanzeigen-Texten und der Homepage.
//
// WOZU
// `npm run sync` holt Titel, Preis und Text aus den Anzeigen und ueberschreibt
// content/anzeigen.json dabei vollstaendig. Alles, was hier steht, ueberlebt
// das: der Bau legt es ueber die frischen Daten. Roberts Anzeigen bleiben die
// Quelle, diese Datei ist die Redaktion.
//
// WAS HIER HINEIN GEHOERT
//   titel      – kurzer Name fuer die Homepage. Die Anzeigentitel sind fuer die
//                Suche bei Kleinanzeigen geschrieben ("… mieten Lieferservice
//                auf Rechnung", 43 von 50 mal das Wort "mieten"). Auf der
//                eigenen Seite steht das Versprechen im Zusagen-Band, nicht
//                fuenfzigmal in der Ueberschrift.
//   varianteVon – Slug des Hauptangebots. Diese Anzeige bekommt dann KEINE
//                eigene Seite und keine Kachel; sie erscheint als Variante beim
//                Hauptangebot, ihre Bilder wandern in dessen Galerie.
//   variante   – wie die Variante dort heisst ("mit Lehne", "bis 50 kg").
//   zubehoer   – true, wenn es kein weiteres Format desselben Artikels ist,
//                sondern etwas, das man dazu mietet (Geblaese zur Huepfburg).
//                Solche Preise zaehlen nicht fuer den Ab-Preis der Kachel.
//   preise     – nur noetig, wenn der Preis im Fliesstext steht und die
//                Aufbereitung ihn deshalb nicht als Tabellenzeile erkennt.
//                Achtung: friert die ganze Staffel ein.
//   preisKorrektur – ersetzt einzelne Betraege, z. B. { "1. Tag": "40 €" }.
//                Der Rest der Staffel kommt weiter aus der Anzeige. Trifft der
//                Schluessel keine Zeile mehr, meldet es der Bau.
//   art        – "verkauf", wenn der Artikel verkauft und nicht vermietet wird.
//   hinweis    – Satz, der oben auf der Angebotsseite steht.
//   offen      – Notiz fuer Robert. Erscheint NICHT auf der Seite, sondern im
//                Bau-Bericht, damit offene Punkte nicht in Vergessenheit geraten.
//
// Ein Slug, den es nicht (mehr) gibt, faellt im Bau-Bericht auf. Fehlt hier ein
// Eintrag, greift schlicht der Anzeigentitel — nichts geht kaputt.

export const ANZEIGEN = {
  // ═══ Werkzeug & Reinigung ═══════════════════════════════════════════════
  "bosch-linienlaser-laser-mieten-stativ-lieferservice-auf-rech-3047127765": {
    titel: "Bosch Linienlaser mit Stativ",
  },
  "leistungsstarker-baustrahler-mieten-umzug-beleuchtung-malern-3465213622": {
    titel: "Baustrahler",
  },
  "werzeug-mieten-bohrmaschine-akkuschrauber-leiter-lieferservi-2801703670": {
    // Im Anzeigentitel steht "Werzeug" — Tippfehler, der bei Kleinanzeigen
    // niemandem auffaellt, auf der eigenen Seite aber schon.
    titel: "Werkzeug: Bohrmaschine, Akkuschrauber, Leiter",
  },
  "kaercher-nassreiniger-teppichreiniger-mieten-lieferservice-2800802950": {
    titel: "Kärcher Teppich- und Nassreiniger",
  },
  "bolzenschneider-vorschlaghammer-mieten-auf-rechnung-3028168539": {
    titel: "Bolzenschneider und Vorschlaghammer",
  },
  "kaercher-profi-hochdruckreiniger-hd-5-15-c-plus-mieten-mit-f-3238091408": {
    titel: "Kärcher Hochdruckreiniger HD 5/15 C",
  },

  // ═══ Umzug & Transport ══════════════════════════════════════════════════
  "profi-sackkarre-mieten-250kg-tragkraft-auf-rechnung-lieferse-2939428950": {
    titel: "Sackkarre",
  },
  "treppensteiger-sackkarre-mieten-mit-rechnung-lieferservice-2799118052": {
    titel: "Treppensteiger-Sackkarre",
    varianteVon: "profi-sackkarre-mieten-250kg-tragkraft-auf-rechnung-lieferse-2939428950",
    variante: "Treppensteiger (für Treppen)",
  },
  "transportwagen-mieten-mit-rechnung-lieferservice-transport-u-2848001190": {
    titel: "Transportwagen",
  },

  // Kartons: fuenf Anzeigen, ein Artikel in fuenf Ausfuehrungen — alle zu
  // 2,20 € pro Stueck. Bei Kleinanzeigen bringt jede eigene Anzeige eigene
  // Sichtbarkeit; auf der eigenen Seite sind fuenf fast gleiche Kacheln nur
  // verwirrend. Der Preis steht bei allen im Fliesstext ("… für 2,20€ pro
  // Stück"), deshalb hier als Tabelle.
  //
  // Achtung: Kartons werden VERKAUFT. Auf einer Verleihseite muss das
  // dranstehen, sonst rechnet jemand mit Rueckgabe.
  "neue-profi-umzugskartons-45kg-50kg-robust-rechnung-lieferser-2799159900": {
    titel: "Umzugskartons",
    art: "verkauf",
    preise: [{ was: "Pro Stück", betrag: "2,20 €" }],
  },
  "neue-buecherkartons-umzugskartons-auf-rechnung-mit-lieferser-3020240411": {
    varianteVon: "neue-profi-umzugskartons-45kg-50kg-robust-rechnung-lieferser-2799159900",
    variante: "Bücher- und Archivkarton, bis 50 kg",
    preise: [{ was: "Pro Stück", betrag: "2,20 €" }],
  },
  "neue-umzugskartons-40kg-auf-rechnung-mit-lieferservice-3155887466": {
    varianteVon: "neue-profi-umzugskartons-45kg-50kg-robust-rechnung-lieferser-2799159900",
    variante: "bis 40 kg, verstärkter Boden ohne Klebeband",
    preise: [{ was: "Pro Stück", betrag: "2,20 €" }],
  },
  "neue-umzugskartons-auf-rechnung-40-kg-lieferung-bis-nach-hau-3082926034": {
    varianteVon: "neue-profi-umzugskartons-45kg-50kg-robust-rechnung-lieferser-2799159900",
    variante: "bis 40 kg",
    preise: [{ was: "Pro Stück", betrag: "2,20 €" }],
    offen:
      "Zwei Anzeigen beschreiben einen 40-kg-Karton (3082926034 und 3155887466). " +
      "Sind das zwei verschiedene Kartons? Wenn nein: eine Anzeige loeschen.",
  },
  "neue-umzugskartons-2-wellig-doppelter-boden-bis-30kg-mit-rec-3453848517": {
    varianteVon: "neue-profi-umzugskartons-45kg-50kg-robust-rechnung-lieferser-2799159900",
    variante: "bis 30 kg, zweiwellig mit doppeltem Boden, 54 l",
    preise: [{ was: "Pro Stück", betrag: "2,20 €" }],
  },
  // Das Set ist keine Kartonvariante, sondern ein Paket aus mehreren Artikeln —
  // deshalb ein eigenes Angebot.
  "neues-umzugsset-umzugskartons-auf-rechnung-mit-lieferservice-3029568245": {
    titel: "Umzugsset nach Bedarf",
    art: "verkauf",
    hinweis: "Die Zusammenstellung richtet sich nach deinem Bedarf, der Preis nach dem Umfang.",
  },

  // ═══ Party & Feiern ═════════════════════════════════════════════════════
  "xxl-profi-zapfanlage-mieten-hochzeit-feier-party-geburtstag-3172364445": {
    titel: "Zapfanlage XXL, beleuchtet",
    // Der Anzeigentext nennt 50 € fuer den ersten Tag, das Preisfeld 40 €.
    // Robert hat am 31.07.2026 bestaetigt: 40 € stimmt, der Text ist veraltet.
    // Korrigiert wird nur diese eine Zeile — die uebrige Staffel kommt weiter
    // aus der Anzeige und folgt automatisch, wenn Robert sie dort aendert.
    preisKorrektur: { "1. Tag": "40 €" },
    offen:
      "Der Anzeigentext bei Kleinanzeigen sagt weiterhin 50 € fuer den 1. Tag, die " +
      "Homepage zeigt die bestaetigten 40 €. Bitte den Anzeigentext nachziehen. " +
      "Und pruefen, ob die Staffel dazu passt: Wochenende 95 € und Woche 140 € " +
      "waren auf 50 € am ersten Tag gerechnet.",
  },
  "profi-nebelmaschine-mieten-inkl-led-beleuchtung-party-hochze-3443702693": {
    titel: "Nebelmaschine mit LED-Beleuchtung",
  },
  "partylicht-partybar-buehnenlicht-mieten-rechnung-lieferservi-3016622686": {
    titel: "Partybeleuchtung mit Schwarzlicht",
  },
  "seifenblasenmaschine-mieten-lieferservice-party-hochzeit-2801871330": {
    titel: "Seifenblasenmaschine",
  },
  "profi-seifenblasenmaschine-mieten-nebelmaschine-mit-lieferse-3118448264": {
    varianteVon: "seifenblasenmaschine-mieten-lieferservice-party-hochzeit-2801871330",
    variante: "Profi-Ausführung, auch als Nebelmaschine",
  },
  "bierpongtisch-mieten-bierpong-mit-lieferservice-rechnung-par-2801282671": {
    titel: "Bierpongtisch",
  },
  "stehtisch-mieten-mit-husse-lieferservice-rechnung-tisch-2799922216": {
    titel: "Stehtisch mit Husse",
  },
  "popkornmaschine-mieten-geburtstag-feier-rechnung-lieferservi-2847582358": {
    // "Popkorn" ist die Schreibweise der Anzeige; korrekt ist Popcorn.
    titel: "Popcornmaschine",
    offen:
      "Preisfeld der Anzeige sagt 40 €, der Anzeigentext 50 € pro Veranstaltung. " +
      "Die Seite nimmt jetzt den Text. Bitte das Preisfeld bei Kleinanzeigen nachziehen.",
  },
  "profi-zuckerwattemaschine-mieten-mit-lieferservice-rechnung-2799383085": {
    titel: "Zuckerwattemaschine",
  },
  "zuckerwattemaschine-mieten-rechnung-lieferservice-2923601122": {
    varianteVon: "profi-zuckerwattemaschine-mieten-mit-lieferservice-rechnung-2799383085",
    variante: "kleinere Ausführung",
  },
  "profi-eiswuerfelmaschine-klarstein-mieten-party-feier-hochze-3430127866": {
    titel: "Eiswürfelmaschine",
  },
  "hochzeitsbogen-mieten-traubogen-hochzeit-feier-geburtstag-3029158977": {
    titel: "Hochzeitsbogen",
  },

  // Bierzeltgarnituren: vier Anzeigen, ein Artikel in vier Groessen.
  "15-bierzeltgarnituren-mieten-mit-lieferservice-biertisch-gar-2799184091": {
    titel: "Bierzeltgarnitur",
  },
  "bierzeltgarnitur-mieten-mit-lieferservice-auf-rechnung-biert-3156702825": {
    varianteVon: "15-bierzeltgarnituren-mieten-mit-lieferservice-biertisch-gar-2799184091",
    variante: "kleine Ausführung, 4 Personen",
  },
  "bierzeltgarnitur-mieten-mit-lehne-biertisch-lieferservice-3126384885": {
    varianteVon: "15-bierzeltgarnituren-mieten-mit-lieferservice-biertisch-gar-2799184091",
    variante: "mit Lehne",
  },
  "bierzeltgarnitur-kinder-mieten-sitzgruppe-lieferservice-rech-2996325496": {
    varianteVon: "15-bierzeltgarnituren-mieten-mit-lieferservice-biertisch-gar-2799184091",
    variante: "für Kinder",
  },

  // Musikboxen: drei Geraete, eine Kachel.
  "jbl-1000-musikbox-partybox-mieten-mit-lieferservice-rechnung-2799145779": {
    titel: "Partybox",
  },
  "jbl-partybox-ultimate-1100w-mieten-profi-musikbox-3371564714": {
    varianteVon: "jbl-1000-musikbox-partybox-mieten-mit-lieferservice-rechnung-2799145779",
    variante: "JBL PartyBox Ultimate, 1100 W",
  },
  "karaoke-musikbox-partybox-mieten-800w-mikrofon-mit-rechnung-3084689835": {
    varianteVon: "jbl-1000-musikbox-partybox-mieten-mit-lieferservice-rechnung-2799145779",
    variante: "Karaoke-Box mit Mikrofon, 800 W",
  },
  "mikrofon-mieten-bluetooth-karaoke-feier-hochzeit-lieferservi-3180270030": {
    titel: "Bluetooth-Mikrofon",
  },

  // ═══ Spiel & Spaß ═══════════════════════════════════════════════════════
  "huepfburg-mieten-tuev-geprueft-mit-lieferservice-rechnung-2807492142": {
    titel: "Hüpfburg mit Rutsche, TÜV-geprüft",
    hinweis: "Den Preis mache ich dir gerne persönlich, er hängt vom Termin und vom Aufstellort ab.",
    offen:
      "Die Huepfburg ist das Aushaengeschild und hat als einzige kein Preisfeld (VB). " +
      "Wer sucht, vergleicht Preise — ohne Zahl springen Interessenten ab. " +
      "Ein Ab-Preis (z. B. 'ab 120 € pro Tag') waere hier viel wert.",
  },
  "leistungsstarkes-geblaese-huepfburg-mieten-auf-rechnung-3096180690": {
    varianteVon: "huepfburg-mieten-tuev-geprueft-mit-lieferservice-rechnung-2807492142",
    variante: "Gebläse einzeln",
    // Zubehoer, keine Ausfuehrung der Huepfburg: sein Preis darf nicht als
    // Einstiegspreis der Huepfburg gelten. Ohne diese Kennzeichnung warb die
    // Kachel mit "ab 25 €" (dem Folgetag des Geblaeses) und meldete
    // Suchmaschinen eine Huepfburg ab 25 €.
    zubehoer: true,
  },
  "xxl-jenga-turm-mieten-mit-rechnung-lieferservice-bis-zu-150c-2799927857": {
    titel: "XXL-Jenga, bis 150 cm",
  },
  "riesen-xxxl-jenga-2-20m-mieten-hochzeit-lieferservice-3155921253": {
    varianteVon: "xxl-jenga-turm-mieten-mit-rechnung-lieferservice-bis-zu-150c-2799927857",
    variante: "XXXL, bis 2,20 m",
  },
  "xxl-4-gewinnt-mieten-kindergeburtstag-spielzeug-mit-rechnung-2799122938": {
    titel: "XXL 4-Gewinnt",
  },
  "xxl-4-gewinnt-holz-spielzeug-mieten-holzspielzeug-auf-rechnu-3078925006": {
    varianteVon: "xxl-4-gewinnt-mieten-kindergeburtstag-spielzeug-mit-rechnung-2799122938",
    variante: "Holzausführung",
  },
  "schwungtuch-mieten-auf-rechnung-mit-lieferservice-3029496467": {
    titel: "Schwungtuch",
  },
  "holzspielzeug-spielzeug-mieten-auf-rechnung-mit-lieferservic-3029485345": {
    titel: "Holzspielzeug-Set: Mikado, Kubb, Jenga",
  },
  "sup-board-mieten-stand-up-paddlingboard-aufblasbar-lieferser-3131485456": {
    titel: "SUP-Board, aufblasbar",
  },

  // ═══ Foto & Technik ═════════════════════════════════════════════════════
  "xxl-leinwand-100-zoll-beamer-mieten-mit-lieferservice-rechnu-2800885745": {
    titel: "Beamer mit 100-Zoll-Leinwand",
  },
  "beamer-epson-tw-7100-mieten-auf-rechnung-bis-12-7m-bilddiago-3220908056": {
    varianteVon: "xxl-leinwand-100-zoll-beamer-mieten-mit-lieferservice-rechnu-2800885745",
    variante: "Epson TW 7100, bis 12,7 m Bilddiagonale",
  },
  "polaroid-kamera-mieten-sofortbildkamera-mit-lieferservice-3225566560": {
    titel: "Sofortbildkamera",
  },
  "sofortbildkamera-mieten-instax-mini-12-kamera-lieferservice-2801346514": {
    varianteVon: "polaroid-kamera-mieten-sofortbildkamera-mit-lieferservice-3225566560",
    variante: "Instax mini 12",
  },
  // Bleibt eigenstaendig: das ist ein Paket aus drei Geraeten, keine
  // Beamer-Variante.
  "playstation-5-beamer-jbl1000-mieten-mit-lieferservice-rechnu-2833742650": {
    titel: "Filmabend-Paket: PS5, Beamer und Partybox",
  },
  "hochzeitsfotografie-fotograf-geburtstag-kindergeburtstag-rec-3102221864": {
    titel: "Hochzeits- und Feierfotografie",
    hinweis: "Das ist eine Dienstleistung und kein Mietartikel. Der Preis richtet sich nach dem Termin.",
    offen:
      "Fotografie ist das einzige Angebot, das nichts mit Verleih zu tun hat, und steht " +
      "deshalb etwas verloren unter 'Foto & Technik'. Entweder eine eigene Rubrik " +
      "'Dienstleistungen' oder ganz von der Verleihseite nehmen.",
  },
};

// --- Konditionen, die fuer alle Angebote gelten ---------------------------
// Bisher standen sie in jedem Anzeigentext einzeln — die Lieferung in zwoelf
// verschiedenen Schreibweisen. Wo ein Angebot abweicht, steht die Abweichung
// in seinem eigenen Text und wird auf der Angebotsseite ausgewiesen.
export const KONDITIONEN = {
  lieferung: {
    preis: "40 €",
    text: "Lieferung und Abholung bis zur Wohnungstür, jeden Tag des Jahres. Bei einzelnen Angeboten weicht der Betrag ab und steht dann hier.",
  },
  pfand: {
    // WICHTIG: Bis Juli 2026 warb die Startseite mit "keine Kaution und keine
    // Unterlagen vorab", waehrend 23 der 50 Anzeigentexte "Pfand: Foto/Kopie
    // Ausweis" verlangten. Das ist als Werbung angreifbar. Jetzt steht hier,
    // was tatsaechlich gilt.
    text: "Bei den meisten Angeboten reicht ein Foto oder eine Kopie des Ausweises als Pfand. Geld hinterlegen musst du nicht.",
  },
  zahlung: { text: "Bar, per PayPal oder per Überweisung. Auf Rechnung auch für Firmen und Vereine." },
  zeiten: { text: "Abholung und Rückgabe sieben Tage die Woche zwischen 7 und 23 Uhr, auch sonntags und feiertags." },
};
