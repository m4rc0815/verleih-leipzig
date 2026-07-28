# Startseite „Verleih Leipzig" — Entwurf

**Stand:** 28.07.2026
**Ziel:** Aus der Angebotsliste eine Schaufenster-Seite machen, die zeigt, wer dahintersteht — nach dem Muster großer Versandseiten, aber im Maßstab eines Einzelunternehmers.

---

## Ausgangslage

Die Startseite besteht heute aus Kopfzeile, Titelzeile, Filterleiste und 50 Kacheln. Sie beantwortet die Frage „Was gibt es?", aber keine der drei Fragen, die Besucher vorher haben:

- Kann ich dem trauen?
- Was kostet Lieferung, brauche ich eine Kaution?
- Wer ist das überhaupt?

Roberts Selbstbeschreibung aus dem Kleinanzeigen-Business-Portal und seine 50 Anzeigentexte enthalten die Antworten bereits. Sie stehen nur nirgends auf der Seite.

## Entscheidungen

| Frage | Entscheidung |
|---|---|
| Umfang | Voller Umbau zur Schaufenster-Seite |
| Aufbau | Entwurf A — Ware zuerst, Robert in der Mitte |
| Angebote | Alle 50 bleiben auf der Startseite, unterhalb der neuen Abschnitte |
| Foto von Robert | Kommt später; bis dahin Initialen-Platzhalter |
| Roberts Text | Für die Homepage geglättet, Inhalt und Zusagen unverändert |

## Aufbau der Seite

1. **Kopf** — „Mieten statt kaufen.", Kurzbeschreibung, zwei Knöpfe (Angebote / Anrufen)
2. **Zusagen-Leiste** — vier Punkte, grün hinterlegt
3. **Kategorien** — fünf Kacheln mit Bild und Anzahl
4. **Über Robert** — Porträt-Platzhalter, Text, Telefon, Instagram
5. **Alle Angebote** — Filter, Suche, Sortierung, 50 Kacheln (unverändert)
6. **Kontaktband** — dunkel, Telefonnummer groß, Zeiten, E-Mail

### 1. Kopf

```
VERLEIH LEIPZIG · SEIT JAHREN IM SÜDEN DER STADT
Mieten statt kaufen.
50 Sachen für Feier, Umzug und Baustelle — geliefert, auf Rechnung,
ohne Kaution. Von einem Menschen aus Leipzig, nicht von einem Konzern.
[ › Alle Angebote ansehen ]  [ › 0176 55180756 ]
```

Die Anzahl „50" wird aus den Daten gezogen, nicht getippt — sonst stimmt sie nach dem nächsten Abruf nicht mehr.

### 2. Zusagen-Leiste

Vier Punkte mit Strichzeichnung-Symbol. Alle vier stammen aus Roberts eigenen Anzeigentexten, keiner ist erfunden:

| Zusage | Beleg |
|---|---|
| **Lieferservice** — Ich bringe die Sachen vorbei und hole sie wieder ab. | in 47 von 50 Anzeigen |
| **Auf Rechnung** — Auch für Firmen und Vereine; Zahlung bar, per PayPal oder Überweisung. | Rechnung in 48, PayPal/bar in je 37 |
| **7 Tage die Woche** — Von 7 bis 23 Uhr erreichbar, auch sonntags und feiertags. | Business-Portal + 39 Anzeigen |
| **Ohne Kaution** — Keine Hinterlegung, kein Papierkram vorab. | Kaution kommt in **keiner** Anzeige vor |

