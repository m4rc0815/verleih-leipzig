# Verleih-Homepage „verleih-leipzig" — Umsetzungsplan

> **Für agentische Bearbeiter:** ERFORDERLICHER SUB-SKILL: `superpowers:subagent-driven-development` (empfohlen) oder `superpowers:executing-plans`, um diesen Plan Aufgabe für Aufgabe umzusetzen. Schritte nutzen Checkbox-Syntax (`- [ ]`).

**Ziel:** Eine statische, in der Bauphase passwortgeschützte Homepage, die Robert Kipfs 50 Mietangebote als filterbare Kachelgalerie mit Detailseiten zeigt und über GitHub Pages erreichbar ist.

**Architektur:** Node-Build-Skript ohne Framework, übernommen aus `finanz-webseite/`. Zwei getrennte Läufe: `sync.mjs` holt Anzeigen und Bilder von Kleinanzeigen in einen versionierten `content/`-Ordner; `build.mjs` erzeugt daraus `docs/` (HTML + WebP). Der Passwortschutz verschlüsselt fertige Seiten mit AES-256-GCM, der Schlüssel wird aus Benutzername **und** Passwort abgeleitet.

**Tech-Stack:** Node 24, `markdown-it`, `sharp` (WebP), `node:test` (eingebaute Testumgebung), `node:crypto.webcrypto`, GitHub Pages.

**Vorlage:** `/Users/marcmarx/Documents/Claude/Projects/finanz-webseite/` — nur lesen, nicht verändern.

**Quelldaten (bereits vorhanden):**
`/private/tmp/claude-502/-Users-marcmarx-Documents-Claude-Projects/69a5c27e-f2bd-462f-8a1f-4a49fff78973/scratchpad/robert_export/` — 50 Ordner mit `meta.json` und `beschreibung.md`. Dient als Ausgangsbestand; die Bilder werden neu in 1200 px geladen.

---

## Dateistruktur

| Datei | Verantwortung |
|---|---|
| `config.mjs` | Alle Einstellungen: Seitenname, Adresse, Gate, Kategorieregeln, Bildgrößen |
| `lib/kategorien.mjs` | Ordnet einen Anzeigentitel genau einer der 5 Kategorien zu |
| `lib/slug.mjs` | Erzeugt stabile, URL-taugliche Ordnernamen aus Titel + Anzeigen-ID |
| `lib/kleinanzeigen.mjs` | Ruft Bestandsliste und Einzelanzeigen ab, parst Metadaten, Text und Bild-URLs |
| `lib/bilder.mjs` | Erzeugt aus einem Originalbild die zwei WebP-Varianten |
| `lib/pruefliste.mjs` | Findet Textstellen mit Kleinanzeigen-Bezug |
| `sync.mjs` | Orchestriert den Abruf → schreibt `content/` |
| `crypt.mjs` | Verschlüsselt Seiten beim Build (aus Vorlage, erweitert um Benutzernamen) |
| `templates/layout.mjs` | Seitengerüst, Kachel, Detailseite, Galerie |
| `build.mjs` | Orchestriert den Seitenbau → schreibt `docs/` |
| `assets/style.css` | Design (aus Vorlage, Akzentfarbe grün) |
| `assets/filter.js` | Kategorie-Filter und Suche auf der Startseite |
| `assets/lightbox.js` | Bildergalerie auf der Detailseite |
| `assets/crypt.js` | Entschlüsselung im Browser (aus Vorlage, erweitert um Benutzernamen) |
| `test/*.test.mjs` | Tests zu `lib/` |

**Datenfluss:**
```
kleinanzeigen.de  ──sync.mjs──►  content/anzeigen.json
                                 content/bilder/<slug>/bild_NN.jpg   (1200 px, im Repo)
                                        │
                                        └──build.mjs──►  docs/index.html
                                                         docs/a/<slug>/index.html
                                                         docs/bilder/<slug>/*.webp
```

`content/` ist die Wahrheit und wird mitversioniert — dadurch bleibt die Seite baubar, auch wenn Kleinanzeigen den Zugriff sperrt oder Anzeigen verschwinden.

---

## Task 1: Projektgerüst

**Dateien:**
- Erstellen: `package.json`, `.gitignore`, `README.md`
- Kopieren aus Vorlage: `assets/style.css`, `templates/layout.mjs`, `crypt.mjs`, `assets/crypt.js`, `assets/filter.js`, `deploy.sh`

- [ ] **Schritt 1: Ordner und Git anlegen**

```bash
cd ~/Documents/Claude/Projects/verleih-leipzig
git init -b main
mkdir -p lib templates assets test content/bilder
```

- [ ] **Schritt 2: `package.json` schreiben**

```json
{
  "name": "verleih-leipzig",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "Statische Verleih-Homepage (Party-, Umzugs- und Werkzeugvermietung Leipzig), gebaut aus Kleinanzeigen-Daten.",
  "scripts": {
    "sync": "node sync.mjs",
    "build": "node build.mjs",
    "preview": "node build.mjs && npx --yes serve docs -l 4174",
    "serve": "npx --yes serve docs -l 4174",
    "test": "node --test test/",
    "deploy": "bash deploy.sh"
  },
  "dependencies": {
    "markdown-it": "^14.1.0",
    "sharp": "^0.35.3"
  }
}
```

- [ ] **Schritt 3: `.gitignore` schreiben**

```
node_modules/
.gate-password
.DS_Store
```

Die Zugangsdaten dürfen unter keinen Umständen ins Repo. `content/` steht bewusst **nicht** hier — es wird mitversioniert.

- [ ] **Schritt 4: Abhängigkeiten installieren**

Run: `npm install`
Erwartet: `added N packages`, kein Fehler. `sharp` bringt für Apple Silicon ein vorgebautes Binary mit.

- [ ] **Schritt 5: Vorlage-Dateien kopieren**

```bash
V=~/Documents/Claude/Projects/finanz-webseite
cp $V/assets/style.css assets/style.css
cp $V/assets/crypt.js assets/crypt.js
cp $V/crypt.mjs crypt.mjs
cp $V/templates/layout.mjs templates/layout.mjs
cp $V/deploy.sh deploy.sh
chmod +x deploy.sh
```

- [ ] **Schritt 6: Prüfen, dass Node die Kopien lädt**

Run: `node -e "import('./crypt.mjs').then(m => console.log(Object.keys(m)))"`
Erwartet: `[ 'deriveKey', 'encryptPage', 'gatePage' ]`

- [ ] **Schritt 7: Commit**

```bash
git add -A
git commit -m "chore: Projektgeruest aus finanz-webseite uebernommen"
```

---

## Task 2: Kategoriezuordnung (TDD)

