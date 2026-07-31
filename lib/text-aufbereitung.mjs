// Zerlegt einen Kleinanzeigen-Text in die Teile, aus denen eine Angebotsseite
// besteht: Beschreibung, technische Daten, Preisstaffel, Konditionen.
//
// WARUM ES DAS GIBT
// Roberts Texte sind fuer Kleinanzeigen geschrieben. Dort gibt es nur ein
// Textfeld, deshalb steht alles als Fliesstext untereinander — Begruessung,
// Beschreibung, Preise, Lieferung, Pfand, Querverweise auf andere Anzeigen,
// Grussformel. Auf einer eigenen Seite gehoert davon einiges gar nicht hin
// (Querverweise), anderes an eine feste Stelle (Preise als Tabelle, Konditionen
// als Block) und der Rest bleibt Beschreibung.
//
// WARUM PARSEN UND NICHT NEU SCHREIBEN
// `npm run sync` ueberschreibt content/anzeigen.json vollstaendig. Von Hand
// umgeschriebene Texte waeren beim naechsten Abruf weg. Der Parser laeuft
// dagegen bei jedem Bau neu ueber den frischen Text — Robert kann seine
// Anzeigen weiter pflegen wie bisher, die Homepage folgt automatisch.
//
// Was der Parser nicht sicher zuordnen kann, bleibt Beschreibungstext. Lieber
// ein Satz zu viel in der Beschreibung als eine still verschluckte Zusage.
// Einzelfaelle, die er falsch einsortiert, werden in inhalte.mjs korrigiert.

// --- Zeilen, die auf der eigenen Seite nichts verloren haben ---------------
const RAUS = [
  /^herzlich willkommen/i,                                     // Begruessung der Anzeige
  /(in|auf) mein(en|er|em) (anderen? )?(anzeigen?|seite|profil)/i, // Querverweise
  /weitere\s+(artikel|sachen|varianten|kartonvarianten|garnituren|sackkarren|spielsachen|formate)/i,
  /^ich freue mich, wenn ich euch/i,                            // Schlussfloskel
  /^(viele|liebe|beste)\s+gr[uü](ß|ss)e/i,                      // "Viele Grüße :)"
  /^(liebe gr[uü](ß|ss)e und gerne melden)/i,
  /^robert( kipf)?\s*:?\)?$/i,                                  // Unterschrift
  /^(top|ganz neu|neu)\b.{0,40}(qualit[aä]t|f[uü]r euch|im angebot)\s*[.:]?\s*$/i, // Anzeigen-Werbezeile
  /keine kommastelle im preis/i,                                // Kleinanzeigen-Einschraenkung
  /^\(?auch am (sonntag|wochenende)[^)]*\)?\.?$/i,              // Fragment hinter der Lieferzeile
  /^an jedem tag des jahres/i,
  /^jeden tag des jahres/i,
];

// --- Zeilen, die anderswo auf der Seite schon stehen -----------------------
// Oeffnungszeiten und "auf Rechnung" gelten fuer den ganzen Betrieb und stehen
// im Zusagen-Band der Startseite. Fuenfzigmal wiederholt sind sie Fuellmaterial.
//
// ACHTUNG: Diese Muster greifen nur auf KURZEN Zeilen (siehe GLOBAL_MAXLAENGE).
// Ohne diese Schranke verschwand der Satz "Ich verkaufe neue Bücherkartons für
// 2,20€ pro Stück auf Rechnung." komplett — nur weil "auf Rechnung" darin
// vorkam. Eine Zeile fliegt also nur raus, wenn sie im Wesentlichen nichts
// anderes sagt.
const GLOBAL = [
  /(abholung|ge[oö]ffnet|habe|haben).{0,30}7\s*tage/i,
  /7\s*tage die woche/i,
  /\b7\s*(uhr)?\s*(-|bis)\s*23\s*uhr/i,
  /365 tage im jahr/i,
  /^(gerne |bitte )?(mit|auf) rechnung( bei bedarf)?/i,
  /rechnung braucht/i,
];
const GLOBAL_MAXLAENGE = 110;

// --- Zeilen, die nur eine Rubrik ankuendigen ("Preise:", "Mietpreise") -----
// Sie stehen in der Anzeige vor einem Block. Auf der Seite hat jeder Block
// seine eigene Ueberschrift, die Ankuendigung waere doppelt.
const NUR_ANKUENDIGUNG =
  /^(die )?(miet)?(preise?|kosten|lieferung( (&|und) abholung)?|nebelfluid|zahlung|zubeh[oö]r)\s*:?\s*$/i;

