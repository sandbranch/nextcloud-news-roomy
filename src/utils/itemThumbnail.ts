import type { FeedItem } from '../types/FeedItem.ts'

import { MEDIA_TYPE, SHOW_MEDIA } from '../enums/index.ts'

type MediaOptions = Record<number, number>

const IMG_TAG = /<img\b[^>]*>/gi
const SRC_ATTR = /\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i
const SIZE_ATTR = /\s(width|height)\s*=\s*["']?(\d+)/gi

/**
 * Returns the src of the first image in an article body that is not a
 * tracking pixel or tiny icon
 *
 * @param body article html
 * @return image url or null
 */
export function firstBodyImage(body?: string | null): string | null {
	if (!body) {
		return null
	}
	for (const tag of body.match(IMG_TAG) ?? []) {
		const src = tag.match(SRC_ATTR)
		const url = src?.[1] ?? src?.[2]
		if (!url || !/^https?:\/\//i.test(url.trim())) {
			continue
		}
		let tiny = false
		for (const [, , size] of tag.matchAll(SIZE_ATTR)) {
			if (Number(size) < 32) {
				tiny = true
			}
		}
		if (!tiny) {
			return url.trim().replace(/&amp;/g, '&')
		}
	}
	return null
}

/**
 * Picks the image shown next to an article in the roomy list: the feed's
 * thumbnail, then an image enclosure, then the first image in the text.
 * Only sources the user has set to "Always" in the media settings are used,
 * since the list has no place for a consent button.
 *
 * @param item feed item
 * @param mediaOptions the user's media settings
 * @return image url or null
 */
export function itemThumbnail(item: FeedItem, mediaOptions: MediaOptions): string | null {
	if (mediaOptions[MEDIA_TYPE.THUMBNAILS] === SHOW_MEDIA.ALWAYS) {
		if (item.mediaThumbnail) {
			return item.mediaThumbnail
		}
		if (item.enclosureLink && item.enclosureMime?.startsWith('image/')) {
			return item.enclosureLink
		}
	}
	if (mediaOptions[MEDIA_TYPE.IMAGES_BODY] === SHOW_MEDIA.ALWAYS) {
		return firstBodyImage(item.body)
	}
	return null
}