Die Kleinanzeigen-Kategorien sind unbrauchbar (34 von 50 heißen „Weitere Dienstleistungen"). Die Zuordnung erfolgt über Schlüsselwörter im Titel, damit auch künftig neu abgerufene Anzeigen automatisch einsortiert werden.

**Reihenfolge ist bedeutsam:** „Baustrahler MIETEN Umzug Beleuchtung" enthält das Wort „Umzug", ist aber Werkzeug. Deshalb prüft die Umzugs-Regel nur enge Begriffe wie `umzugskarton`, nie das bloße Wort `umzug`.

**Dateien:**
- Erstellen: `lib/kategorien.mjs`
- Test: `test/kategorien.test.mjs`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

```js
// test/kategorien.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { kategorieFuer, KATEGORIEN } from "../lib/kategorien.mjs";

test("ordnet Umzugsartikel korrekt zu", () => {
  assert.equal(kategorieFuer("Profi Sackkarre mieten 250kg Tragkraft"), "Umzug & Transport");
  assert.equal(kategorieFuer("Neue Profi Umzugskartons 45kg/50kg robust"), "Umzug & Transport");
  assert.equal(kategorieFuer("Treppensteiger Sackkarre mieten"), "Umzug & Transport");
  assert.equal(kategorieFuer("Neue Bücherkartons Umzugskartons auf Rechnung"), "Umzug & Transport");
});

test("Werkzeug schlaegt das Wort Umzug im Titel", () => {
  // Falle: enthaelt "Umzug", ist aber Werkzeug
  assert.equal(
    kategorieFuer("Leistungsstarker Baustrahler MIETEN Umzug Beleuchtung Malern"),
    "Werkzeug & Reinigung"
  );
  assert.equal(kategorieFuer("Kärcher Profi Hochdruckreiniger HD 5/15 C Plus mieten"), "Werkzeug & Reinigung");
  assert.equal(kategorieFuer("Bosch Linienlaser Laser mieten Stativ"), "Werkzeug & Reinigung");
  assert.equal(kategorieFuer("Werzeug mieten Bohrmaschine Akkuschrauber Leiter"), "Werkzeug & Reinigung");
});

test("Foto & Technik erkennt Kameras und Beamer", () => {
  assert.equal(kategorieFuer("Polaroid Kamera mieten Sofortbildkamera"), "Foto & Technik");
  assert.equal(kategorieFuer("XXL Leinwand 100 Zoll+Beamer mieten"), "Foto & Technik");
  assert.equal(kategorieFuer("Playstation 5 Beamer JBL1000 mieten"), "Foto & Technik");
  assert.equal(kategorieFuer("Hochzeitsfotografie Fotograf Geburtstag"), "Foto & Technik");
});

test("Spiel & Spass erkennt Spielgeraete", () => {
  assert.equal(kategorieFuer("Leistungsstarkes Gebläse Hüpfburg mieten"), "Spiel & Spaß");
  assert.equal(kategorieFuer("Riesen XXXL Jenga 2,20m mieten Hochzeit"), "Spiel & Spaß");
  assert.equal(kategorieFuer("XXL 4- Gewinnt Holz Spielzeug mieten"), "Spiel & Spaß");
  assert.equal(kategorieFuer("SUP Board mieten Stand UP Paddlingboard"), "Spiel & Spaß");
  assert.equal(kategorieFuer("Schwungtuch mieten auf Rechnung"), "Spiel & Spaß");
});

test("alles Uebrige faellt auf Party & Feiern", () => {
  assert.equal(kategorieFuer("XXL Profi Zapfanlage MIETEN Hochzeit"), "Party & Feiern");
  assert.equal(kategorieFuer("Bierzeltgarnitur mieten mit Lehne Biertisch"), "Party & Feiern");
  assert.equal(kategorieFuer("Profi Nebelmaschine MIETEN inkl. LED Beleuchtung"), "Party & Feiern");
  assert.equal(kategorieFuer("Irgendwas völlig Unbekanntes"), "Party & Feiern");
});

test("KATEGORIEN listet alle fuenf in Anzeigereihenfolge", () => {
  assert.deepEqual(KATEGORIEN, [
    "Party & Feiern",
    "Umzug & Transport",
    "Spiel & Spaß",
    "Werkzeug & Reinigung",
    "Foto & Technik",
  ]);
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `node --test test/kategorien.test.mjs`
Erwartet: FAIL — `Cannot find module '../lib/kategorien.mjs'`

- [ ] **Schritt 3: `lib/kategorien.mjs` schreiben**

```js
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
```

- [ ] **Schritt 4: Test laufen lassen, Erfolg bestätigen**

Run: `node --test test/kategorien.test.mjs`
Erwartet: `# pass 6`, `# fail 0`

- [ ] **Schritt 5: Gegen alle 50 echten Titel prüfen**

```bash
S=/private/tmp/claude-502/-Users-marcmarx-Documents-Claude-Projects/69a5c27e-f2bd-462f-8a1f-4a49fff78973/scratchpad
node -e "
import('./lib/kategorien.mjs').then(async (m) => {
  const fs = await import('node:fs');
  const dir = process.argv[1];
  const zaehler = {};
  for (const d of fs.readdirSync(dir)) {
    const p = \`\${dir}/\${d}/meta.json\`;
    if (!fs.existsSync(p)) continue;
    const meta = JSON.parse(fs.readFileSync(p, 'utf8'));
    const k = m.kategorieFuer(meta.title);
    zaehler[k] = (zaehler[k] || 0) + 1;
    console.log(String(meta.index).padStart(2), k.padEnd(20), meta.title.slice(0, 55));
  }
  console.log('\n', zaehler);
});
" $S/robert_export
```

Erwartete Verteilung: Party & Feiern 20, Umzug & Transport 9, Spiel & Spaß 9, Werkzeug & Reinigung 6, Foto & Technik 6 — Summe 50. Weicht etwas ab, die Zeile im Protokoll suchen und die Regel nachschärfen, bevor es weitergeht.

- [ ] **Schritt 6: Commit**

```bash
git add lib/kategorien.mjs test/kategorien.test.mjs
git commit -m "feat: Kategoriezuordnung aus Anzeigentiteln"
```

---

## Task 3: Slug-Bildung (TDD)

Jede Anzeige braucht eine stabile Adresse. Der Titel allein reicht nicht: Vier Anzeigen heißen fast gleich („Neue Umzugskartons…"), und Titel ändern sich. Deshalb Titel-Slug **plus** Anzeigen-ID.

**Dateien:**
- Erstellen: `lib/slug.mjs`
- Test: `test/slug.test.mjs`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

```js
// test/slug.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { slugFuer } from "../lib/slug.mjs";

test("bildet kleingeschriebenen Bindestrich-Slug mit Anzeigen-ID", () => {
  assert.equal(
    slugFuer("Profi Sackkarre mieten 250kg Tragkraft", "2939428950"),
    "profi-sackkarre-mieten-250kg-tragkraft-2939428950"
  );
});

test("wandelt Umlaute lesbar um", () => {
  assert.equal(slugFuer("Hüpfburg mieten TÜV geprüft", "1"), "huepfburg-mieten-tuev-geprueft-1");
  assert.equal(slugFuer("Kärcher Nassreiniger", "2"), "kaercher-nassreiniger-2");
  assert.equal(slugFuer("Große Straße", "3"), "grosse-strasse-3");
});

test("entfernt Sonderzeichen und mehrfache Trenner", () => {
  assert.equal(slugFuer("XXL Profi Zapfanlage  MIETEN / Party!", "4"), "xxl-profi-zapfanlage-mieten-party-4");
  assert.equal(slugFuer("4- Gewinnt (Holz)", "5"), "4-gewinnt-holz-5");
});

test("kuerzt sehr lange Titel, haengt die ID aber immer an", () => {
  const lang = "Ein ausgesprochen langer Anzeigentitel der weit ueber jede sinnvolle Adresslaenge hinausgeht und immer weiter geht";
  const s = slugFuer(lang, "999");
  assert.ok(s.length <= 80, `Slug zu lang: ${s.length}`);
  assert.ok(s.endsWith("-999"), `ID fehlt: ${s}`);
});

test("unterscheidet gleichnamige Anzeigen ueber die ID", () => {
  const a = slugFuer("Neue Umzugskartons auf Rechnung", "111");
  const b = slugFuer("Neue Umzugskartons auf Rechnung", "222");
  assert.notEqual(a, b);
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `node --test test/slug.test.mjs`
Erwartet: FAIL — `Cannot find module '../lib/slug.mjs'`

- [ ] **Schritt 3: `lib/slug.mjs` schreiben**

```js
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
```

- [ ] **Schritt 4: Test laufen lassen, Erfolg bestätigen**

Run: `node --test test/slug.test.mjs`
Erwartet: `# pass 5`, `# fail 0`

- [ ] **Schritt 5: Eindeutigkeit über alle 50 echten Anzeigen prüfen**

```bash
S=/private/tmp/claude-502/-Users-marcmarx-Documents-Claude-Projects/69a5c27e-f2bd-462f-8a1f-4a49fff78973/scratchpad
node -e "
import('./lib/slug.mjs').then(async (m) => {
  const fs = await import('node:fs');
  const dir = process.argv[1];
  const slugs = [];
  for (const d of fs.readdirSync(dir)) {
    const p = \`\${dir}/\${d}/meta.json\`;
    if (!fs.existsSync(p)) continue;
    const meta = JSON.parse(fs.readFileSync(p, 'utf8'));
    slugs.push(m.slugFuer(meta.title, meta.adId));
  }
  const doppelt = slugs.filter((s, i) => slugs.indexOf(s) !== i);
  console.log('Slugs:', slugs.length, '| eindeutig:', new Set(slugs).size, '| doppelt:', doppelt);
});
" $S/robert_export
```

Erwartet: `Slugs: 50 | eindeutig: 50 | doppelt: []`

- [ ] **Schritt 6: Commit**

```bash
git add lib/slug.mjs test/slug.test.mjs
git commit -m "feat: stabile Slugs aus Titel und Anzeigen-ID"
```

---

## Task 4: Prüfliste für Kleinanzeigen-Bezüge (TDD)

Alle 50 Texte verweisen auf Kleinanzeigen („findet ihr auf meiner Seite", „in meinen anderen Anzeigen"). Die Texte bleiben unverändert; der Build meldet aber, wo diese Stellen sitzen, damit sie vor dem Öffentlichgehen gezielt bearbeitet werden können.

**Dateien:**
- Erstellen: `lib/pruefliste.mjs`
- Test: `test/pruefliste.test.mjs`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

```js
// test/pruefliste.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { findeBezuege } from "../lib/pruefliste.mjs";

test("findet Verweise auf andere Anzeigen", () => {
  const treffer = findeBezuege("Viele weitere Sachen zur Vermietung findet ihr in meinen anderen Anzeigen.");
  assert.equal(treffer.length, 1);
  assert.match(treffer[0].zeile, /anderen Anzeigen/);
  assert.equal(treffer[0].nr, 1);
});

test("findet Verweise auf die eigene Kleinanzeigen-Seite", () => {
  const treffer = findeBezuege("Herzlich willkommen auf meiner Seite :)");
  assert.equal(treffer.length, 1);
});

test("meldet die richtige Zeilennummer", () => {
  const text = "Zeile eins\nZeile zwei\nWeitere Sackkarren findet ihr auf meiner Seite.\nZeile vier";
  const treffer = findeBezuege(text);
  assert.equal(treffer.length, 1);
  assert.equal(treffer[0].nr, 3);
});

test("findet mehrere Stellen im selben Text", () => {
  const text = "Willkommen auf meiner Seite\nProduktinfo\nMehr in meinen anderen Anzeigen";
  assert.equal(findeBezuege(text).length, 2);
});

test("meldet unauffaelligen Text nicht", () => {
  assert.deepEqual(findeBezuege("Robuste Sackkarre bis 250 kg. Zahlung bar oder PayPal."), []);
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `node --test test/pruefliste.test.mjs`
Erwartet: FAIL — `Cannot find module '../lib/pruefliste.mjs'`

- [ ] **Schritt 3: `lib/pruefliste.mjs` schreiben**

```js
// Findet Textstellen, die sich auf Kleinanzeigen beziehen und auf einer eigenen
// Homepage schief klingen ("findet ihr auf meiner Seite").
//
// Die Texte werden bewusst NICHT veraendert — es sind Roberts Formulierungen mit
// seinen Zusagen. Der Build gibt nur eine Liste aus, damit vor dem
// Oeffentlichgehen gezielt entschieden werden kann.

const MUSTER = [
  /anderen?\s+anzeigen/i,
  /meiner\s+seite/i,
  /meine[rn]?\s+profil/i,
  /kleinanzeigen/i,
  /ebay/i,
];

export function findeBezuege(text) {
  const treffer = [];
  const zeilen = String(text || "").split("\n");
  zeilen.forEach((zeile, i) => {
    if (MUSTER.some((m) => m.test(zeile))) {
      treffer.push({ nr: i + 1, zeile: zeile.trim() });
    }
  });
  return treffer;
}
```

- [ ] **Schritt 4: Test laufen lassen, Erfolg bestätigen**

Run: `node --test test/pruefliste.test.mjs`
Erwartet: `# pass 5`, `# fail 0`

- [ ] **Schritt 5: Commit**

```bash
git add lib/pruefliste.mjs test/pruefliste.test.mjs
git commit -m "feat: Pruefliste fuer Kleinanzeigen-Bezuege in den Texten"
```

---

## Task 5: Kleinanzeigen-Abruf (TDD gegen gespeichertes HTML)

Der vorhandene Extraktor `extract_ad.js` (129 Zeilen im Scratchpad) funktioniert nachweislich — er hat alle 50 Anzeigen erfasst. Er wird als Modul übernommen, **ohne** die Bildverkleinerung: Die URLs mit `rule=$_57` liefern bereits 1200×1600.

Getestet wird gegen eine gespeicherte HTML-Datei, nicht gegen das Netz — sonst hängen die Tests von Kleinanzeigens Verfügbarkeit ab.

**Dateien:**
- Erstellen: `lib/kleinanzeigen.mjs`
- Test: `test/kleinanzeigen.test.mjs`, `test/fixtures/anzeige.html`

- [ ] **Schritt 1: HTML-Beispiel als Testvorlage sichern**

```bash
mkdir -p test/fixtures
curl -sL -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36" \
  "https://www.kleinanzeigen.de/s-anzeige/profi-sackkarre-mieten-250kg-tragkraft-auf-rechnung-lieferservice/2939428950-238-4266" \
  -o test/fixtures/anzeige.html
wc -c test/fixtures/anzeige.html
```

Erwartet: über 100.000 Bytes. Deutlich weniger heißt: blockiert oder Anzeige weg — dann eine andere Anzeigen-URL aus `content/anzeigen.json` nehmen.

- [ ] **Schritt 2: Fehlschlagenden Test schreiben**

```js
// test/kleinanzeigen.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parseAnzeige, dekodiereEntities, stripTags } from "../lib/kleinanzeigen.mjs";

const HTML = fs.readFileSync(path.join(import.meta.dirname, "fixtures/anzeige.html"), "utf8");
const URL_ = "https://www.kleinanzeigen.de/s-anzeige/profi-sackkarre-mieten-250kg-tragkraft-auf-rechnung-lieferservice/2939428950-238-4266";

test("dekodiert HTML-Entities inklusive Umlauten und Euro", () => {
  assert.equal(dekodiereEntities("Gr&uuml;&szlig;e &amp; 15&euro;"), "Grüße & 15€");
  assert.equal(dekodiereEntities("&#x2764; &#8364;"), "❤ €");
});

test("entfernt Tags und wandelt <br> in Zeilenumbrueche", () => {
  assert.equal(stripTags("<p>Zeile eins<br>Zeile zwei</p>"), "Zeile eins\nZeile zwei");
});

test("liest die Kernfelder einer Anzeige", () => {
  const a = parseAnzeige(HTML, URL_);
  assert.equal(a.anzeigenId, "2939428950");
  assert.match(a.titel, /Sackkarre/);
  assert.match(a.preis, /15/);
  assert.match(a.ort, /Leipzig/);
  assert.ok(a.beschreibung.length > 300, `Beschreibung zu kurz: ${a.beschreibung.length}`);
  assert.match(a.kategorie, />/); // Breadcrumb mit mehreren Ebenen
});

test("sammelt Bild-URLs in grosser Aufloesung, ohne Dubletten", () => {
  const a = parseAnzeige(HTML, URL_);
  assert.ok(a.bildUrls.length >= 1, "keine Bilder gefunden");
  assert.equal(new Set(a.bildUrls).size, a.bildUrls.length, "Dubletten enthalten");
  for (const u of a.bildUrls) assert.match(u, /rule=\$_57\./);
});

test("faellt bei fehlender Anzeigen-ID auf die URL zurueck", () => {
  const a = parseAnzeige("<html><body>leer</body></html>", URL_);
  assert.equal(a.anzeigenId, "2939428950");
});
```

- [ ] **Schritt 3: Test laufen lassen, Fehlschlag bestätigen**

Run: `node --test test/kleinanzeigen.test.mjs`
Erwartet: FAIL — `Cannot find module '../lib/kleinanzeigen.mjs'`

- [ ] **Schritt 4: `lib/kleinanzeigen.mjs` schreiben**

Übernommen aus `extract_ad.js` im Scratchpad, aufgeteilt in prüfbare Funktionen. Der Abruf (`holeAnzeige`, `holeBestandsliste`) ist getrennt vom Parsen, damit sich das Parsen ohne Netz testen lässt.

```js
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
  const re = new RegExp(`(?:id|class)="[^"]*${kennung}[^"]*"[^>]*>([\\s\\S]*?)<\\/(?:h1|h2|div|p|span|section)>`, "i");
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

// Liest die Bestandsliste eines Verkaeufers und liefert die Anzeigen-URLs.
export async function holeBestandsliste(bestandslisteUrl) {
  const html = await hole(bestandslisteUrl);
  const urls = new Set();
  for (const m of html.matchAll(/href="(\/s-anzeige\/[^"]+?\/\d+-\d+-\d+)"/g)) {
    urls.add("https://www.kleinanzeigen.de" + m[1]);
  }
  return [...urls];
}

export async function ladeBild(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} bei Bild ${url}`);
  return Buffer.from(await res.arrayBuffer());
}
```

- [ ] **Schritt 5: Test laufen lassen, Erfolg bestätigen**

Run: `node --test test/kleinanzeigen.test.mjs`
Erwartet: `# pass 5`, `# fail 0`

