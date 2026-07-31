# Verleih Leipzig

Statische Webseite für Roberts Verleih in Leipzig — Party-, Umzugs- und Werkzeugvermietung.
Gebaut aus den Kleinanzeigen-Daten, ausgeliefert über GitHub Pages.

**Die Seite ist derzeit passwortgeschützt** (Bauphase): Jede Seite wird beim Bau mit
AES-256-GCM verschlüsselt, der Schlüssel entsteht aus Benutzername **und** Passwort.
Ausgeliefert wird nur Geheimtext plus Anmeldemaske.

## Befehle

```bash
npm run sync         # Anzeigentexte und neue Bilder von Kleinanzeigen holen → content/
npm run pull         # Bilder aus Google Drive holen (Drive ist Master)
npm run push         # lokale Bilder nach Google Drive übertragen
npm run drive-check  # nur vergleichen, nichts ändern
npm run build        # content/ → docs/ (Seiten, WebP-Bilder, Verschlüsselung)
npm run preview      # bauen und lokal ansehen auf http://localhost:4174
npm test             # Tests
npm run deploy       # pull, bauen, committen, pushen
```

## Google Drive ist Master für die Bilder

Die Originalbilder liegen in Google Drive unter `Claude/Robert/NN Titel/`,
in denselben durchnummerierten Ordnern wie die `beschreibung.md` des Archivs.

Wer dort ein Bild löscht oder hinzufügt, ändert damit die Homepage — sichtbar
wird das nach `npm run deploy` (das holt zuerst den Stand aus Drive). Einen
automatischen Abgleich gibt es nicht; es braucht immer diesen einen Befehl.

Der Bau liest die Bildliste aus dem Ordner, nicht aus `content/anzeigen.json` —
deshalb wirkt jede Änderung in Drive, ohne dass jemand eine Liste pflegt.

Die Ordnernamen unterscheiden sich zwischen beiden Seiten: In Drive „NN Titel",
lokal der Slug (daraus entstehen die Adressen der Detailseiten).
`lib/drive-zuordnung.mjs` übersetzt zwischen beidem, `npm run drive-check`
meldet, wenn eine Anzeige keinen Drive-Ordner hat oder umgekehrt.

**Sicherung:** `npm run pull` bricht ab, wenn in Drive weniger als die Hälfte
der lokalen Bilder liegt — damit ein halb hochgeladener Ordner nicht den
lokalen Bestand auslöscht. `beschreibung.md` wird beim Abgleich nie angefasst.

## Aufbau

| Ordner / Datei | Zweck |
|---|---|
| `config.mjs` | Alle Schalter — Passwortschutz, Kontaktdaten, Zusagen, Anfragewege |
| `inhalte.mjs` | Die Redaktion: kurze Titel, Varianten, Preiskorrekturen, Konditionen |
| `sync.mjs` | Abruf von Kleinanzeigen nach `content/` |
| `drive.mjs` | Abgleich der Bilder mit Google Drive (pull / push / check) |
| `build.mjs` | Bau von `content/` nach `docs/` |
| `lib/` | Bausteine: Kategorien, Slugs, Bilder, Textaufbereitung, Angebote, Strukturdaten |
| `templates/layout.mjs` | HTML-Bausteine (Kachel, Detailseite, Gerüst) |
| `assets/fonts/` | Die Schriften liegen hier, nicht bei Google (siehe unten) |
| `content/` | Die Wahrheit: Anzeigentexte und Originalbilder |
| `docs/` | Bauausgang — das, was GitHub Pages ausliefert |
| `pruefliste.md` | Was nach der Aufbereitung noch nach Kleinanzeigen klingt |

## Von der Anzeige zur Angebotsseite

Roberts Texte sind für Kleinanzeigen geschrieben: ein einziges Textfeld, in dem
Begrüßung, Beschreibung, Preise, Lieferung, Pfand und Grußformel untereinander
stehen. Auf einer eigenen Seite gehört davon einiges nicht hin und anderes an
eine feste Stelle. Der Bau macht das in zwei Schritten:

1. **`lib/text-aufbereitung.mjs`** zerlegt jeden Anzeigentext in Beschreibung,
   technische Daten, Preisstaffel und Konditionen. Was es nicht sicher zuordnen
   kann, bleibt Beschreibungstext.
2. **`lib/angebote.mjs`** legt `inhalte.mjs` darüber und fasst zusammen, was
   zusammengehört: aus 50 Anzeigen werden 33 Angebote. Vier Bierzeltgarnituren
   sind eine Kachel mit vier Ausführungen, fünf Kartongrößen eine mit fünf.

Beides läuft bei **jedem** Bau neu über die frischen Daten. Robert kann seine
Anzeigen also weiter pflegen wie bisher — die Homepage folgt. Umgeschriebene
Texte in `content/anzeigen.json` wären dagegen beim nächsten `npm run sync`
verloren, denn der überschreibt die Datei vollständig.

Korrekturen gehören deshalb immer in `inhalte.mjs`. Der Bau meldet am Ende, was
dort nicht mehr zu den Anzeigen passt, und listet die offenen Punkte für Robert.

## Schriften

Die Seite lädt keine Schriften bei Google. Eine Verbindung dorthin würde die IP
jedes Besuchers an Google übertragen — bei einer gewerblichen Seite ein
Abmahnrisiko. Beide Schriften liegen als veränderliche Schrift (variable font)
unter `assets/fonts/`, zusammen 57 KB.

Anderen Schriftschnitt gebraucht? Datei bei Google mit dem gewünschten
`wght`-Bereich ziehen, nach `assets/fonts/` legen und die Spanne im
`@font-face` in `assets/style.css` anpassen.

## Zugangsdaten

Liegen in `.gate-password` (Zeile 1 Benutzername, Zeile 2 Passwort) und sind
von Git ausgeschlossen. Alternativ über die Umgebungsvariablen `SITE_USER`
und `SITE_PASSWORD`.

## Bevor die Seite öffentlich geht

1. `KONTAKT` in `config.mjs` vollständig füllen — der Bau bricht sonst ab.
2. Die offenen Punkte aus dem Bau-Bericht mit Robert klären (sie stehen als
   `offen:` in `inhalte.mjs`), vor allem: Verlangt er Pfand per Ausweiskopie,
   und was kostet die Hüpfburg?
3. `docs/agb.html` und die Datenschutzerklärung fachkundig prüfen lassen. Beide
   sind Entwürfe und sagen das auch selbst.
4. `pruefliste.md` ansehen — sie zeigt, was nach der Aufbereitung noch nach
   Kleinanzeigen klingt.
5. `GATE.enabled` in `config.mjs` auf `false`, neu bauen, hochladen. Erst dann
   entstehen `robots.txt` und `sitemap.xml` mit Freigabe für Suchmaschinen;
   solange der Schutz an ist, sperrt `robots.txt` alles.
