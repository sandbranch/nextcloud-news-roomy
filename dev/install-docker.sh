#!/bin/sh
# Installs the Roomy build of News into a Docker based Nextcloud, with a
# backup of the current app folder kept on the host.
#
#   sudo sh install-docker.sh install [package]   default package: ./news-*-roomy.tar.gz
#   sudo sh install-docker.sh restore <backup-dir>
#
# CONTAINER overrides the container name (default: nextcloud).
set -eu

C=${CONTAINER:-nextcloud}
HERE=$(cd "$(dirname "$0")" && pwd)

occ() {
	docker exec -u www-data "$C" php occ "$@"
}

app_path() {
	occ app:getpath news
}

swap_in() {
	# $1: folder on the host that contains the app files
	path=$(app_path)
	owner=$(docker exec "$C" stat -c %u:%g "$path")
	docker exec "$C" rm -rf /tmp/news-new
	docker cp "$1" "$C:/tmp/news-new"
	docker exec "$C" sh -c "chown -R $owner /tmp/news-new && rm -rf '$path' && mv /tmp/news-new '$path'"
	echo "Installed into $C:$path (owner $owner)"
}

case "${1:-}" in
install)
	pkg=${2:-$(ls "$HERE"/news-*-roomy.tar.gz | tail -1)}
	path=$(app_path)
	installed=$(docker exec "$C" sed -n 's:.*<version>\(.*\)</version>.*:\1:p' "$path/appinfo/info.xml" | head -1)
	tmp=$(mktemp -d)
	tar xzf "$pkg" -C "$tmp"
	packaged=$(sed -n 's:.*<version>\(.*\)</version>.*:\1:p' "$tmp/news/appinfo/info.xml" | head -1)
	if [ "$installed" != "$packaged" ]; then
		echo "Installed News is $installed but the package is $packaged; nothing changed." >&2
		rm -rf "$tmp"
		exit 1
	fi
	backup="$HERE/news-backup-$installed-$(date +%Y%m%d-%H%M%S)"
	docker cp "$C:$path" "$backup"
	echo "Backup of the current app: $backup"
	swap_in "$tmp/news"
	rm -rf "$tmp"
	;;
restore)
	[ -d "${2:-}/appinfo" ] || { echo "usage: $0 restore <backup-dir>" >&2; exit 1; }
	swap_in "$2"
	;;
*)
	echo "usage: $0 install [package] | restore <backup-dir>" >&2
	exit 1
	;;
esac

occ app:enable news
occ integrity:check-app news || true
occ status | grep -E "versionstring|maintenance"
echo "Done. Reload News in the browser with Ctrl+Shift+R."