// --- Erkennung der einzelnen Bausteine ------------------------------------
const IST_ZAHLUNG = /^zahlung\s*:/i;
const IST_PFAND = /^pfand\s*:/i;
const KEIN_PFAND = /^kein\s+pfand/i;
const IST_LIEFERUNG = /liefer(ung|geb[uü]hr)/i;
const IST_UEBERSCHRIFT =
  /^(daten|ma(ß|ss)e( aufgebaut)?|packma(ß|ss)|lieferumfang|technische (daten|details)|vorteile)\s*:?\s*$/i;

// Hinweise zur Mietdauer ohne konkreten Betrag — gehoeren unter die Tabelle.
const IST_PREISHINWEIS = /^(l[aä]ngere mietzeit|ab \d+ (tage|woche)|mengenrabatt)/i;

// Querverweis auf ein anderes Produkt ("Habe auch Umzugskartons für 2€").
// Ohne diese Ausnahme landet der fremde Preis in dieser Preistabelle.
const IST_QUERVERWEIS = /^(ich )?(habe|biete|vermiete) (auch|noch)|k[oö]nnt ihr (gerne )?(bei mir )?dazu/i;

// Preiszeile: enthaelt einen Betrag UND eine Mietdauer/Menge. Die zweite
// Bedingung haelt Saetze wie "5kg Popcorn pro Stunde" heraus.
const BETRAG = /(\d+(?:[.,]\d{1,2})?)\s*(?:€|EUR)/i;
const PREISZEILE_MAXLAENGE = 90;
const DAUER =
  /(\d+\.?\s*tage?|(jede[rn]?|zweite[rnm]?|weitere[rnm]?)\s+\w*\s*tag|pro tag|tagespreis|woche(nende)?|do-?\s*-?\s*mo|donnerstag|veranstaltung|pro st[uü]ck|pro garnitur|pro liter|sparpreis|endreinigung|preis)/i;

// --- Beschriftung der Preiszeilen -----------------------------------------
// Aus "langes Wochenende Donnerstag-Montag: 50€" wird "Langes Wochenende
// (Do–Mo)". Die Liste ist bewusst kurz: was nicht passt, behaelt Roberts
// eigene Formulierung, nur ohne den Betrag am Ende.
//
// Die Rolle sagt, wofuer der Betrag steht. Sie entscheidet, welcher Preis auf
// der Kachel landet:
//   einstieg – was der erste Tag / die erste Einheit kostet
//   paket    – laengere Mietzeiten am Stueck (2 Tage, Wochenende, Woche)
//   folge    – jeder weitere Tag; allein nie buchbar
//   zusatz   – Endreinigung, Nebelfluid und Aehnliches
//
// Ohne diese Unterscheidung warb die Huepfburg mit "ab 25 €" — das war der
// Folgetag ihres Gebläses. Und die Nebelmaschine mit "ab 4 €", dem Literpreis
// fuer Nebelfluid.
const BESCHRIFTUNG = [
  [/^(preis[:\s]*)?1\.?\s*(-|–|bis)\s*2\s*tage?/i, "1–2 Tage", "einstieg"],
  [/^(preis[:\s]*)?1\.?\s*tag/i, "1. Tag", "einstieg"],
  // Roberts Schreibweisen fuer den Folgetag gehen weit auseinander: "jeder
  // weitere Tag", "ab dem zweiten Tag", "ab zweitem Tag", einmal auch
  // "jeder weirere Tag". Alle meinen dasselbe, und keine davon darf als
  // Einstiegspreis auf der Kachel landen.
  [/jede[rn]?\s+wei\w*e[rn]?\s+tag|ab\s+(dem\s+|den\s+)?(zweiten?|zweitem|2\.?)\s*tag/i, "Jeder weitere Tag", "folge"],
  [/^(preis[:\s]*)?pro tag/i, "Pro Tag", "einstieg"],
  [/^(preis[:\s]*)?(pro )?veranstaltung/i, "Pro Veranstaltung", "einstieg"],
  [/lange?s? wochenende|do\s*-\s*mo|donnerstag\s*(bis|-)\s*montag/i, "Langes Wochenende (Do–Mo)", "paket"],
  [/^(1|eine|pro)\s*woche/i, "1 Woche", "paket"],
  [/^(\d+)\s*tage/i, (m) => `${m[1]} Tage`, "paket"],
  [/endreinigung/i, "Endreinigung (auf Wunsch)", "zusatz"],
  [/pro st[uü]ck/i, "Pro Stück", "einstieg"],
  [/pro liter/i, "Pro Liter", "zusatz"],
];

