#!/bin/sh
# Builds an installable news.tar.gz: the official release of the version
# this branch is based on, with the frontend (js/) replaced by this build.
#
#   dev/package.sh [release]    e.g. dev/package.sh 28.7.0
#
# The upstream appinfo/signature.json is removed, because it cannot match
# the rebuilt js/. Nextcloud only integrity checks non-bundled apps that
# ship that file, so the admin overview stays free of integrity warnings.
set -eu

APP_DIR=$(cd "$(dirname "$0")/.." && pwd)
RELEASE=${1:-$(sed -n 's:.*<version>\(.*\)</version>.*:\1:p' "$APP_DIR/appinfo/info.xml" | head -1)}
OUT="$APP_DIR/build/news-$RELEASE-roomy.tar.gz"

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

gh release download "$RELEASE" -R nextcloud/news -p news.tar.gz -D "$tmp"
tar xzf "$tmp/news.tar.gz" -C "$tmp"

(cd "$APP_DIR" && npm ci && npx vite --mode production build)
rm -rf "$tmp/news/js"
cp -a "$APP_DIR/js" "$tmp/news/js"
rm -f "$tmp/news/appinfo/signature.json"

mkdir -p "$APP_DIR/build"
tar czf "$OUT" -C "$tmp" news
echo "$OUT"
