import { describe, expect, it } from 'vitest'
import { MEDIA_TYPE, SHOW_MEDIA } from '../../../../src/enums/index.ts'
import { firstBodyImage, itemThumbnail } from '../../../../src/utils/itemThumbnail.ts'

const always = {
	[MEDIA_TYPE.THUMBNAILS]: SHOW_MEDIA.ALWAYS,
	[MEDIA_TYPE.IMAGES]: SHOW_MEDIA.ALWAYS,
	[MEDIA_TYPE.IMAGES_BODY]: SHOW_MEDIA.ALWAYS,
	[MEDIA_TYPE.IFRAMES_BODY]: SHOW_MEDIA.ALWAYS,
}

describe('firstBodyImage', () => {
	it('returns null without body or images', () => {
		expect(firstBodyImage(null)).toBeNull()
		expect(firstBodyImage('<p>text only</p>')).toBeNull()
	})

	it('returns the first image and decodes entities', () => {
		const body = '<p><img class="x" src="https://example.com/a.webp?w=1&amp;h=2"></p><img src="https://example.com/b.jpg">'
		expect(firstBodyImage(body)).toBe('https://example.com/a.webp?w=1&h=2')
	})

	it('skips tracking pixels and non http sources', () => {
		const body = '<img src="https://t.example.com/p.gif" width="1" height="1"><img src="data:image/png;base64,AA"><img src=\'https://example.com/real.png\' width="600">'
		expect(firstBodyImage(body)).toBe('https://example.com/real.png')
	})
})

describe('itemThumbnail', () => {
	const body = '<img src="https://example.com/body.jpg">'

	it('prefers the feed thumbnail, then an image enclosure, then the body', () => {
		expect(itemThumbnail({ mediaThumbnail: 'https://example.com/t.jpg', body } as any, always)).toBe('https://example.com/t.jpg')
		expect(itemThumbnail({ enclosureLink: 'https://example.com/e.jpg', enclosureMime: 'image/jpeg', body } as any, always)).toBe('https://example.com/e.jpg')
		expect(itemThumbnail({ enclosureLink: 'https://example.com/e.mp3', enclosureMime: 'audio/mpeg', body } as any, always)).toBe('https://example.com/body.jpg')
	})

	it('only uses sources set to always', () => {
		const item = { mediaThumbnail: 'https://example.com/t.jpg', body } as any
		expect(itemThumbnail(item, { ...always, [MEDIA_TYPE.THUMBNAILS]: SHOW_MEDIA.ASK })).toBe('https://example.com/body.jpg')
		expect(itemThumbnail(item, { ...always, [MEDIA_TYPE.THUMBNAILS]: SHOW_MEDIA.NEVER, [MEDIA_TYPE.IMAGES_BODY]: SHOW_MEDIA.ASK })).toBeNull()
	})
})