- [ ] **Schritt 6: Bestandsliste einmal gegen das echte Netz prüfen**

```bash
node -e "
import('./lib/kleinanzeigen.mjs').then(async (m) => {
  const urls = await m.holeBestandsliste('https://www.kleinanzeigen.de/s-bestandsliste.html?userId=45885794');
  console.log('gefundene Anzeigen:', urls.length);
  console.log(urls.slice(0, 3).join('\n'));
});
"
```

Erwartet: rund 50 Anzeigen. Kommen deutlich weniger, ist die Liste seitenweise aufgeteilt — dann in `holeBestandsliste` über `&pageNum=N` durchblättern, bis keine neuen URLs mehr dazukommen.

- [ ] **Schritt 7: Commit**

```bash
git add lib/kleinanzeigen.mjs test/kleinanzeigen.test.mjs test/fixtures/anzeige.html
git commit -m "feat: Abruf und Auswertung von Kleinanzeigen-Seiten"
```

---

## Task 6: Bildpipeline (TDD)

Aus jedem Originalbild (1200×1600 JPG) entstehen zwei WebP-Fassungen: eine kleine für die Kachel, eine große für die Detailansicht.

**Dateien:**
- Erstellen: `lib/bilder.mjs`
- Test: `test/bilder.test.mjs`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

```js
// test/bilder.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { erzeugeVarianten, GROESSEN } from "../lib/bilder.mjs";

async function testbild(breite, hoehe) {
  return sharp({
    create: { width: breite, height: hoehe, channels: 3, background: { r: 200, g: 120, b: 60 } },
  }).jpeg().toBuffer();
}

test("erzeugt Kachel- und Detailfassung als WebP", async () => {
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), "bilder-"));
  const ergebnis = await erzeugeVarianten(await testbild(1200, 1600), ziel, "bild_01");

  assert.ok(fs.existsSync(ergebnis.kachel), "Kachel fehlt");
  assert.ok(fs.existsSync(ergebnis.detail), "Detailbild fehlt");
  assert.match(ergebnis.kachel, /\.webp$/);
  assert.match(ergebnis.detail, /\.webp$/);

  const k = await sharp(ergebnis.kachel).metadata();
  const d = await sharp(ergebnis.detail).metadata();
  assert.equal(k.format, "webp");
  assert.equal(d.format, "webp");
  assert.ok(Math.max(k.width, k.height) <= GROESSEN.kachel, `Kachel zu gross: ${k.width}x${k.height}`);
  assert.ok(Math.max(d.width, d.height) <= GROESSEN.detail, `Detail zu gross: ${d.width}x${d.height}`);
});

test("behaelt das Seitenverhaeltnis bei", async () => {
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), "bilder-"));
  const ergebnis = await erzeugeVarianten(await testbild(1200, 1600), ziel, "hoch");
  const d = await sharp(ergebnis.detail).metadata();
  assert.ok(Math.abs(d.width / d.height - 0.75) < 0.02, `Verhaeltnis verzerrt: ${d.width}x${d.height}`);
});

test("vergroessert kleine Bilder nicht", async () => {
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), "bilder-"));
  const ergebnis = await erzeugeVarianten(await testbild(300, 400), ziel, "klein");
  const d = await sharp(ergebnis.detail).metadata();
  assert.equal(d.width, 300, "wurde hochskaliert");
});

test("liefert die Dateigroessen zurueck", async () => {
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), "bilder-"));
  const ergebnis = await erzeugeVarianten(await testbild(1200, 1600), ziel, "bild_01");
  assert.ok(ergebnis.bytes > 0);
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `node --test test/bilder.test.mjs`
Erwartet: FAIL — `Cannot find module '../lib/bilder.mjs'`

- [ ] **Schritt 3: `lib/bilder.mjs` schreiben**

```js
// Erzeugt aus einem Originalbild die beiden WebP-Fassungen der Seite:
// eine kleine fuer die Kachel der Startseite, eine grosse fuer die Detailansicht.
//
// WebP statt JPG, weil es bei gleicher Wahrnehmungsqualitaet rund 30 % kleiner
// ausfaellt — bei 283 Bildern macht das den Unterschied zwischen ~57 MB und ~20 MB.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

export const GROESSEN = {
  kachel: 500,  // laengste Kante der Kachelfassung
  detail: 1200, // laengste Kante der Detailfassung
};

const QUALITAET = { kachel: 72, detail: 82 };

export async function erzeugeVarianten(eingabe, zielOrdner, basisname) {
  fs.mkdirSync(zielOrdner, { recursive: true });

  const kachel = path.join(zielOrdner, `${basisname}-k.webp`);
  const detail = path.join(zielOrdner, `${basisname}.webp`);

  // withoutEnlargement: kleine Originale werden nicht kuenstlich hochgerechnet.
  await sharp(eingabe)
    .rotate() // EXIF-Ausrichtung anwenden, sonst liegen Hochformate quer
    .resize({ width: GROESSEN.kachel, height: GROESSEN.kachel, fit: "inside", withoutEnlargement: true })
    .webp({ quality: QUALITAET.kachel })
    .toFile(kachel);

  await sharp(eingabe)
    .rotate()
    .resize({ width: GROESSEN.detail, height: GROESSEN.detail, fit: "inside", withoutEnlargement: true })
    .webp({ quality: QUALITAET.detail })
    .toFile(detail);

  const bytes = fs.statSync(kachel).size + fs.statSync(detail).size;
  return { kachel, detail, bytes };
}
```

- [ ] **Schritt 4: Test laufen lassen, Erfolg bestätigen**

Run: `node --test test/bilder.test.mjs`
Erwartet: `# pass 4`, `# fail 0`

- [ ] **Schritt 5: Commit**

```bash
git add lib/bilder.mjs test/bilder.test.mjs
git commit -m "feat: WebP-Bildpipeline in zwei Groessen"
```

---

## Task 7: Zugang mit Benutzername und Passwort (TDD)

Die Vorlage leitet den Schlüssel allein aus dem Passwort ab. Hier fließen **beide** Eingaben ein: `PBKDF2(benutzername + "\n" + passwort)`. Damit sind wirklich beide Angaben nötig — kein Schein-Login.

Der Trennstrich `\n` ist bedeutsam: Ohne ihn ergäben Benutzer `ab` mit Passwort `cd` und Benutzer `a` mit Passwort `bcd` denselben Schlüssel.

**Dateien:**
- Ändern: `crypt.mjs` (aus Vorlage), `assets/crypt.js` (aus Vorlage)
- Test: `test/crypt.test.mjs`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

