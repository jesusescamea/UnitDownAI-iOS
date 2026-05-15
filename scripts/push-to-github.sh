#!/usr/bin/env bash
set -e

TOKEN="${GITHUB_PAT}"
REPO="https://${TOKEN}@github.com/jesusescamea/UnitDown-AI.git"

git remote remove github 2>/dev/null || true
git remote add github "$REPO"
git push github main --force
git remote remove github
echo "Done."