// Aufzaehlungszeichen, die Robert teils verwendet (*, -, •, ✅, ⚙️ …)
const AUFZAEHLUNG = /^[\s*•·\-–—]+|^[\p{Extended_Pictographic}️\s]+/u;

const putzen = (s) =>
  String(s || "")
    .replace(AUFZAEHLUNG, "")
    .replace(/\s*:?\s*$/, "")
    .replace(/^[,;:\s-]+/, "")
    .replace(/\s{2,}/g, " ")
    .trim();

// "(ab dem zweiten Tag 10€)" → "ab dem zweiten Tag 10€". Die Vorlage setzt die
// Klammern selbst; sonst stuenden dort zwei Paare.
const ohneKlammern = (s) => String(s || "").replace(/^\((.*)\)$/, "$1").trim();

function betragFormat(roh) {
  // "12" → "12 €", "2.20" → "2,20 €". Punkt wird zum Komma, damit auf einer
  // deutschen Seite nicht "2.20 €" steht.
  return `${String(roh).replace(".", ",")} €`;
}

function beschrifte(text) {
  const sauber = putzen(text);
  for (const [muster, ersatz, rolle] of BESCHRIFTUNG) {
    const m = sauber.match(muster);
    if (m) return { was: typeof ersatz === "function" ? ersatz(m) : ersatz, rolle };
  }
  // Kein Muster getroffen: Roberts Wortlaut behalten, Betrag und Doppelpunkt ab.
  // Rolle "einstieg", weil so eine Zeile meist einen eigenen Artikel meint
  // ("Werkzeugkasten: 20 €", "Vorschlaghammer: 5 € pro Tag").
  const rest = putzen(sauber.replace(BETRAG, "").replace(/[,:]\s*$/, ""));
  return { was: rest ? rest.charAt(0).toUpperCase() + rest.slice(1) : "Preis", rolle: "einstieg" };
}

// Eine Zeile kann mehrere Preise tragen:
// "Preis: 1.Tag: 12€, jeder weitere Tag 8€ pro Garnitur"
//
// Getrennt wird nur an Kommas, hinter denen noch ein Betrag folgt — und nie
// an einem Komma zwischen zwei Ziffern. Ohne das Lookbehind zerfiel "2,20€"
// in "2" und "20€", und in der Tabelle stand der zehnfache Preis.
const TRENNER = /(?<!\d),(?=[^,]*\d\s*(?:€|EUR))/;

// Zusaetze wie "pro Garnitur" oder "innerhalb von Leipzig" gehoeren zur
// Preiszeile. Ein halber Beschreibungssatz gehoert es nicht — deshalb gekappt.
const ZUSATZ_MAXLAENGE = 60;

function preiseAusZeile(zeile) {
  const treffer = [];
  for (const teil of zeile.split(TRENNER)) {
    const m = teil.match(BETRAG);
    if (!m) continue;
    const vorText = teil.slice(0, m.index);
    const zusatz = putzen(teil.slice(m.index + m[0].length).replace(/^[.\s]*/, ""));
    // putzen zuerst: bei "* 4 € pro Liter" ist vorText "* " — als Wahrheitswert
    // wahr, als Beschriftung leer. Ungeputzt hiesse die Zeile dann nur "Preis".
    // Der Zusatz zaehlt mit, weil die Rolle oft erst dort steht ("… pro Liter").
    const { was, rolle } = beschrifte(putzen(vorText) || `${zusatz} ${teil}`);
    // "Bodenfräse: 10€ extra pro Tag" ist Zubehoer, kein Einstiegspreis —
    // sonst wirbt der Hochdruckreiniger mit dem Preis seiner Fraese.
    const istAufpreis = /\bextra\b|\bzus[aä]tzlich\b|\baufpreis\b/i.test(zusatz);

    // Steht im Zusatz ein eigener Betrag ("15€ (ab dem zweiten Tag 10€)"), ist
    // das ein zweiter Preis und keine Fussnote. Als Zusatz gelesen ergaebe die
    // Tabellenzeile "Pro Tag ab dem zweiten Tag 10€ … 15 €".
    const zusatzBetrag = zusatz.match(BETRAG);
    treffer.push({
      was,
      rolle: istAufpreis && rolle === "einstieg" ? "zusatz" : rolle,
      betrag: betragFormat(m[1]),
      zusatz: !zusatzBetrag && zusatz.length <= ZUSATZ_MAXLAENGE ? ohneKlammern(zusatz) : "",
    });
    if (zusatzBetrag) {
      const eigen = beschrifte(ohneKlammern(zusatz));
      treffer.push({ was: eigen.was, rolle: eigen.rolle, betrag: betragFormat(zusatzBetrag[1]), zusatz: "" });
    }
  }
  return treffer;
}