```js
// test/crypt.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto as wc } from "node:crypto";
import { deriveKey, encryptPage, gatePage, zugangsGeheimnis } from "../crypt.mjs";

const SALT = "mm+feezqLXaVs+Ld7ugoVw==";
const RUNDEN = 1000; // im Test klein halten, sonst dauert jeder Lauf Sekunden

async function entschluessele(geheim, iv, ct) {
  const key = await deriveKey(geheim, SALT, RUNDEN, ["decrypt"]);
  const buf = await wc.subtle.decrypt(
    { name: "AES-GCM", iv: Buffer.from(iv, "base64") },
    key,
    Buffer.from(ct, "base64")
  );
  return new TextDecoder().decode(buf);
}

test("verbindet Benutzername und Passwort eindeutig", () => {
  assert.equal(zugangsGeheimnis("robert", "geheim"), "robert\ngeheim");
  // Ohne Trenner waeren diese beiden Paare identisch — mit Trenner nicht:
  assert.notEqual(zugangsGeheimnis("ab", "cd"), zugangsGeheimnis("a", "bcd"));
});

test("Benutzername wird ohne Ruecksicht auf Gross-/Kleinschreibung verarbeitet", () => {
  assert.equal(zugangsGeheimnis("Robert", "x"), zugangsGeheimnis("robert", "x"));
  assert.equal(zugangsGeheimnis("  robert  ", "x"), zugangsGeheimnis("robert", "x"));
});

test("Passwort bleibt buchstabengetreu", () => {
  assert.notEqual(zugangsGeheimnis("r", "Geheim"), zugangsGeheimnis("r", "geheim"));
  assert.notEqual(zugangsGeheimnis("r", " geheim"), zugangsGeheimnis("r", "geheim"));
});

test("richtige Zugangsdaten entschluesseln die Seite", async () => {
  const klartext = "<html><body>Geheimer Inhalt</body></html>";
  const key = await deriveKey(zugangsGeheimnis("robert", "geheim"), SALT, RUNDEN);
  const { iv, ct } = await encryptPage(klartext, key, SALT, "index.html");
  assert.equal(await entschluessele(zugangsGeheimnis("robert", "geheim"), iv, ct), klartext);
});

test("falscher Benutzername scheitert trotz richtigem Passwort", async () => {
  const key = await deriveKey(zugangsGeheimnis("robert", "geheim"), SALT, RUNDEN);
  const { iv, ct } = await encryptPage("<html>x</html>", key, SALT, "index.html");
  await assert.rejects(() => entschluessele(zugangsGeheimnis("falsch", "geheim"), iv, ct));
});

test("falsches Passwort scheitert trotz richtigem Benutzernamen", async () => {
  const key = await deriveKey(zugangsGeheimnis("robert", "geheim"), SALT, RUNDEN);
  const { iv, ct } = await encryptPage("<html>x</html>", key, SALT, "index.html");
  await assert.rejects(() => entschluessele(zugangsGeheimnis("robert", "falsch"), iv, ct));
});

test("gleiche Seite ergibt gleichen Geheimtext (kleine Git-Unterschiede)", async () => {
  const key = await deriveKey(zugangsGeheimnis("robert", "geheim"), SALT, RUNDEN);
  const a = await encryptPage("<html>gleich</html>", key, SALT, "index.html");
  const b = await encryptPage("<html>gleich</html>", key, SALT, "index.html");
  assert.equal(a.ct, b.ct);
});

test("die Gate-Seite verraet keinen Klartext und traegt beide Felder", () => {
  const html = gatePage({ salt: SALT, iterations: RUNDEN, iv: "aaa", ct: "bbb" });
  assert.match(html, /id="gate-user"/);
  assert.match(html, /id="gate-pw"/);
  assert.match(html, /noindex/);
  assert.doesNotMatch(html, /Sackkarre|Zapfanlage|Bierzelt/);
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `node --test test/crypt.test.mjs`
Erwartet: FAIL — `zugangsGeheimnis is not a function`

- [ ] **Schritt 3: `crypt.mjs` anpassen**

Drei Änderungen an der Kopie aus der Vorlage:

**3a — `zugangsGeheimnis` ergänzen** (neu, ganz oben nach den Importen einfügen):

```js
// Verbindet Benutzername und Passwort zu einem Geheimnis, aus dem der Schluessel
// abgeleitet wird. Der Zeilenumbruch als Trenner ist notwendig: ohne ihn ergaeben
// ("ab","cd") und ("a","bcd") denselben Schluessel.
//
// Der Benutzername wird normalisiert (getrimmt, kleingeschrieben), damit
// "Robert" und " robert " denselben Zugang oeffnen. Das Passwort bleibt
// buchstabengetreu — dort ist jede Abweichung beabsichtigt.
export function zugangsGeheimnis(benutzer, passwort) {
  return `${String(benutzer || "").trim().toLowerCase()}\n${String(passwort || "")}`;
}
```

**3b — `deriveKey` um die Verwendungsart erweitern**, damit dieselbe Funktion im Test auch zum Entschlüsseln taugt. Die Zeile

```js
    ["encrypt"]
```

wird ersetzt durch den neuen Parameter (Signatur oben mitändern auf `deriveKey(password, saltB64, iterations, usages = ["encrypt"])`):

```js
    usages
```

**3c — `gatePage` um das Benutzerfeld erweitern.** Der Formularblock wird ersetzt durch:

```html
  <form id="gate-form" autocomplete="off">
    <input type="text" id="gate-user" class="gate-input" placeholder="Benutzername"
           autocomplete="username" aria-label="Benutzername" autofocus>
    <input type="password" id="gate-pw" class="gate-input" placeholder="Passwort"
           autocomplete="current-password" aria-label="Passwort">
    <label class="gate-remember"><input type="checkbox" id="gate-remember" checked> angemeldet bleiben</label>
    <button type="submit" class="gate-btn" id="gate-btn">Entsperren</button>
  </form>
```

Ebenfalls in `gatePage` anzupassen (Text der Vorlage):
- `<title>Geschützt · Finanzanalysen</title>` → `<title>Geschützt</title>`
- Der Untertitel → `Diese Seite ist noch im Aufbau. Bitte melde dich an.`

- [ ] **Schritt 4: `assets/crypt.js` anpassen**

**4a — Feld einlesen** (nach `var input = document.getElementById("gate-pw");` ergänzen):

```js
  var userInput = document.getElementById("gate-user");
```

**4b — Speicherschlüssel umbenennen**, damit sich die beiden Seiten nicht ins Gehege kommen:

```js
  var LOCK_KEY = "vl_gate_lock";
  var CRED_KEY = "vl_gate_cred";
```

**4c — Geheimnis bilden** (identisch zur Node-Seite, sonst passt der Schlüssel nicht):

```js
  function zugangsGeheimnis(benutzer, passwort) {
    return String(benutzer || "").trim().toLowerCase() + "\n" + String(passwort || "");
  }
```

**4d — Merken und Wiedervorlage auf beide Felder umstellen.** `storePassword`/`rememberedPassword`/`forgetPassword` speichern statt des Passworts das fertige Geheimnis:

```js
  function storeCred(geheimnis) {
    try {
      var store = remember && remember.checked ? localStorage : sessionStorage;
      store.setItem(CRED_KEY, geheimnis);
    } catch (e) {}
  }
  function rememberedCred() {
    try {
      return localStorage.getItem(CRED_KEY) || sessionStorage.getItem(CRED_KEY);
    } catch (e) { return null; }
  }
  function forgetCred() {
    try {
      localStorage.removeItem(CRED_KEY);
      sessionStorage.removeItem(CRED_KEY);
    } catch (e) {}
  }
```

**4e — Absenden umstellen.** Der `submit`-Zuhörer bildet das Geheimnis aus beiden Feldern:

```js
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (applyLockUI()) return;
    var user = userInput.value;
    var pw = input.value;
    if (!user || !pw) return;
    btn.disabled = true;
    var label = btn.textContent;
    btn.textContent = "Prüfe…";
    attempt(zugangsGeheimnis(user, pw), false).then(function (ok) {
      if (!ok) {
        btn.disabled = false;
        btn.textContent = label;
        input.value = "";
        input.focus();
        registerFail();
      }
    });
  });
```

Fehlermeldungen in `registerFail` von „Falsches Passwort." auf „Benutzername oder Passwort falsch." ändern. Alle übrigen Vorkommen von `storePassword`/`rememberedPassword`/`forgetPassword` auf die neuen Namen umstellen.

- [ ] **Schritt 5: Test laufen lassen, Erfolg bestätigen**

Run: `node --test test/crypt.test.mjs`
Erwartet: `# pass 8`, `# fail 0`

- [ ] **Schritt 6: Node- und Browser-Fassung auf Gleichlauf prüfen**

Beide Seiten müssen exakt dasselbe Geheimnis bilden, sonst lässt sich nichts entsperren. Der Vergleich läuft ohne Browser, indem die Browser-Datei als Text geprüft wird:

```bash
node -e "
const fs = require('fs');
const js = fs.readFileSync('assets/crypt.js', 'utf8');
const treffer = js.match(/function zugangsGeheimnis[\s\S]*?\n  }/);
if (!treffer) { console.error('FEHLER: zugangsGeheimnis fehlt in assets/crypt.js'); process.exit(1); }
const browser = new Function('return ' + treffer[0].replace('function zugangsGeheimnis', 'function'))();
import('./crypt.mjs').then((m) => {
  const faelle = [['Robert','geheim'], ['  robert ','Geheim'], ['a','bcd'], ['ab','cd']];
  let ok = true;
  for (const [u, p] of faelle) {
    const a = m.zugangsGeheimnis(u, p), b = browser(u, p);
    if (a !== b) { ok = false; console.error('ABWEICHUNG', JSON.stringify([u,p]), JSON.stringify(a), JSON.stringify(b)); }
  }
  console.log(ok ? '✓ Node und Browser bilden dasselbe Geheimnis' : '✗ Abweichung');
  process.exit(ok ? 0 : 1);
});
"
```

Erwartet: `✓ Node und Browser bilden dasselbe Geheimnis`

- [ ] **Schritt 7: Commit**

```bash
git add crypt.mjs assets/crypt.js test/crypt.test.mjs
git commit -m "feat: Zugang mit Benutzername und Passwort statt nur Passwort"
```

---

## Task 8: Konfiguration

Alle Schalter an einer Stelle — vor allem die beiden, die später umgelegt werden: Passwortschutz aus, Kleinanzeigen-Link aus.

**Dateien:**
- Erstellen: `config.mjs`

- [ ] **Schritt 1: `config.mjs` schreiben**

```js
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
  iterations: 200000,               // PBKDF2-Runden (SHA-256)
  credentialsFile: ".gate-password", // lokal, gitignored: Zeile 1 Benutzername, Zeile 2 Passwort
  metaFile: "gate-meta.json",       // mitversioniert: das oeffentliche Salz
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
```

- [ ] **Schritt 2: Prüfen, dass die Konfiguration lädt**

Run: `node -e "import('./config.mjs').then(c => console.log(c.SITE.projectName, '| Gate:', c.GATE.enabled))"`
Erwartet: `Verleih Leipzig | Gate: true`

- [ ] **Schritt 3: Commit**

```bash
git add config.mjs
git commit -m "feat: Konfiguration mit Schaltern fuer Gate und Anzeigen-Link"
```

---

## Task 9: Abrufskript `sync.mjs`

Holt die Bestandsliste, dann jede Anzeige, dann jedes Bild in 1200 px. Ergebnis ist `content/` — die versionierte Wahrheit, aus der gebaut wird.

Wichtig: **schonend abrufen.** Eine kurze Pause zwischen den Aufrufen, sonst wirkt es wie ein Angriff und wird geblockt.

