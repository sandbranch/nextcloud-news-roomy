export type FeedItem = {
	id: string
	title: string
	unread: boolean
	starred: boolean
	filtered: boolean
	feedId: number
	guidHash: string
	pubDate: number
	url: string
	keepUnread: boolean
	body: string
	intro: string
	mediaThumbnail?: string | null
	enclosureLink?: string | null
	enclosureMime?: string | null
}
