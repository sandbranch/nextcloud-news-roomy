#!/bin/sh
# Throwaway local Nextcloud with this checkout mounted as the News app.
# Needs Docker and the gh CLI; PHP libraries come from the News release tarball.
#
#   dev/local-nextcloud.sh up      build deps, start at http://127.0.0.1:8088 (admin/admin)
#   dev/local-nextcloud.sh feeds   subscribe the test feeds and fetch them
#   dev/local-nextcloud.sh down    remove the container
set -eu

APP_DIR=$(cd "$(dirname "$0")/.." && pwd)
NAME=news-dev
IMAGE=${NEXTCLOUD_IMAGE:-nextcloud:33-apache}
PORT=${PORT:-8088}
RELEASE=${NEWS_RELEASE:-29.0.0-beta.1}

occ() {
	docker exec -u www-data "$NAME" php occ "$@"
}

case "${1:-up}" in
up)
	if [ ! -d "$APP_DIR/lib/Vendor/FeedIo" ]; then
		# The scoped PHP libraries are taken from the official release
		# tarball; rebuilding them with php-scoper locally is not needed
		# for frontend work.
		tmp=$(mktemp -d)
		gh release download "$RELEASE" -R nextcloud/news -p news.tar.gz -D "$tmp"
		tar xzf "$tmp/news.tar.gz" -C "$tmp"
		rm -rf "$APP_DIR/vendor" "$APP_DIR/lib/Vendor"
		cp -a "$tmp/news/vendor" "$APP_DIR/vendor"
		cp -a "$tmp/news/lib/Vendor" "$APP_DIR/lib/Vendor"
		rm -rf "$tmp"
	fi
	[ -d "$APP_DIR/js" ] || (cd "$APP_DIR" && npm ci && npx vite --mode production build)
	docker rm -f "$NAME" >/dev/null 2>&1 || true
	docker run -d --name "$NAME" -p "127.0.0.1:$PORT:80" \
		-e SQLITE_DATABASE=nextcloud \
		-e NEXTCLOUD_ADMIN_USER=admin -e NEXTCLOUD_ADMIN_PASSWORD=admin \
		-e NEXTCLOUD_TRUSTED_DOMAINS="127.0.0.1 localhost" \
		-v "$APP_DIR:/var/www/html/custom_apps/news" "$IMAGE" >/dev/null
	echo "Waiting for Nextcloud to install..."
	until occ status 2>/dev/null | grep -q "installed: true"; do sleep 3; done
	occ app:enable news
	echo "Nextcloud is up at http://127.0.0.1:$PORT (admin/admin)"
	;;
feeds)
	for url in https://swedroid.se/feed/ https://www.sweclockers.com/feeds/nyheter \
		https://www.omgubuntu.co.uk/feed https://feeds.arstechnica.com/arstechnica/index; do
		occ news:feed:add admin "$url" || true
	done
	occ news:updater:update-user admin
	;;
down)
	docker rm -f "$NAME"
	;;
*)
	echo "usage: $0 up|feeds|down" >&2
	exit 1
	;;
esac