**Dateien:**
- Erstellen: `sync.mjs`

- [ ] **Schritt 1: `sync.mjs` schreiben**

```js
// Holt Roberts Anzeigen samt Bildern von Kleinanzeigen nach content/.
//
// content/ wird mitversioniert und ist die Wahrheit fuer den Bau: Die Seite
// bleibt dadurch baubar, auch wenn Kleinanzeigen den Zugriff sperrt oder
// einzelne Anzeigen verschwinden.
//
// Der Abruf ist bewusst langsam (Pause zwischen den Aufrufen) — schnelle
// Serienabrufe werden geblockt.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cfg from "./config.mjs";
import { holeBestandsliste, holeAnzeige, ladeBild } from "./lib/kleinanzeigen.mjs";
import { slugFuer } from "./lib/slug.mjs";
import { kategorieFuer } from "./lib/kategorien.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT = path.join(__dirname, "content");
const BILDER = path.join(__dirname, cfg.BILDER.ordner);
const PAUSE_MS = 900;

const schlafe = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  fs.mkdirSync(BILDER, { recursive: true });

  console.log("→ Bestandsliste abrufen…");
  const urls = await holeBestandsliste(cfg.BESTANDSLISTE);
  console.log(`  ${urls.length} Anzeigen gefunden`);
  if (urls.length === 0) throw new Error("Bestandsliste leer — Seitenaufbau geaendert oder geblockt?");

  const anzeigen = [];
  const fehler = [];
  let bilderNeu = 0;
  let bilderVorhanden = 0;

  for (const [i, url] of urls.entries()) {
    await schlafe(PAUSE_MS);
    try {
      const a = await holeAnzeige(url);
      const slug = slugFuer(a.titel, a.anzeigenId);
      const bildOrdner = path.join(BILDER, slug);
      fs.mkdirSync(bildOrdner, { recursive: true });

      const bilder = [];
      for (const [j, bildUrl] of a.bildUrls.entries()) {
        const name = `bild_${String(j + 1).padStart(2, "0")}.jpg`;
        const ziel = path.join(bildOrdner, name);
        if (fs.existsSync(ziel) && fs.statSync(ziel).size > 0) {
          bilderVorhanden++;      // schon geladen → nicht erneut anfassen
        } else {
          await schlafe(250);
          fs.writeFileSync(ziel, await ladeBild(bildUrl));
          bilderNeu++;
        }
        bilder.push(name);
      }

      anzeigen.push({
        slug,
        nr: i + 1,
        anzeigenId: a.anzeigenId,
        titel: a.titel,
        preis: a.preis,
        ort: a.ort,
        datum: a.datum,
        kategorie: kategorieFuer(a.titel),
        kategorieQuelle: a.kategorie,
        beschreibung: a.beschreibung,
        url: a.url,
        bilder,
      });
      console.log(`  ${String(i + 1).padStart(2)}/${urls.length} ${a.titel.slice(0, 55)} (${bilder.length} Bilder)`);
    } catch (e) {
      fehler.push({ url, fehler: e.message });
      console.error(`  ✗ ${url}: ${e.message}`);
    }
  }

  // Verwaiste Bildordner melden (Anzeige geloescht) — aber nicht selbst loeschen.
  const bekannte = new Set(anzeigen.map((a) => a.slug));
  const verwaist = fs.readdirSync(BILDER).filter((d) => !bekannte.has(d));

  fs.writeFileSync(
    path.join(CONTENT, "anzeigen.json"),
    JSON.stringify({ abgerufen: new Date().toISOString().slice(0, 10), anzeigen }, null, 2) + "\n"
  );

  console.log("\n── Abruf-Bericht ─────────────────────────");
  console.log(`Anzeigen        : ${anzeigen.length} von ${urls.length}`);
  console.log(`Bilder neu      : ${bilderNeu}`);
  console.log(`Bilder vorhanden: ${bilderVorhanden}`);
  if (verwaist.length) {
    console.log(`Verwaiste Ordner: ${verwaist.length} — Anzeige entfernt?`);
    for (const v of verwaist) console.log(`  · content/bilder/${v}`);
    console.log("  (bleiben liegen; bei Bedarf von Hand loeschen)");
  }
  if (fehler.length) {
    console.log(`\nFehlgeschlagen  : ${fehler.length}`);
    for (const f of fehler) console.log(`  · ${f.url} — ${f.fehler}`);
  }
  console.log("──────────────────────────────────────────\n");

  if (anzeigen.length === 0) process.exit(1);
}

main().catch((e) => {
  console.error("Abbruch:", e.message);
  process.exit(1);
});
```

- [ ] **Schritt 2: Abruf laufen lassen**

Run: `npm run sync`
Erwartet: rund 50 Anzeigen, rund 283 neue Bilder, keine Fehler. Laufzeit etwa 6–8 Minuten (die Pausen sind Absicht).

- [ ] **Schritt 3: Ergebnis prüfen**

```bash
node -e "
const d = require('./content/anzeigen.json');
const bilder = d.anzeigen.reduce((s, a) => s + a.bilder.length, 0);
const kat = {};
for (const a of d.anzeigen) kat[a.kategorie] = (kat[a.kategorie] || 0) + 1;
console.log('Anzeigen:', d.anzeigen.length, '| Bilder:', bilder, '| abgerufen:', d.abgerufen);
console.log('Kategorien:', kat);
const ohneBild = d.anzeigen.filter(a => a.bilder.length === 0);
const ohneText = d.anzeigen.filter(a => a.beschreibung.length < 100);
console.log('ohne Bild:', ohneBild.map(a => a.titel));
console.log('ohne Text:', ohneText.map(a => a.titel));
"
du -sh content/bilder
```

Erwartet: 50 Anzeigen, ~283 Bilder, Kategorien wie in Task 2, keine Anzeige ohne Bild oder Text. Ordnergröße etwa 55–60 MB (Originale, aus denen die kleineren WebP entstehen).

- [ ] **Schritt 4: Bildmaße stichprobenartig prüfen**

```bash
node -e "
const sharp = require('sharp');
const fs = require('fs');
const dirs = fs.readdirSync('content/bilder').slice(0, 5);
Promise.all(dirs.map(async d => {
  const f = fs.readdirSync('content/bilder/' + d)[0];
  const m = await sharp('content/bilder/' + d + '/' + f).metadata();
  return d.slice(0, 30) + ' → ' + m.width + 'x' + m.height;
})).then(r => console.log(r.join('\n')));
"
```

Erwartet: durchweg 1200×1600 oder 1600×1200 — nicht 337×450.

- [ ] **Schritt 5: Commit**

```bash
git add sync.mjs content/
git commit -m "feat: Abrufskript; Anzeigen und Bilder in 1200 px erfasst"
```

Der Commit ist groß (rund 57 MB). Das ist beabsichtigt und einmalig — die Originale bleiben als Sicherung im Repo, ausgeliefert werden nur die kleineren WebP-Fassungen. GitHub warnt erst bei Einzeldateien über 50 MB; das größte Bild hier liegt bei etwa 250 KB.

---

## Task 10: Seitengerüst und Bausteine

Die Kopie aus der Vorlage wird auf diesen Zweck umgebaut: Navigation, Kachel, Detailseite, Galerie.

**Dateien:**
- Ändern: `templates/layout.mjs` (aus Vorlage), `assets/style.css` (aus Vorlage)
- Erstellen: `assets/lightbox.js`
- Ändern: `assets/filter.js` (aus Vorlage)

- [ ] **Schritt 1: Navigation und Gerüst umbauen**

In `templates/layout.mjs` die `NAV`-Liste ersetzen:

```js
const NAV = [
  { key: "start", label: "Alle Angebote", href: (r) => `${r}index.html` },
  { key: "kontakt", label: "Kontakt", href: (r) => `${r}kontakt.html` },
  { key: "impressum", label: "Impressum", href: (r) => `${r}impressum.html` },
];
```

