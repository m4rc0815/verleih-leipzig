# Spezifikation: Kategorieseiten und Handy-Fassung

Stand: 28.07.2026 · abgestimmt mit Marc Marx

Zwei zusammenhängende Vorhaben. Teil 1 schafft neue Seiten, Teil 2 legt die
Handy-Regeln über alles — deshalb in dieser Reihenfolge, sonst müsste das CSS
zweimal angefasst werden.

---

## Teil 1 — Fünf Kategorieseiten

### Warum

Der Klick auf eine Kategorie-Kachel filtert heute nur die Liste auf der
Startseite. Es gibt keine eigene Adresse für „alle Partyartikel". Mit
wachsendem Bestand braucht jede Kategorie eine eigene Übersicht.

### Adressen

| Kategorie | Anzahl | Adresse |
|---|---|---|
| Party & Feiern | 20 | `k/party-feiern/` |
| Umzug & Transport | 9 | `k/umzug-transport/` |
| Spiel & Spaß | 9 | `k/spiel-spass/` |
| Werkzeug & Reinigung | 6 | `k/werkzeug-reinigung/` |
| Foto & Technik | 6 | `k/foto-technik/` |

Der Slug entsteht aus dem Namen: Umlaute ausgeschrieben (`Spaß` → `spass`),
alles klein, alles Nicht-Alphanumerische zu einem Bindestrich. Neue Funktion
`kategorieSlug(name)` in `lib/slug.mjs`, mit Test. Sie ist bewusst getrennt von
`slugFuer(titel, id)` — dort hängt eine Anzeigen-ID an, hier nicht.

### Aufbau einer Kategorieseite

1. Brotkrumen `Start › Party & Feiern`
2. Überschrift = Kategoriename, darunter „20 Angebote"
3. Einleitungssatz (siehe unten)
4. Filterleiste: Suchfeld und Sortierung — **ohne** Kategorieknöpfe, man ist
   bereits in der Kategorie
5. Kachelraster mit den Angeboten dieser Kategorie
6. Reihe „Andere Kategorien" mit den vier übrigen (Bild, Name, Anzahl)
7. Kontaktband wie auf der Startseite

### Einleitungssätze

Aus den Anzeigentiteln abgeleitet, also belegt. Robert korrigiert sie; sie
stehen in `config.mjs` unter `KATEGORIE_TEXTE` und sind je eine Zeile.

- **Party & Feiern:** „Zapfanlage, Bierzeltgarnituren, Musikboxen, Nebel- und
  Zuckerwattemaschine — alles, was eine Feier braucht, von der Hochzeit bis zum
  Geburtstag im Hof."
- **Umzug & Transport:** „Neue Umzugskartons in mehreren Größen, dazu Sackkarre,
  Treppensteiger und Transportwagen — geliefert und nach dem Umzug wieder
  abgeholt."
- **Spiel & Spaß:** „Hüpfburg mit TÜV, XXL-Jenga, 4-Gewinnt, Schwungtuch und
  SUP-Board — für Kindergeburtstage, Sommerfeste und den Tag am Wasser."
- **Werkzeug & Reinigung:** „Kärcher-Hochdruck- und Teppichreiniger,
  Bohrmaschine, Baustrahler und Linienlaser — Geräte, die man ein Wochenende
  braucht und nicht kaufen muss."
- **Foto & Technik:** „Beamer mit 100-Zoll-Leinwand, Sofortbildkameras und die
  PlayStation dazu — für Filmabend, Hochzeit oder Fotoecke auf der Feier."

### Wege dorthin

- **Kategorie-Kachel auf der Startseite:** wird von `<button>` zu `<a href>`.
  Damit entfällt die Kachel-Filterlogik in `filter.js`; die Filterknöpfe unter
  „Alle 50 Angebote" bleiben unverändert erhalten.
- **Kopfnavigation:** neuer Punkt „Kategorien" als `<details>`-Element mit den
  fünf Links. `<details>` funktioniert ohne JavaScript und auf Touch — ein
  Hover-Menü täte das nicht.
- **Detailseiten:** die Brotkrumen bekommen die Kategorie eingehängt und
  verlinken auf deren Seite: `Start › Party & Feiern › Zapfanlage`.

### Bau

`build.mjs` erzeugt fünf zusätzliche Seiten unter `k/<slug>/index.html` mit
`relRoot = "../../"`. Sie durchlaufen dieselbe Verschlüsselung wie alle anderen.
Statt 54 baut das Skript dann 59 Seiten; der Bau-Bericht weist sie aus.

---

## Teil 2 — Handy-Fassung

### Regel

