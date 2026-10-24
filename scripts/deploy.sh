#!/usr/bin/env bash
# 앱을 빌드해서 GitHub Pages(gh-pages 브랜치)에 올린다. 사용법: npm run deploy
set -euo pipefail

npm run build
touch dist/.nojekyll

cd dist
rm -rf .git
git init -q -b gh-pages
git add -A
git -c core.autocrlf=false commit -q -m "배포 $(date +%F)"
git push -q -f "$(git -C .. remote get-url origin)" gh-pages
rm -rf .git

echo "배포 완료! 1~2분 뒤 https://suyeon100402.github.io/craftee/ 에 반영돼요."