Das Disclaimer-Band der Vorlage (Zeile mit `disclaimer-banner`, „Keine Anlageberatung") ersatzlos entfernen. In `documentShell` den Seitentitel-Zusatz von „Finanzanalysen mit Claude" auf `cfg.SITE.projectName` umstellen. Die Funktionen `fmtScore`, `analysisHero` und alles, was mit Rating oder Sektor zu tun hat, löschen — sie haben hier keine Entsprechung.

- [ ] **Schritt 2: Kachel-Baustein ergänzen**

Neu in `templates/layout.mjs`:

```js
// Eine Kachel der Startseite. Die data-Attribute steuern Filter und Suche —
// die Werte sind bereits kleingeschrieben, damit filter.js nicht jedes Mal
// umwandeln muss.
export function kachel(a, relRoot = "") {
  const bild = a.bilder.length
    ? `${relRoot}bilder/${a.slug}/${a.bilder[0].replace(/\.jpg$/, "-k.webp")}`
    : "";
  const suchtext = `${a.titel} ${a.kategorie} ${a.beschreibung}`.toLowerCase();
  return `<a class="angebot-card" href="${relRoot}a/${a.slug}/index.html"
   data-titel="${esc(a.titel.toLowerCase())}"
   data-kategorie="${esc(a.kategorie)}"
   data-such="${esc(suchtext.slice(0, 400))}"
   data-preis="${esc(preisZahl(a.preis))}">
  <div class="angebot-bild">
    ${bild ? `<img src="${esc(bild)}" alt="${esc(a.titel)}" loading="lazy" width="500" height="500">`
           : `<div class="angebot-kein-bild" aria-hidden="true">📦</div>`}
  </div>
  <div class="angebot-text">
    <span class="angebot-kategorie">${esc(a.kategorie)}</span>
    <h3 class="angebot-titel">${esc(a.titel)}</h3>
    <span class="angebot-preis">${esc(a.preis || "auf Anfrage")}</span>
  </div>
</a>`;
}

// Preis als Zahl fuer die Sortierung; "VB" und Leerwerte hinten einsortieren.
export function preisZahl(preis) {
  const m = String(preis || "").match(/(\d+)/);
  return m ? m[1] : "99999";
}
```

- [ ] **Schritt 3: Detailseite und Galerie ergänzen**

```js
// Detailseite: grosses Bild mit Vorschaureihe darunter, danach der vollstaendige
// Anzeigentext. Der Text wird unveraendert uebernommen — nur Zeilenumbrueche
// werden zu Absaetzen.
export function detailSeite(a, relRoot = "../../", opt = {}) {
  const bilder = a.bilder.map((b) => ({
    gross: `${relRoot}bilder/${a.slug}/${b.replace(/\.jpg$/, ".webp")}`,
    klein: `${relRoot}bilder/${a.slug}/${b.replace(/\.jpg$/, "-k.webp")}`,
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

  const absaetze = String(a.beschreibung)
    .split(/\n{2,}/)
    .map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("\n");

  const anfrage = opt.anzeigenLink
    ? `<a class="anfrage-btn" href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">${esc(opt.anzeigenLinkLabel)}</a>`
    : "";

  return `<article class="angebot-detail container">
  <nav class="brotkrumen"><a href="${relRoot}index.html">Alle Angebote</a> › <span>${esc(a.kategorie)}</span></nav>
  <header class="angebot-kopf">
    <h1>${esc(a.titel)}</h1>
    <div class="angebot-fakten">
      <span class="fakt-preis">${esc(a.preis || "auf Anfrage")}</span>
      ${a.ort ? `<span class="fakt">${esc(a.ort)}</span>` : ""}
      ${a.datum ? `<span class="fakt">${esc(a.datum)}</span>` : ""}
    </div>
  </header>
  ${galerie}
  <div class="angebot-beschreibung prose">${absaetze}</div>
  ${anfrage}
</article>`;
}
```

- [ ] **Schritt 4: `assets/lightbox.js` schreiben**

```js
// Bildergalerie der Detailseite: Klick auf eine Vorschau tauscht das grosse Bild.
// Bewusst schlicht — kein Overlay, keine Abhaengigkeiten.
(function () {
  var gross = document.getElementById("galerie-gross");
  if (!gross) return;
  var vorschauen = Array.prototype.slice.call(document.querySelectorAll(".galerie-vorschau"));
  if (!vorschauen.length) return;

  function zeige(btn) {
    gross.src = btn.getAttribute("data-gross");
    vorschauen.forEach(function (v) { v.classList.toggle("is-active", v === btn); });
  }

  vorschauen.forEach(function (btn) {
    btn.addEventListener("click", function () { zeige(btn); });
  });

  // Pfeiltasten blaettern durch die Bilder.
  document.addEventListener("keydown", function (e) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    var i = vorschauen.findIndex(function (v) { return v.classList.contains("is-active"); });
    if (i < 0) return;
    var next = e.key === "ArrowRight" ? (i + 1) % vorschauen.length
                                      : (i - 1 + vorschauen.length) % vorschauen.length;
    zeige(vorschauen[next]);
    vorschauen[next].focus();
  });
})();
```

- [ ] **Schritt 5: `assets/filter.js` umbauen**

Die Vorlage filtert nach Sektor und Region. Hier: Kategorie-Knöpfe und Suche.

```js
// Filtern und Suchen auf der Startseite. Rein clientseitig, ohne Nachladen.
(function () {
  var grid = document.getElementById("angebot-grid");
  if (!grid) return;
  var karten = Array.prototype.slice.call(grid.querySelectorAll(".angebot-card"));
  var suche = document.getElementById("f-suche");
  var knoepfe = Array.prototype.slice.call(document.querySelectorAll(".f-kat"));
  var sortierung = document.getElementById("f-sort");
  var zaehler = document.getElementById("f-zaehler");
  var leer = document.getElementById("f-leer");
  var aktiveKategorie = "";

  function anwenden() {
    var q = (suche && suche.value || "").trim().toLowerCase();
    var sichtbar = 0;

    karten.forEach(function (k) {
      var passtSuche = !q || k.dataset.such.indexOf(q) !== -1;
      var passtKat = !aktiveKategorie || k.dataset.kategorie === aktiveKategorie;
      var zeigen = passtSuche && passtKat;
      k.hidden = !zeigen;
      if (zeigen) sichtbar++;
    });

    var art = sortierung ? sortierung.value : "titel";
    karten.slice().sort(function (a, b) {
      if (art === "preis-auf") return parseInt(a.dataset.preis, 10) - parseInt(b.dataset.preis, 10);
      if (art === "preis-ab") return parseInt(b.dataset.preis, 10) - parseInt(a.dataset.preis, 10);
      return a.dataset.titel.localeCompare(b.dataset.titel, "de");
    }).forEach(function (k) { grid.appendChild(k); });

    if (zaehler) zaehler.textContent = sichtbar + " von " + karten.length + " Angeboten";
    if (leer) leer.hidden = sichtbar !== 0;
  }

  knoepfe.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var wert = btn.dataset.kategorie || "";
      aktiveKategorie = aktiveKategorie === wert ? "" : wert; // nochmal klicken hebt auf
      knoepfe.forEach(function (b) {
        b.classList.toggle("is-active", b.dataset.kategorie === aktiveKategorie && aktiveKategorie !== "");
      });
      anwenden();
    });
  });

  if (suche) suche.addEventListener("input", anwenden);
  if (sortierung) sortierung.addEventListener("change", anwenden);
  anwenden();
})();
```

- [ ] **Schritt 6: Akzentfarbe und neue Bausteine im CSS**

In `assets/style.css` den Farbblock oben ändern:

```css
  --accent: #1f7a4d;       /* Gruen — Verleih statt Finanzen */
  --accent-dark: #155c39;
  --yellow: #e6f4ec;       /* sanftes Gruen fuer Feature-Baender */