Alle neuen Regeln stehen in einem eigenen, kommentierten Block am Ende von
`assets/style.css` und greifen ausschließlich unter **700 px** Breite. Oberhalb
ändert sich keine einzige Regel — der Laptop bleibt damit unverändert. 700 px
liegt über jedem Handy im Hochformat und unter jedem Tablet.

### Gemessener Ausgangszustand (375 × 812)

Seitenlänge 12.527 px, erstes Angebot bei 2.929 px. Davor: Kopf 493 · Zusagen
370 · Kategorien 827 · Vorstellung 766.

### Änderungen

| Abschnitt | heute | Ziel | Vorgehen |
|---|---|---|---|
| Kopf | 493 px | ~300 px | Überschrift kleiner, Kurzfassung des Untertexts, Suchfeld direkt darunter |
| Zusagen | 370 px | ~110 px | 2×2-Raster, Erklärsatz ausgeblendet, nur Symbol und Stichwort |
| Kategorien | 827 px | ~210 px | eine waagerecht wischbare Reihe mit Einrasten, fünfte Kachel ragt angeschnitten herein |
| Vorstellung Robert | 766 px | — | wandert unter die Angebote |
| **erstes Angebot** | **2.929 px** | **unter 1.000 px** | Summe der obigen Punkte |

Im Einzelnen:

- **Kurzfassung des Kopftextes.** Der lange Satz bleibt für den Laptop im
  Markup, dazu kommt eine kurze Fassung; die Handy-Regeln blenden um. CSS kann
  Text nicht kürzen, deshalb zwei Absätze statt einem.
- **Suchfeld im Kopf.** Ein zweites Eingabefeld, nur unter 700 px sichtbar.
  `filter.js` hält beide Felder gleich: Tippen im einen setzt das andere und
  filtert dieselbe Liste.
- **Mitlaufende Filterzeile.** Die Filterleiste klebt beim Scrollen unter dem
  Kopfbereich (`position: sticky; top: 68px` — der Kopf ist bereits `sticky` mit
  `z-index: 50`, die Filterzeile bekommt 40). Auf der Startseite werden die
  Kategorieknöpfe darin zur wischbaren Reihe, damit die Zeile einzeilig bleibt;
  auf den Kategorieseiten gibt es diese Knöpfe ohnehin nicht.
- **Umsortieren.** `main` wird unter 700 px zum Flex-Container in Spaltenrichtung,
  die Abschnitte bekommen `order`-Werte. Kein Markup wandert, nur die Anzeige.
- **Anruf-Balken.** Neues Element im Seitengerüst, fest am unteren Rand:
  „📞 0176 55180756". Auf den Detailseiten steht daneben „Auf Kleinanzeigen
  anfragen". Über 700 px `display: none`. `body` bekommt unten Platz, damit der
  Balken nichts verdeckt.
- **Detailseiten.** Bildbühne von `max-height: 70vh` auf `48vh`, die
  Vorschaubilder laufen in einer wischbaren Reihe statt in drei umbrechenden,
  der Preis rückt direkt unter den Titel.
- **Kategorieseiten** erben Filterzeile und Anruf-Balken; ihr Gewinn ist größer
  als auf der Startseite, weil der Vorspann dort ohnehin fehlt.

---

## Dateien

| Datei | Änderung |
|---|---|
| `lib/slug.mjs` | `kategorieSlug(name)` |
| `lib/kategorien.mjs` | unverändert (liefert die fünf Namen) |
| `config.mjs` | `KATEGORIE_TEXTE`, Balken-Beschriftung |
| `templates/layout.mjs` | `kategorieSeite()`, Navigation mit `<details>`, Brotkrumen mit Kategorie, Kacheln als Links, Kurzfassung im Kopf, Anruf-Balken im Gerüst |
| `assets/filter.js` | Kachel-Filterlogik raus, Kopplung der beiden Suchfelder rein |
| `assets/style.css` | Kategorieseiten-Regeln, danach der Block „Handy-Fassung (bis 700 px)" |
| `build.mjs` | fünf Kategorieseiten, Bericht |
| `test/` | Tests zu Slug, Kategorieseite, Suchfeld-Kopplung |

---

## Nachweis

1. `npm test` — die 64 vorhandenen Tests bleiben grün, neue kommen dazu.
2. `npm run build` — 59 Seiten, alle verschlüsselt.
3. Messung im Browser bei 375, 430, 700 und 1280 px:
   - erstes Angebot unter 1.000 px (heute 2.929)
   - kein waagerechtes Scrollen des Seitenkörpers
   - Tippflächen mindestens 44 px hoch
   - **bei 1280 px müssen alle Abschnittshöhen den heutigen Werten entsprechen**
     — gemessen vor und nach dem Umbau, das ist der Beweis, dass der Laptop
     unberührt bleibt