/**
 * Zerlegt eine Kleinanzeigen-Beschreibung.
 *
 * Rueckgabe:
 *   absaetze     – Beschreibungstext, Roberts Wortlaut
 *   daten        – technische Angaben (Maße, Lieferumfang …) als Zeilen
 *   preise       – [{ was, betrag, zusatz }]
 *   preishinweis – "Längere Mietzeit individuelles Angebot." o. ä. oder null
 *   lieferung    – Zeile(n) zur Lieferung, unveraendert
 *   pfand        – Text hinter "Pfand:", "kein Pfand" oder null
 *   zahlung      – Text hinter "Zahlung:" oder null
 *   ungeklaert   – Zeilen, die wie Preis aussahen, aber nicht zerlegbar waren;
 *                  der Bau meldet sie, damit sie niemand uebersieht
 */
export function zerlege(beschreibung) {
  const zeilen = String(beschreibung || "").split("\n");

  const absaetze = [];
  const daten = [];
  const preise = [];
  const lieferung = [];
  const ungeklaert = [];
  let preishinweis = null;
  let pfand = null;
  let zahlung = null;
  let inDaten = false;

  for (const roh of zeilen) {
    const z = roh.trim();
    if (!z) {
      inDaten = false; // Leerzeile beendet einen Datenblock
      continue;
    }
    if (RAUS.some((m) => m.test(z))) continue;
    if (z.length <= GLOBAL_MAXLAENGE && GLOBAL.some((m) => m.test(z))) continue;
    if (NUR_ANKUENDIGUNG.test(putzen(z))) continue;

    if (IST_UEBERSCHRIFT.test(putzen(z))) {
      inDaten = true;
      continue;
    }
    if (KEIN_PFAND.test(z)) {
      pfand = "kein Pfand";
      continue;
    }
    if (IST_PFAND.test(z)) {
      pfand = putzen(z.replace(IST_PFAND, ""));
      continue;
    }
    if (IST_ZAHLUNG.test(z)) {
      zahlung = putzen(z.replace(IST_ZAHLUNG, ""));
      continue;
    }
    if (IST_LIEFERUNG.test(z)) {
      // Nur mit Betrag ist es eine Kondition; ohne ist es Fliesstext
      // ("Lieferung/Abholung jeden Tag des Jahres möglich").
      if (BETRAG.test(z)) lieferung.push(putzen(z));
      else absaetze.push(z);
      continue;
    }
    if (IST_PREISHINWEIS.test(z)) {
      preishinweis = z.replace(/\s*:?\s*$/, "");
      continue;
    }

    // Eine Preiszeile ist eine Zeile, keine Erzaehlung. Steht der Betrag mitten
    // in einem langen Satz ("Ich verkaufe neue Kartons für 2,20€ pro Stück, sie
    // sind sehr robust …"), ist der Satz Beschreibung — der Preis kommt dann
    // ueber inhalte.mjs in die Tabelle.
    const hatBetrag = BETRAG.test(z);
    if (hatBetrag && DAUER.test(z) && !IST_QUERVERWEIS.test(z) && z.length <= PREISZEILE_MAXLAENGE) {
      const gefunden = preiseAusZeile(z);
      if (gefunden.length) preise.push(...gefunden);
      else ungeklaert.push(z);
      continue;
    }

    // Kurze Zeile in einem Datenblock, klassische "Feld: Wert"-Zeile oder ein
    // Punkt aus einer Merkmalsliste (Robert schreibt sie mit * oder ✅).
    // Solche Zeilen als eigene Absaetze zu setzen ergaebe eine Kolonne aus
    // Einzeilern; als Liste sind sie das, was sie sind.
    const istFeldZeile = /^[A-Za-zÄÖÜäöüß .()/]{2,26}:\s*\S/.test(putzen(z));
    const istListenpunkt = AUFZAEHLUNG.test(roh.trimStart()) && z.length < 140;
    if ((inDaten || istFeldZeile || istListenpunkt) && z.length < 140 && !hatBetrag) {
      daten.push(putzen(z));
      continue;
    }

    absaetze.push(putzen(z));
  }

  return { absaetze, daten, preise, preishinweis, lieferung, pfand, zahlung, ungeklaert };
}