> **Vor dem Öffentlichgehen mit Robert abzuklären:** Die vierte Zusage schließt aus dem Schweigen der Anzeigen, dass er keine Kaution nimmt. Das ist plausibel, aber nicht belegt. Bestätigt er es nicht, wird der Punkt ersetzt (Vorschlag: „Aufbau und Einweisung — auf Wunsch stelle ich auf und erkläre alles", in 13 Anzeigen belegt).

### 3. Kategorien

Fünf Kacheln nebeneinander, je Bild, Name und Anzahl. Ein Klick **filtert die Liste weiter unten** und springt dorthin — keine eigene Unterseite, kein Nachladen. Das nutzt die bereits gebaute Filterlogik.

Motive werden je Kategorie fest gewählt, damit dort nicht zufällig ein Kartonstapel vor weißer Wand landet:

| Kategorie | Motiv (Anzeigen-Slug) |
|---|---|
| Party & Feiern | `15-bierzeltgarnituren-mieten-…-2799184091` — Garnituren im Garten |
| Umzug & Transport | `profi-sackkarre-mieten-250kg-…-2939428950` — rote Sackkarre |
| Spiel & Spaß | `huepfburg-mieten-tuev-geprueft-…-2807492142` — bunte Hüpfburg |
| Werkzeug & Reinigung | `kaercher-profi-hochdruckreiniger-…-3238091408` |
| Foto & Technik | `polaroid-kamera-mieten-…-3225566560` |

Fehlt ein Slug (Anzeige gelöscht), fällt die Kachel auf das erste Bild der ersten Anzeige dieser Kategorie zurück und der Bau warnt in der Ausgabe.

### 4. Über Robert

Zweispaltig: links rundes Porträt, rechts Text.

Solange kein Foto vorliegt, steht dort ein grüner Kreis mit „RK". Sobald Robert eins schickt: Datei nach `assets/robert.jpg`, Pfad in `config.mjs` eintragen, fertig — kein Codeeingriff.

Text (geglättet, Inhalt unverändert):

> Ich bin Robert, Kleingewerbetreibender aus Leipzig. Seit Jahren vermiete ich, was man selten braucht, aber dann dringend: von der Bierzeltgarnitur über die Sackkarre bis zur Hüpfburg.
>
> Zuverlässigkeit und Pünktlichkeit sind mir wichtig — und dass ihr zufrieden seid. Ich arbeite sieben Tage die Woche, das ganze Jahr über. Ruft einfach an, dann finden wir eine Lösung.

Darunter der Anruf-Knopf und der Instagram-Link (`@robertkipf`, öffnet in neuem Tab).

### 5. Alle Angebote

Unverändert übernommen: Filterknöpfe, Suche, Sortierung, 50 Kacheln. Bekommt eine Überschrift („Der ganze Bestand / Alle 50 Angebote") und die Sprungmarke `#angebote`, damit Kopf und Kategorie-Kacheln dorthin verweisen können.

### 6. Kontaktband

Dunkles Band wie in der Vorlage, mittig: Telefonnummer als Überschrift, darunter Zeiten, Ort und E-Mail, dann ein Anruf-Knopf. Auf dem Handy wählt ein Antippen direkt.

## Wo der Code lebt

| Datei | Änderung |
|---|---|
| `config.mjs` | Neu: `ROBERT` (Text, Initialen, Bildpfad, Instagram), `ZUSAGEN` (vier Punkte), `KATEGORIE_MOTIVE` (Slug je Kategorie) |
| `templates/layout.mjs` | Neu: `zusagenBand()`, `kategorieBand()`, `robertBlock()`, `kontaktBand()`, `startHero()`; Symbole als Inline-SVG |
| `assets/style.css` | Neu: Zusagen-Leiste, Kategorie-Raster, Robert-Block, Kontaktband |
| `assets/filter.js` | Erweitert: Kategorie-Kacheln setzen denselben Filter wie die Knöpfe |
| `build.mjs` | Startseite aus den neuen Bausteinen zusammensetzen; Warnung bei fehlendem Motiv-Slug |
| `test/layout.test.mjs` | Tests für die neuen Bausteine |

Inhalte gehören in `config.mjs`, nicht in den Code: Robert soll seinen Text ändern können, ohne dass jemand `layout.mjs` aufmacht.

## Tests

- `zusagenBand` gibt genau so viele Punkte aus, wie konfiguriert sind
- `kategorieBand` zeigt je Kategorie die richtige Anzahl und fällt bei unbekanntem Slug sauber zurück
- `robertBlock` zeigt die Initialen, solange kein Bildpfad gesetzt ist, und das Bild, sobald einer da ist
- `kontaktBand` erzeugt eine gültige `tel:`-Adresse aus der Nummer
- Alle Bausteine maskieren Sonderzeichen (kein rohes HTML aus der Konfiguration)

## Was bewusst wegbleibt

- **Kundenbewertungen** — es gibt keine. Erfundene Sterne wären eine Lüge, und ein leerer Bewertungsblock wirkt schlimmer als keiner.
- **Warenkorb, Verfügbarkeitskalender, Buchungsformular** — Anfragen laufen über Telefon und die Anzeige. Ein Buchungssystem wäre ein eigenes Projekt.
- **Newsletter-Anmeldung** — braucht Einwilligungstext, Verarbeitungsverzeichnis und einen Versanddienst. Ohne echten Bedarf nur Aufwand.
- **Zahlungslogos** — die Rechte an fremden Markenzeichen müsste man prüfen; die Zahlarten stehen im Text.

## Offen, bevor die Seite öffentlich geht

1. Robert bestätigt die vierte Zusage („ohne Kaution") — sonst wird sie ersetzt.
2. Robert liefert ein Porträtfoto.
3. Robert liest den geglätteten Text gegen und erkennt sich darin wieder.
4. Der Instagram-Auftritt `@robertkipf` ist erreichbar (nicht geprüft).