4. Klickprobe: Kategorie-Kachel → Kategorieseite → Angebot → Brotkrumen zurück.
5. Prüfung auf GitHub Pages nach dem Hochladen: kein Klartext auffindbar.

---

## Abweichungen bei der Umsetzung

Vier Entscheidungen sind beim Bauen anders ausgefallen als oben beschrieben:

1. **Brotkrumen ohne Angebotstitel.** Geplant war `Start › Party & Feiern ›
   Zapfanlage`. Die Anzeigentitel sind bis zu 60 Zeichen lang und stehen als
   Überschrift ohnehin direkt darunter — die dritte Stufe hätte auf dem Handy
   drei Zeilen gefüllt. Jetzt: `Start › Party & Feiern`, die Kategorie verlinkt.
2. **Kacheltitel auf zwei Zeilen begrenzt** (nur unter 700 px, nicht geplant).
   Ohne die Begrenzung waren die Kacheln zwischen 326 und 363 px hoch, das
   Raster wirkte unruhig. Jetzt sind alle exakt 274 px hoch und die Liste ist
   ein Fünftel kürzer. Der vollständige Titel steht auf der Detailseite.
3. **Augenbrauen-Zeilen mobil ausgeblendet** („Wonach suchst du?", „Der ganze
   Bestand"). Sie kosten je rund 25 px und sagen nichts, was die Überschrift
   darunter nicht schon sagt.
4. **Keine Kategorien im Seitenfuß.** Eine vierte Fußspalte hätte das
   Desktop-Layout verändert — das war ausgeschlossen. Die Kategorien sind über
   die Kopfnavigation und die Kacheln erreichbar.

## Nachträge vom selben Tag

Nach der ersten Auslieferung kamen vier Punkte dazu:

5. **Keine feste Stückzahl mehr.** „50 Sachen" und „Alle 50 Angebote" veralten,
   sobald der Bestand wächst. Im Kopf stehen jetzt Beispiele statt einer Menge.
   Der Filterzähler („20 von 50") bleibt, der zeigt beim Eingrenzen das
   Verhältnis.
6. **Seitentexte entschlackt.** Zehn von fünfzehn sichtbaren Sätzen waren
   gleich gebaut: Aufzählung, Gedankenstrich, Nachsatz. Jetzt keiner mehr; ein
   Test hält die Texte künftig frei davon. Bis-Striche wie „Mo–So" bleiben.
7. **Menü, Umschaltreihe, „Alle".** Das Klappmenü schließt nach der Auswahl
   (`assets/nav.js`), jede Kategorieseite hat oben eine Umschaltreihe zu allen
   anderen, und die Filterreihe endet mit „Alle" zum Zurücksetzen. Ein Klick
   setzt die Kategorie; vorher musste man den gewählten Knopf ein zweites Mal
   treffen, um alles wiederzusehen.
8. **Kurzer Browser-Titel.** `SITE.seitentitel` (unter 60 Zeichen) für den
   Tab, `SITE.tagline` weiterhin für Fußzeile und Meta-Beschreibung.

## Einheitliches Bildformat (29.07.2026)

Marc: „die bilder auf der homepage haben alle ein leicht unterschiedliches
Format und größe." Die Messung zeigte, dass die Kachelrahmen bereits alle
251 × 251 px maßen — ungleich war, was darin passierte.

| | vorher | nachher |
|---|---|---|
| Kachelbilder | 8 Pixelmaße, Verhältnis 0,56–1,44 | alle 500 × 500 |
| sichtbarer Bildanteil | 56 % bis 100 %, im Schnitt 75 % | überall gleich |
| Kachelhöhe | 373 px oder 392 px, je nach Titel | überall 373 px |
| Galeriebühne | Höhe folgte dem Bild | fest 4:3, höchstens 70 vh |

9. **Kachelbilder fest quadratisch.** 40 der 50 Aufnahmen sind hochkant. Die
   Kachel behielt bisher das Verhältnis des Originals, zugeschnitten hat erst
   das CSS — und zwar immer oben ansetzend. `erzeugeVarianten` schneidet jetzt
   selbst auf 500 × 500 und sucht dabei den Bildbereich mit den meisten Kanten,
   also den Gegenstand. Dieselbe Behandlung wie bei den Kategorie-Kacheln. Der
   kürzeste Bildrand aller Originale misst 556 px, es wird also nie
   hochgerechnet. Von Marc am 29.07. bestätigt: formatfüllend, nicht das ganze
   Foto auf grauem Grund.
10. **Titel überall zweizeilig.** Die Begrenzung galt bisher nur unter 700 px.
    Zusammen mit `min-height` sind alle Kacheln exakt gleich hoch, und die
    Preise liegen innerhalb einer Reihe auf einer Linie.
11. **Galeriebühne mit fester Höhe.** Bei 23 der 48 mehrbildrigen Anzeigen
    wechseln Hoch- und Querformat; beim Weiterklicken sprang der halbe
    Seiteninhalt. Kein `display: grid` am Kasten: darin gilt seine Höhe als
    unbestimmt, `height: 100 %` am Bild fiele auf `auto` zurück, und das Bild
    liefe unten heraus. `max-height: 70vh` kappt auf hohen Bildschirmen auch
    die Breite, deshalb sitzt der Kasten mittig.
12. **Kategorie-Kacheln bleiben 3:2.** Sie stehen als Reihe nebeneinander und
    dienen der Navigation. Als Quadrate wären sie rund 120 px höher und
    schöben die Angebote nach unten. Von Marc so entschieden.

Nebenbei aufgefallen: In `docs/` lagen unverschlüsselte Vorschauseiten
(`_v_*.html`) und iCloud-Konfliktkopien („index 2.html"), eine davon hatte
`.git/refs/remotes/origin/main` beschädigt. `deploy.sh` arbeitet mit
`git add -A` und hätte die Vorschauseiten ohne Passwortschutz veröffentlicht.
Beides steht jetzt in `.gitignore`; auf GitHub war nie etwas davon (404).

## Gliederung und Bildwand (29.07.2026)

Grundlage ist eine Messung von vier Wettbewerbern im Browser
([partyverleih-leipzig.de](https://www.partyverleih-leipzig.de/),
[eventverleih-leipzig.de](https://www.eventverleih-leipzig.de/home/),
[boels.com](https://www.boels.com/de-de/), [erento.com](https://www.erento.com/)).
Befund: Keiner nutzt Farbverläufe, keiner nutzt Muster. Drei von vier zeigen
oben ein großformatiges Foto, alle wechseln die Fläche mehrfach — Boels als
größter Vermieter sechsmal auf einer kürzeren Seite als Roberts.

13. **Angebote nach Kategorien gegliedert.** Der Bestand lief 5507 px am Stück,
    70 % der Seitenlänge ohne Halt; die größte ununterbrochene Fläche misst
    jetzt 2000 px. Jeder Block trägt Überschrift, Anzahl und einen Link auf
    seine Kategorieseite. Der Flächenwechsel steht als Klasse `ist-weiss` im
    Markup und nicht in einer `nth-child`-Regel: sobald der Filter einen Block
    leert, verrutschte die Zählung sonst. Karten auf weißem Grund bekommen eine
    Kontur, sonst zerfließen sie.
14. **Filter arbeitet über mehrere Gitter.** `filter.js` sammelt die Karten aus
    allen `.angebot-grid`, sortiert innerhalb jedes Blocks und blendet Blöcke
    ohne sichtbare Karte samt Überschrift aus. Geprüft: Kategoriefilter (9 von
    50, ein Block), Suche (5 von 50, ein Block), Suche ohne Treffer (0, Blöcke
    weg, Leermeldung), Sortierung nach Preis innerhalb des Blocks. Die
    Kategorieseiten mit ihrem einzelnen Gitter laufen unverändert.
15. **Bildwand im Kopf.** Vier Motive aus vier Kategorien neben der
    Überschrift, konfigurierbar über `SITE.heroBilder`, mit Rückfall auf die
    ersten Anzeigen mit Bild. Kein neues Material: es sind die vorhandenen
    500er Quadrate. Auf dem Handy entfällt sie — dort muss auch das zweispaltige
    Raster abgeschaltet werden, sonst hält die leere Spalte ihre Mindestbreite
    und treibt den Kopf von 329 auf 552 px.

Bewusst nicht gemacht: Farbverläufe und Hintergrundmuster (kein einziger
Wettbewerber nutzt sie) sowie die ganzseitige Fototapete wie bei
eventverleih-leipzig.de — Roberts Aufnahmen sind Handyfotos in Innenräumen.

Preis der Gliederung: Die Startseite ist von 7838 auf 9226 px gewachsen, das
erste Angebot rückt auf dem Handy von 989 auf 1050 px.

## Offen

- Roberts Porträtfoto für `ROBERT.bild`.
- Die Kategorie steht jetzt doppelt: einmal als Blocküberschrift und einmal
  klein auf jeder Kachel darunter. Eine Zeile CSS würde sie in den Kacheln
  ausblenden — Marcs Entscheidung.
- Die Prüfliste (`pruefliste.md`) vor dem Öffentlichgehen mit Robert durchgehen.
- Die Datenschutzerklärung ist ein ungeprüfter Entwurf.
- „Hochzeitsfotografie" steht unter Foto & Technik, ist aber eine Dienstleistung
  und kein Mietgegenstand. Der Einleitungssatz erwähnt sie deshalb nicht.
  Ob sie dort richtig aufgehoben ist, entscheidet Robert.
