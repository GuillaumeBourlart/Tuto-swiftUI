#!/usr/bin/env bash
set -euo pipefail

course_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
pages_repo="GuillaumeBourlart/Tuto-swiftUI-pages"
pages_base="/Tuto-swiftUI-pages"
publish_tmp="$(mktemp -d)"
trap 'rm -rf "$publish_tmp"' EXIT

# Publier l'état enregistré, dans un dossier temporaire, sans toucher au lecteur local.
mkdir "$publish_tmp/source"
git -C "$course_root" archive HEAD | tar -x -C "$publish_tmp/source"
npm --prefix "$publish_tmp/source/site" ci
npm --prefix "$publish_tmp/source/site" test
NEXT_PUBLIC_BASE_PATH="$pages_base" npm --prefix "$publish_tmp/source/site" run build
NEXT_PUBLIC_BASE_PATH="$pages_base" node "$publish_tmp/source/site/scripts/verifier-export.cjs"

git clone --depth 1 "https://github.com/$pages_repo.git" "$publish_tmp/pages"
rsync -a --delete --exclude='.git/' "$publish_tmp/source/site/out/" "$publish_tmp/pages/"
touch "$publish_tmp/pages/.nojekyll"
cat > "$publish_tmp/pages/README.md" <<'README'
# Cours SwiftUI — lecteur publié

[Ouvrir le cours](https://guillaumebourlart.github.io/Tuto-swiftUI-pages/)

Ce dépôt contient uniquement les pages générées. Les sources sont conservées dans le dépôt des sources GuillaumeBourlart/Tuto-swiftUI.
La progression et les notes restent dans le navigateur de chaque lecteur, avec export/import personnel.
README

publish_login="$(gh api user --jq .login)"
publish_user_id="$(gh api user --jq .id)"
git -C "$publish_tmp/pages" config user.name "$publish_login"
git -C "$publish_tmp/pages" config user.email "$publish_user_id+$publish_login@users.noreply.github.com"
git -C "$publish_tmp/pages" add --all
if git -C "$publish_tmp/pages" diff --cached --quiet; then
  echo 'Le lecteur publié est déjà à jour.'
  exit 0
fi
git -C "$publish_tmp/pages" commit -m 'Mettre à jour le lecteur SwiftUI'
git -C "$publish_tmp/pages" -c credential.helper='!gh auth git-credential' push origin main
echo 'Pages envoyées. GitHub Pages finalise la publication ; consulter Actions du dépôt public.'
