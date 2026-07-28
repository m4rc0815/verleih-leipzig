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

## Offen

- Roberts Porträtfoto für `ROBERT.bild`.
- Die Prüfliste (`pruefliste.md`) vor dem Öffentlichgehen mit Robert durchgehen.
- Die Datenschutzerklärung ist ein ungeprüfter Entwurf.
- „Hochzeitsfotografie" steht unter Foto & Technik, ist aber eine Dienstleistung
  und kein Mietgegenstand. Der Einleitungssatz erwähnt sie deshalb nicht.
  Ob sie dort richtig aufgehoben ist, entscheidet Robert.
