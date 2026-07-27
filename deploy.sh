#!/usr/bin/env bash
# Baut die Seite neu und veröffentlicht sie auf GitHub Pages.
# Voraussetzung (einmalig): gh installiert + `gh auth login` ausgeführt + Repo angelegt.
set -euo pipefail
cd "$(dirname "$0")"

echo "→ Build…"
node build.mjs >/dev/null

echo "→ Commit…"
git add -A
if git diff --cached --quiet; then
  echo "  (keine Änderungen)"
else
  git commit -m "Update Analysen $(date +%F)" >/dev/null
  echo "→ Push…"
  git push
fi

echo "✓ Fertig. Live in ~1 Minute: https://m4rc0815.github.io/finanz-analysen/"
