#!/bin/sh
# Builds an installable news.tar.gz: the official release of the version
# this branch is based on, with the frontend (js/) replaced by this build
# and every server file this branch adds or changes copied over it.
#
#   dev/package.sh [release]    e.g. dev/package.sh 28.7.0
#
# The upstream appinfo/signature.json is removed, because it cannot match
# the changed files. Nextcloud only integrity checks non-bundled apps that
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
git -C "$APP_DIR" fetch -q --no-tags upstream "refs/tags/$RELEASE:refs/tags/$RELEASE" 2>/dev/null || true
git -C "$APP_DIR" diff --name-only --diff-filter=AM "$RELEASE" HEAD -- lib appinfo templates css img l10n |
	while read -r f; do
		mkdir -p "$tmp/news/$(dirname "$f")"
		cp "$APP_DIR/$f" "$tmp/news/$f"
		echo "server file: $f"
	done
rm -f "$tmp/news/appinfo/signature.json"

mkdir -p "$APP_DIR/build"
tar czf "$OUT" -C "$tmp" news
echo "$OUT"