```

Und die neuen Bausteine ergänzen (ans Dateiende):

```css
/* --- Kachelraster der Startseite ------------------------------------------ */
.angebot-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.1rem;
  margin: 1.5rem 0 3rem;
}
.angebot-card {
  display: flex; flex-direction: column;
  background: var(--card); border-radius: var(--radius);
  box-shadow: var(--shadow); overflow: hidden;
  text-decoration: none; color: inherit;
  transition: transform .15s ease, box-shadow .15s ease;
}
.angebot-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); }
.angebot-bild { aspect-ratio: 1; background: #f2f2ef; display: grid; place-items: center; }
.angebot-bild img { width: 100%; height: 100%; object-fit: cover; display: block; }
.angebot-kein-bild { font-size: 2.5rem; opacity: .35; }
.angebot-text { padding: .8rem .9rem 1rem; display: flex; flex-direction: column; gap: .3rem; }
.angebot-kategorie { font-size: .72rem; color: var(--accent); font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
.angebot-titel { font-size: .95rem; line-height: 1.3; margin: 0; font-weight: 600; }
.angebot-preis { font-weight: 700; font-size: 1.05rem; margin-top: auto; }

/* --- Filterleiste --------------------------------------------------------- */
.filterleiste { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; margin: 1.2rem 0 .4rem; }
.f-kat {
  border: 1px solid var(--line); background: var(--card); color: var(--ink);
  border-radius: var(--radius-pill); padding: .42rem .95rem; font: inherit; font-size: .88rem;
  cursor: pointer; transition: background .12s ease, border-color .12s ease;
}
.f-kat:hover { border-color: var(--accent); }
.f-kat.is-active { background: var(--accent); border-color: var(--accent); color: #fff; }
.f-suche { flex: 1 1 200px; min-width: 160px; padding: .5rem .85rem; border: 1px solid var(--line); border-radius: var(--radius-pill); font: inherit; }
.f-zaehler { font-size: .85rem; color: var(--ink-soft); margin: .3rem 0 0; }

/* --- Galerie der Detailseite ---------------------------------------------- */
.galerie-buehne { margin: 0 0 .7rem; background: #f2f2ef; border-radius: var(--radius); overflow: hidden; }
.galerie-buehne img { width: 100%; height: auto; display: block; max-height: 70vh; object-fit: contain; }
.galerie-reihe { display: flex; gap: .5rem; flex-wrap: wrap; }
.galerie-vorschau { border: 2px solid transparent; border-radius: var(--radius-sm); padding: 0; background: none; cursor: pointer; line-height: 0; overflow: hidden; }
.galerie-vorschau img { width: 68px; height: 68px; object-fit: cover; }
.galerie-vorschau.is-active { border-color: var(--accent); }

/* --- Detailseite ---------------------------------------------------------- */
.brotkrumen { font-size: .85rem; color: var(--ink-soft); margin: 1rem 0; }
.angebot-fakten { display: flex; gap: .9rem; flex-wrap: wrap; align-items: baseline; margin: .4rem 0 1.2rem; }
.fakt-preis { font-size: 1.5rem; font-weight: 700; color: var(--accent); }
.fakt { font-size: .9rem; color: var(--ink-soft); }
.anfrage-btn {
  display: inline-block; margin: 1.5rem 0 3rem; padding: .8rem 1.5rem;
  background: var(--accent); color: #fff; border-radius: var(--radius-pill);
  text-decoration: none; font-weight: 600;
}
.anfrage-btn:hover { background: var(--accent-dark); }

/* --- Hinweis auf fehlende Pflichtangaben ---------------------------------- */
.fehlt-hinweis { background: #fff4e5; border: 1px solid #f0c68a; border-radius: var(--radius-sm); padding: 1rem 1.2rem; margin: 1rem 0; }

@media (max-width: 600px) {
  .angebot-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: .7rem; }
  .f-suche { flex-basis: 100%; }
}
```

- [ ] **Schritt 7: Commit**

```bash
git add templates/layout.mjs assets/
git commit -m "feat: Kachel, Detailseite, Galerie und Filter im gruenen Design"
```

---

## Task 11: Bauskript `build.mjs`

Liest `content/anzeigen.json`, erzeugt die WebP-Fassungen, schreibt Startseite und 50 Detailseiten nach `docs/` — verschlüsselt, solange `GATE.enabled` gesetzt ist.

**Dateien:**
- Erstellen: `build.mjs`

- [ ] **Schritt 1: Grundgerüst mit Sicherung schreiben**

```js
// Baut docs/ aus content/. docs/ ist reiner Bauausgang und wird vorher geleert,
// damit entfernte Anzeigen keine verwaisten Seiten hinterlassen.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { webcrypto as wc } from "node:crypto";
import * as cfg from "./config.mjs";
import * as T from "./templates/layout.mjs";
import { deriveKey, encryptPage, gatePage, zugangsGeheimnis } from "./crypt.mjs";
import { erzeugeVarianten } from "./lib/bilder.mjs";
import { findeBezuege } from "./lib/pruefliste.mjs";
import { KATEGORIEN } from "./lib/kategorien.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS = path.join(__dirname, "docs");
const ASSETS = path.join(__dirname, "assets");
const CONTENT = path.join(__dirname, "content");

// Sicherung: Eine gewerbliche Seite darf nicht ohne Impressum oeffentlich gehen.
if (!cfg.GATE.enabled) {
  const fehlend = ["strasse", "plzOrt"].filter((f) => !String(cfg.KONTAKT[f] || "").trim());
  if (fehlend.length) {
    console.error(
      `\nABBRUCH: Der Passwortschutz ist aus (config.mjs → GATE.enabled = false),\n` +
      `aber im Impressum fehlen noch: ${fehlend.join(", ")}.\n` +
      `Eine gewerbliche Seite ohne vollstaendiges Impressum darf nicht oeffentlich sein.\n` +
      `→ KONTAKT in config.mjs fuellen ODER GATE.enabled wieder auf true setzen.\n`
    );
    process.exit(1);
  }
}

const daten = JSON.parse(fs.readFileSync(path.join(CONTENT, "anzeigen.json"), "utf8"));
const anzeigen = daten.anzeigen;
if (!anzeigen.length) {
  console.error("ABBRUCH: content/anzeigen.json enthaelt keine Anzeigen. Erst `npm run sync` laufen lassen.");
  process.exit(1);
}

fs.rmSync(DOCS, { recursive: true, force: true });
fs.mkdirSync(DOCS, { recursive: true });
```

- [ ] **Schritt 2: Bilder umwandeln**

```js
// --- Bilder: aus jedem Original die beiden WebP-Fassungen ------------------
let bilderErzeugt = 0;
let bytesGesamt = 0;
for (const a of anzeigen) {
  const quelle = path.join(__dirname, cfg.BILDER.ordner, a.slug);
  const ziel = path.join(DOCS, "bilder", a.slug);
  for (const b of a.bilder) {
    const eingabe = path.join(quelle, b);
    if (!fs.existsSync(eingabe)) {
      console.warn(`  ! Bild fehlt: ${a.slug}/${b}`);
      continue;
    }
    const { bytes } = await erzeugeVarianten(eingabe, ziel, b.replace(/\.jpg$/, ""));
    bilderErzeugt++;
    bytesGesamt += bytes;
  }
}
```

- [ ] **Schritt 3: Startseite und Detailseiten erzeugen**

```js
// --- Seiten ----------------------------------------------------------------
const seiten = []; // gepuffert → am Ende offen oder verschluesselt geschrieben
function schreibeSeite(pfad, html) { seiten.push({ pfad, html }); }

// Startseite
const filterleiste = `<div class="filterleiste">
  ${KATEGORIEN.map((k) => `<button type="button" class="f-kat" data-kategorie="${k}">${k}</button>`).join("\n  ")}
  <input type="search" id="f-suche" class="f-suche" placeholder="Suchen…" aria-label="Angebote durchsuchen">
  <select id="f-sort" aria-label="Sortierung">
    <option value="titel">A–Z</option>
    <option value="preis-auf">Preis aufsteigend</option>
    <option value="preis-ab">Preis absteigend</option>
  </select>
</div>
<p class="f-zaehler" id="f-zaehler"></p>`;

schreibeSeite(
  path.join(DOCS, "index.html"),
  T.documentShell({
    title: `${cfg.SITE.projectName} — ${cfg.SITE.tagline}`,
    relRoot: "",
    active: "start",
    content: `<div class="container">
      ${filterleiste}
      <div class="angebot-grid" id="angebot-grid">
        ${anzeigen.map((a) => T.kachel(a, "")).join("\n")}
      </div>
      <p id="f-leer" hidden>Keine Angebote gefunden.</p>
    </div>`,
    scripts: ["assets/filter.js"],
  })
);

// Detailseiten
for (const a of anzeigen) {
  schreibeSeite(
    path.join(DOCS, "a", a.slug, "index.html"),
    T.documentShell({
      title: `${a.titel} — ${cfg.SITE.projectName}`,
      relRoot: "../../",
      active: "start",
      content: T.detailSeite(a, "../../", {
        anzeigenLink: cfg.ANZEIGEN_LINK.enabled,
        anzeigenLinkLabel: cfg.ANZEIGEN_LINK.label,
      }),
      scripts: ["assets/lightbox.js"],
    })
  );
}
```

`documentShell` muss dafür den neuen Parameter `scripts` unterstützen — in `templates/layout.mjs` vor `</body>` einfügen:

```js
${(scripts || []).map((s) => `<script src="${relRoot}${s}"></script>`).join("\n")}
```

- [ ] **Schritt 4: Beiwerk, Verschlüsselung und Bericht**

```js
// --- Beiwerk ---------------------------------------------------------------
const assetsOut = path.join(DOCS, "assets");
fs.mkdirSync(assetsOut, { recursive: true });
for (const f of fs.readdirSync(ASSETS)) {
  fs.copyFileSync(path.join(ASSETS, f), path.join(assetsOut, f));
}
fs.writeFileSync(path.join(DOCS, ".nojekyll"), "");

// --- Zugangsdaten und Salz -------------------------------------------------
function leseZugang() {
  const envU = (process.env.SITE_USER || "").trim();
  const envP = (process.env.SITE_PASSWORD || "").trim();
  if (envU && envP) return { benutzer: envU, passwort: envP };

  const datei = path.join(__dirname, cfg.GATE.credentialsFile);
  if (fs.existsSync(datei)) {
    const zeilen = fs.readFileSync(datei, "utf8").split("\n").map((z) => z.trim()).filter(Boolean);
    if (zeilen.length >= 2) return { benutzer: zeilen[0], passwort: zeilen[1] };
    throw new Error(
      `"${cfg.GATE.credentialsFile}" braucht zwei Zeilen: Zeile 1 Benutzername, Zeile 2 Passwort.`
    );
  }
  throw new Error(
    `Passwortschutz ist an (config.mjs → GATE.enabled), aber es gibt keine Zugangsdaten.\n` +
    `→ Datei "${cfg.GATE.credentialsFile}" anlegen (Zeile 1 Benutzername, Zeile 2 Passwort)\n` +
    `  ODER SITE_USER und SITE_PASSWORD als Umgebungsvariablen setzen.`
  );
}

function ladeOderErzeugeSalz() {
  const datei = path.join(__dirname, cfg.GATE.metaFile);
  if (fs.existsSync(datei)) {
    const m = JSON.parse(fs.readFileSync(datei, "utf8"));
    if (m.salt && m.iterations) return m;
  }
  const meta = {
    salt: Buffer.from(wc.getRandomValues(new Uint8Array(16))).toString("base64"),
    iterations: cfg.GATE.iterations,
  };
  fs.writeFileSync(datei, JSON.stringify(meta, null, 2) + "\n");
  return meta;
}

const relRootFuer = (p) => {
  const rel = path.relative(DOCS, path.dirname(p));
  return !rel || rel === "." ? "" : rel.split(path.sep).map(() => "..").join("/") + "/";
};

let verschluesselt = 0;
if (cfg.GATE.enabled) {
  const { benutzer, passwort } = leseZugang();
  const meta = ladeOderErzeugeSalz();
  const key = await deriveKey(zugangsGeheimnis(benutzer, passwort), meta.salt, meta.iterations);
  for (const s of seiten) {
    const id = path.relative(DOCS, s.pfad).split(path.sep).join("/");
    const { iv, ct } = await encryptPage(s.html, key, meta.salt, id);
    fs.mkdirSync(path.dirname(s.pfad), { recursive: true });
    fs.writeFileSync(s.pfad, gatePage({ relRoot: relRootFuer(s.pfad), salt: meta.salt, iterations: meta.iterations, iv, ct }));
    verschluesselt++;
  }
} else {
  for (const s of seiten) {
    fs.mkdirSync(path.dirname(s.pfad), { recursive: true });
    fs.writeFileSync(s.pfad, s.html);
  }
}

// --- Bericht ---------------------------------------------------------------
const bezuege = anzeigen
  .map((a) => ({ titel: a.titel, slug: a.slug, treffer: findeBezuege(a.beschreibung) }))
  .filter((e) => e.treffer.length);

fs.writeFileSync(
  path.join(__dirname, "pruefliste.md"),
  `# Prüfliste: Textstellen mit Kleinanzeigen-Bezug\n\n` +
  `Stand: ${daten.abgerufen} · ${bezuege.length} von ${anzeigen.length} Anzeigen betroffen\n\n` +
  `Diese Formulierungen stammen aus den Kleinanzeigen-Texten und klingen auf einer\n` +
  `eigenen Homepage schief. Vor dem Öffentlichgehen mit Robert durchgehen.\n\n` +
  bezuege.map((e) =>
    `## ${e.titel}\n\`a/${e.slug}/\`\n\n` +
    e.treffer.map((t) => `- Zeile ${t.nr}: „${t.zeile}"`).join("\n")
  ).join("\n\n") + "\n"
);

const kat = {};
for (const a of anzeigen) kat[a.kategorie] = (kat[a.kategorie] || 0) + 1;

console.log("\n── Bau-Bericht ───────────────────────────");
console.log(`Seiten            : ${seiten.length} (1 Start + ${anzeigen.length} Angebote)`);
console.log(`Bilder umgewandelt: ${bilderErzeugt} → ${(bytesGesamt / 1048576).toFixed(1)} MB WebP`);
console.log(`Kategorien        : ${Object.entries(kat).map(([k, n]) => `${k} ${n}`).join(" · ")}`);
console.log(`Passwortschutz    : ${cfg.GATE.enabled ? `AN — ${verschluesselt} Seiten verschlüsselt` : "AUS — Seiten offen"}`);
console.log(`Kleinanzeigen-Link: ${cfg.ANZEIGEN_LINK.enabled ? "AN" : "AUS"}`);
console.log(`Prüfliste         : ${bezuege.length} Anzeigen mit Bezug → pruefliste.md`);
if (!cfg.KONTAKT.telefon && !cfg.KONTAKT.email) {
  console.log(`\n⚠ Kontaktdaten fehlen noch (config.mjs → KONTAKT).`);
}
console.log("──────────────────────────────────────────\n");
```

- [ ] **Schritt 5: Zugangsdaten anlegen — macht Marc selbst**

Ich lege die Datei nicht an und fülle sie nicht. Marc führt aus:

```bash
cd ~/Documents/Claude/Projects/verleih-leipzig
printf '%s\n%s\n' 'WUNSCH-BENUTZERNAME' 'WUNSCH-PASSWORT' > .gate-password
chmod 600 .gate-password
```

Prüfen, dass die Datei **nicht** im Repo landet:

Run: `git check-ignore -v .gate-password`
Erwartet: eine Zeile, die auf `.gitignore` verweist. Kommt nichts, ist die Datei nicht ignoriert — dann sofort `.gitignore` korrigieren, bevor irgendetwas committet wird.

- [ ] **Schritt 6: Bauen**

Run: `npm run build`
Erwartet: 51 Seiten, 283 Bilder umgewandelt, „Passwortschutz: AN — 51 Seiten verschlüsselt", Prüfliste mit 50 Einträgen.

- [ ] **Schritt 7: Verschlüsselung stichprobenartig belegen**

```bash
grep -c "Sackkarre\|Zapfanlage\|Bierzelt" docs/index.html || echo "✓ kein Klartext in der Startseite"
grep -o "enc-payload" docs/index.html | head -1
ls docs/a | wc -l
du -sh docs
```

Erwartet: kein Klartext-Treffer, `enc-payload` vorhanden, 50 Detailordner, `docs/` etwa 18–25 MB.

- [ ] **Schritt 8: Commit**

```bash
git add build.mjs docs/ pruefliste.md gate-meta.json templates/layout.mjs
git commit -m "feat: Bauskript; Startseite und 50 Detailseiten, verschluesselt"
```

---

## Task 12: Kontakt, Impressum, Datenschutz

Drei Seiten, die jetzt sichtbar unfertig sind — damit niemand vergisst, sie vor dem Öffentlichgehen zu füllen.

**Dateien:**
- Ändern: `build.mjs` (drei weitere Seiten)

- [ ] **Schritt 1: Seiten erzeugen**

In `build.mjs` nach den Detailseiten einfügen:

```js
// --- Kontakt, Impressum, Datenschutz --------------------------------------
// Fehlende Angaben werden als deutlicher Hinweis dargestellt statt still
// weggelassen — sonst faellt vor dem Oeffentlichgehen niemandem auf, dass sie fehlen.
const k = cfg.KONTAKT;
const fehlt = (wert, was) =>
  String(wert || "").trim()
    ? `<p>${wert}</p>`
    : `<div class="fehlt-hinweis"><strong>Fehlt noch:</strong> ${was} — einzutragen in <code>config.mjs</code> unter <code>KONTAKT</code>.</div>`;

schreibeSeite(
  path.join(DOCS, "kontakt.html"),
  T.documentShell({
    title: `Kontakt — ${cfg.SITE.projectName}`,
    relRoot: "", active: "kontakt",
    content: `<div class="container prose">
      <h1>Kontakt</h1>
      <p><strong>${k.name}</strong></p>
      ${fehlt(k.telefon, "Telefonnummer")}
      ${fehlt(k.email, "E-Mail-Adresse")}
      <p>Geöffnet täglich von 7 bis 23 Uhr — auch sonntags und feiertags.</p>
      ${cfg.ANZEIGEN_LINK.enabled
        ? `<p>Anfragen laufen derzeit über die jeweilige Anzeige. Auf jeder Angebotsseite findest du dafür einen Knopf.</p>`
        : ""}
    </div>`,
  })
);

schreibeSeite(
  path.join(DOCS, "impressum.html"),
  T.documentShell({
    title: `Impressum — ${cfg.SITE.projectName}`,
    relRoot: "", active: "impressum",
    content: `<div class="container prose">
      <h1>Impressum</h1>
      <h2>Angaben gemäß § 5 DDG</h2>
      <p><strong>${k.name}</strong></p>
      ${fehlt(k.strasse, "Straße und Hausnummer")}
      ${fehlt(k.plzOrt, "Postleitzahl und Ort")}
      <h2>Kontakt</h2>
      ${fehlt(k.telefon, "Telefonnummer")}
      ${fehlt(k.email, "E-Mail-Adresse")}
      <h2>Umsatzsteuer-Identifikationsnummer</h2>
      ${fehlt(k.ustId, "USt-IdNr. (entfällt bei Kleinunternehmerregelung — dann hier vermerken)")}
      <h2>Verantwortlich für den Inhalt</h2>
      <p>${k.name}${k.plzOrt ? `, ${k.plzOrt}` : ""}</p>
    </div>`,
  })
);

schreibeSeite(
  path.join(DOCS, "datenschutz.html"),
  T.documentShell({
    title: `Datenschutz — ${cfg.SITE.projectName}`,
    relRoot: "", active: "impressum",
    content: `<div class="container prose">
      <h1>Datenschutzerklärung</h1>
      <div class="fehlt-hinweis"><strong>Noch zu prüfen:</strong> Diese Seite ist ein Entwurf und wurde nicht rechtlich geprüft. Vor dem Öffentlichgehen von jemandem mit Sachkenntnis durchsehen lassen.</div>
      <h2>Hosting</h2>
      <p>Diese Seite wird von GitHub Pages (GitHub Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA) ausgeliefert. Beim Aufruf überträgt dein Browser technisch notwendige Daten, darunter die IP-Adresse. GitHub speichert diese Zugriffsdaten in Server-Protokollen.</p>
      <h2>Keine Cookies, keine Auswertung</h2>
      <p>Diese Seite setzt keine Cookies, bindet keine externen Dienste zur Reichweitenmessung ein und speichert nichts über Besucher.</p>
      <h2>Schriftarten</h2>
      <p>Die Seite lädt Schriftarten von Google Fonts. Dabei wird deine IP-Adresse an Google übertragen.</p>
      <h2>Deine Rechte</h2>
      <p>Du hast das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung deiner Daten sowie ein Beschwerderecht bei einer Aufsichtsbehörde. Wende dich dafür an die im <a href="impressum.html">Impressum</a> genannte Stelle.</p>
    </div>`,
  })
);
```

**Hinweis zu Google Fonts:** Die Vorlage lädt die Schriften von Google. Datenschutzfreundlicher wäre, sie mit ins Repo zu legen und lokal auszuliefern. Das ist ein sinnvoller Nachzieher vor dem Öffentlichgehen — hier nicht eingeplant, damit die Kopie zunächst originalgetreu bleibt.

- [ ] **Schritt 2: Bauen und prüfen**

Run: `npm run build`
Erwartet: 54 Seiten. Danach:

Run: `node -e "const fs=require('fs'); ['kontakt','impressum','datenschutz'].forEach(s => console.log(s, fs.existsSync('docs/'+s+'.html') ? '✓' : '✗'))"`
Erwartet: dreimal `✓`

- [ ] **Schritt 3: Commit**

```bash
git add build.mjs docs/
git commit -m "feat: Kontakt-, Impressums- und Datenschutzseite (Angaben noch offen)"
```

---

## Task 13: Veröffentlichen und abnehmen

- [ ] **Schritt 1: Lokal ansehen**

Run: `npm run preview`
Dann `http://localhost:4174/` öffnen. Prüfen:
- Die Anmeldemaske erscheint mit **zwei** Feldern.
- Falsche Zugangsdaten → „Benutzername oder Passwort falsch."
- Richtige Zugangsdaten → 50 Kacheln erscheinen.
- Ein Klick auf „Umzug & Transport" → 9 Kacheln; nochmal klicken hebt auf.
- Suche nach „bierzelt" → 4 Kacheln.
- Klick auf eine Kachel → Detailseite mit großem Bild, Vorschaureihe, vollständigem Text.
- Klick auf eine Vorschau → großes Bild wechselt.
- Fenster auf Handybreite ziehen → Raster wird zweispaltig, nichts läuft über.

- [ ] **Schritt 2: `deploy.sh` anpassen**

Die Kopie zeigt noch auf die Finanz-Seite. Ersetzen:
- Commit-Text → `"Update Angebote $(date +%F)"`
- Schlusszeile → `echo "✓ Fertig. Live in ~1 Minute: https://m4rc0815.github.io/verleih-leipzig/"`

- [ ] **Schritt 3: Repo anlegen und hochladen**

```bash
cd ~/Documents/Claude/Projects/verleih-leipzig
gh repo create verleih-leipzig --public --source=. --remote=origin --push
```

- [ ] **Schritt 4: GitHub Pages einschalten**

```bash
gh api -X POST repos/m4rc0815/verleih-leipzig/pages \
  -F "source[branch]=main" -F "source[path]=/docs"
```

Erwartet: JSON mit `"status": "building"`. Bleibt es über zehn Minuten dabei, nachtreten mit:

```bash
gh api -X POST repos/m4rc0815/verleih-leipzig/pages/builds
```

- [ ] **Schritt 5: Live prüfen**

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://m4rc0815.github.io/verleih-leipzig/
curl -s https://m4rc0815.github.io/verleih-leipzig/ | grep -c "enc-payload"
curl -s https://m4rc0815.github.io/verleih-leipzig/ | grep -ci "sackkarre\|zapfanlage" || echo "0 (gut)"
```

Erwartet: `200`, `enc-payload` einmal gefunden, **null** Klartext-Treffer. Ein Klartext-Treffer bedeutet, dass ungeschützt veröffentlicht wurde — dann sofort `GATE.enabled` prüfen, neu bauen und pushen.

- [ ] **Schritt 6: Im Browser abnehmen**

Die öffentliche Adresse aufrufen, mit den Zugangsdaten anmelden, eine Detailseite öffnen. Ohne Anmeldung darf nichts lesbar sein.

- [ ] **Schritt 7: Abschluss-Commit**

```bash
git add -A
git commit -m "chore: Deploy-Skript auf verleih-leipzig umgestellt"
git push
```

---

## Nach dem Bau — vor dem Öffentlichgehen

Diese Punkte gehören **nicht** in diesen Plan, sondern sind die Bedingungen dafür, den Schutz abzuschalten:

1. Roberts Impressumsdaten in `config.mjs` → `KONTAKT` eintragen (Anschrift, Telefon, E-Mail, USt-IdNr. oder Vermerk zur Kleinunternehmerregelung).
2. `pruefliste.md` mit Robert durchgehen — 50 Anzeigen mit Kleinanzeigen-Bezug im Text.
3. Datenschutzerklärung von jemandem mit Sachkenntnis prüfen lassen.
4. Entscheiden, ob der Kleinanzeigen-Link bleibt (`ANZEIGEN_LINK.enabled`).
5. Erwägen, Google Fonts lokal auszuliefern.
6. Erst dann `GATE.enabled = false`, bauen, veröffentlichen. Das Bauskript verweigert den Dienst, solange die Anschrift fehlt.

---

## Selbstprüfung des Plans

**Abdeckung der Spezifikation:**

| Zusage aus der Spezifikation | Aufgabe |
|---|---|
| Adresse `m4rc0815.github.io/verleih-leipzig` | 13 |
| Zwei Phasen mit einem Schalter | 8 (`GATE.enabled`), 11 (Sicherung), 13 |
| Benutzername **und** Passwort, echt verschlüsselt | 7 |
| Bilder unverschlüsselt | 6, 11 |
| 50 Kacheln mit Bild, Titel, Preis | 10, 11 |
| Filter für 5 Kategorien + Suche | 2, 10, 11 |
| Detailseite: Galerie 1200 px, vollständiger Text | 10, 11 |
| Bilder neu in 1200 px, WebP in zwei Größen | 6, 9 |
| Design 1:1, Akzent grün | 10 |
| Text unverändert + Prüfliste | 4, 11 |
| Knopf „Auf Kleinanzeigen anfragen", abschaltbar | 8, 10 |
| Impressum, Datenschutz, Kontakt vorbereitet | 12 |
| `sync` / `build` / `preview` / `deploy` | 1, 9, 11, 13 |
| Google-Drive-Archiv bleibt unangetastet | in keiner Aufgabe angefasst |

**Benennungen quer durch den Plan geprüft:** `slugFuer`, `kategorieFuer`, `findeBezuege`, `erzeugeVarianten`, `parseAnzeige`, `zugangsGeheimnis`, `schreibeSeite`, `T.kachel`, `T.detailSeite` — durchgängig gleich geschrieben. Die Bilddateien heißen überall `<name>.webp` (Detail) und `<name>-k.webp` (Kachel).

**Offene Abhängigkeit:** `documentShell` aus der Vorlage kennt den Parameter `scripts` noch nicht — die Ergänzung steht in Task 11, Schritt 3.
