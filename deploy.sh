#!/bin/bash
# DM Smart deploy — atualiza CACHE name no SW + commit + push
# Cache busting natural: SW novo apaga caches antigos no activate event
set -e

MSG="${1:-update}"
VERSION="v$(date +%m%d%H%M)"

# Atualiza CACHE name no sw.js — força browsers a baixarem assets novos
sed -i "s/const CACHE = 'dmsmart-v[^']*';/const CACHE = 'dmsmart-${VERSION}';/" sw.js
# Atualiza versão exposta no badge / console
sed -i "s/window.DMSMART_VERSION = 'v[^']*';/window.DMSMART_VERSION = '${VERSION}';/" js/version.js

git add sw.js js/ css/ manifest.json index.html mobile*.html 2>/dev/null
# Adiciona arquivos modificados específicos da sessão (sem .claude/, assets/, etc)
git status --porcelain | grep -E '^.M' | awk '{print $2}' | xargs -r git add 2>/dev/null

git commit -m "${VERSION} ${MSG}" || { echo "Nada pra commitar"; exit 0; }
git push origin dev

# Sync master = dev (Gitflow: dev é a fonte da verdade, master serve GH Pages)
git checkout master
git reset --hard dev
git push --force-with-lease origin master
git checkout dev

echo "✓ ${VERSION} no ar · https://app.dmstack.com.br"
