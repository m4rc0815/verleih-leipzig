#!/usr/bin/env bash
# Baut die Seite neu und veröffentlicht sie auf GitHub Pages.
# Voraussetzung (einmalig): gh installiert + `gh auth login` ausgeführt + Repo angelegt.
set -euo pipefail
cd "$(dirname "$0")"

echo "→ Bilder aus Google Drive holen…"
node drive.mjs pull

echo "→ Build…"
node build.mjs >/dev/null

echo "→ Commit…"
git add -A
if git diff --cached --quiet; then
  echo "  (nichts Neues zu committen)"
else
  git commit -m "Update Angebote $(date +%F)" >/dev/null
  echo "  committet"
fi

# Pushen wird getrennt geprueft: Frueher hing der Push am Commit dieses Laufs.
# Wer vorher von Hand committet hatte, dessen Arbeit blieb dadurch liegen —
# das Skript meldete "keine Änderungen" und die Seite blieb still auf altem
# Stand. Jetzt entscheidet allein, ob der Server hinterherhinkt.
echo "→ Push…"
if ! git rev-parse --abbrev-ref '@{u}' >/dev/null 2>&1; then
  echo "  kein Upstream gesetzt — richte ihn ein"
  git push -u origin HEAD
elif [ -n "$(git log '@{u}..HEAD' --oneline)" ]; then
  echo "  $(git rev-list --count '@{u}..HEAD') Commit(s) zu übertragen"
  git push
else
  echo "  (nichts zu pushen, GitHub ist auf Stand)"
fi

echo "✓ Fertig. Live in ~1 Minute: https://m4rc0815.github.io/verleih-leipzig/"
