# Verleih Leipzig

Statische Webseite für Roberts Verleih in Leipzig — Party-, Umzugs- und Werkzeugvermietung.
Gebaut aus den Kleinanzeigen-Daten, ausgeliefert über GitHub Pages.

**Die Seite ist derzeit passwortgeschützt** (Bauphase): Jede Seite wird beim Bau mit
AES-256-GCM verschlüsselt, der Schlüssel entsteht aus Benutzername **und** Passwort.
Ausgeliefert wird nur Geheimtext plus Anmeldemaske.

## Befehle

```bash
npm run sync      # Anzeigen und Bilder von Kleinanzeigen holen → content/
npm run build     # content/ → docs/ (Seiten, WebP-Bilder, Verschlüsselung)
npm run preview   # bauen und lokal ansehen auf http://localhost:4174
npm test          # Tests
npm run deploy    # bauen, committen, pushen
```

## Aufbau

| Ordner / Datei | Zweck |
|---|---|
| `config.mjs` | Alle Schalter — Passwortschutz, Kleinanzeigen-Link, Kontaktdaten |
| `sync.mjs` | Abruf von Kleinanzeigen nach `content/` |
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
