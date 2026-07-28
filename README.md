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
| `config.mjs` | Alle Schalter — Passwortschutz, Kleinanzeigen-Link, Kontaktdaten |
| `sync.mjs` | Abruf von Kleinanzeigen nach `content/` |
| `drive.mjs` | Abgleich der Bilder mit Google Drive (pull / push / check) |
| `build.mjs` | Bau von `content/` nach `docs/` |
| `lib/` | Bausteine: Kategorien, Slugs, Bilder, Prüfliste, Abruf |
| `templates/layout.mjs` | HTML-Bausteine (Kachel, Detailseite, Gerüst) |
| `content/` | Die Wahrheit: Anzeigentexte und Originalbilder |
| `docs/` | Bauausgang — das, was GitHub Pages ausliefert |
| `pruefliste.md` | Textstellen mit Kleinanzeigen-Bezug, vor dem Öffentlichgehen zu klären |

## Zugangsdaten

Liegen in `.gate-password` (Zeile 1 Benutzername, Zeile 2 Passwort) und sind
von Git ausgeschlossen. Alternativ über die Umgebungsvariablen `SITE_USER`
und `SITE_PASSWORD`.

## Bevor die Seite öffentlich geht

1. `KONTAKT` in `config.mjs` vollständig füllen — der Bau bricht sonst ab.
2. `pruefliste.md` mit Robert durchgehen (Formulierungen wie „auf meiner Seite").
3. Datenschutzerklärung fachkundig prüfen lassen.
4. `GATE.enabled` in `config.mjs` auf `false`, neu bauen, hochladen.
