<template>
	<li
		class="feed-item-row"
		:class="{ compact: compactMode, roomy: roomyMode }"
		:aria-label="item.title"
		:aria-setsize="itemCount"
		:aria-posinset="itemIndex"
		:style="{ height: `${itemHeight}px` }"
		role="button"
		tabindex="0"
		@keydown.enter="select()"
		@keydown.space.prevent="select()"
		@click="select()">
		<ShareItem v-if="showShareMenu" :itemId="shareItem" @close="closeShareMenu()" />
		<div v-if="roomyMode" class="thumbnail-container">
			<img
				v-if="thumbnail"
				class="thumbnail"
				:src="thumbnail"
				alt=""
				loading="lazy"
				referrerpolicy="no-referrer"
				@error="thumbnailFailed = true">
			<span
				v-else
				class="favicon"
				:style="{ backgroundImage: 'url(' + feedIcon + ')' }" />
		</div>
		<div v-else class="link-container">
			<a
				class="external"
				target="_blank"
				rel="noreferrer"
				:href="item.url"
				:title="t('news', 'Open website')"
				:aria-label="`${t('news', 'Open website')} ${item.url}`"
				@click.middle="markRead(item); $event.stopPropagation();"
				@click="markRead(item); $event.stopPropagation();">
				<span
					class="favicon"
					:style="{ backgroundImage: 'url(' + feedIcon + ')' }" />
			</a>
		</div>

		<div class="main-container" :class="{ compact: compactMode }">
			<h1
				class="title-container"
				:class="{ compact: compactMode, mobile: isMobile, unread: item.unread }"
				:dir="item.rtl && 'rtl'">
				{{ item.title }}
			</h1>

			<div v-if="roomyMode" class="meta-container">
				<a
					class="external"
					target="_blank"
					rel="noreferrer"
					:href="item.url"
					:title="t('news', 'Open website')"
					:aria-label="`${t('news', 'Open website')} ${item.url}`"
					@click.middle="markRead(item); $event.stopPropagation();"
					@click="markRead(item); $event.stopPropagation();">
					<span
						class="favicon"
						:style="{ backgroundImage: 'url(' + feedIcon + ')' }" />
				</a>
				<span class="feed-title">{{ getFeed(item.feedId).title }}</span>
				<span aria-hidden="true">·</span>
				<time class="date" :title="formatDate(item.pubDate)" :datetime="formatDateISO(item.pubDate)">
					{{ formatDateRelative(item.pubDate) }}
				</time>
			</div>

			<div class="intro-container" :class="{ compact: compactMode }">
				<!-- eslint-disable vue/no-v-html -->
				<span class="intro" v-html="item.intro" />
				<!--eslint-enable-->
			</div>

			<div v-if="!roomyMode" class="date-container" :class="{ compact: compactMode }">
				<time class="date" :title="formatDate(item.pubDate)" :datetime="formatDateISO(item.pubDate)">
					{{ formatDateRelative(item.pubDate) }}
				</time>
			</div>
		</div>

		<div class="button-container" :class="{ roomy: roomyMode }" @click="$event.stopPropagation()">
			<NcActions :inline="isMobile ? 0 : 3">
				<NcActionButton
					:title="t('news', 'Toggle star article')"
					@click="toggleStarred(item)">
					{{ t('news', 'Toggle star article') }}
					<template #icon>
						<StarIcon :class="{ starred: item.starred }" :size="iconSize" />
					</template>
				</NcActionButton>
				<NcActionButton
					v-if="item.unread && !item.keepUnread"
					:title="t('news', 'Keep article unread')"
					@click="toggleKeepUnread(item)">
					{{ t('news', 'Keep article unread') }}
					<template #icon>
						<EyeIcon :size="iconSize" />
					</template>
				</NcActionButton>
				<NcActionButton
					v-if="!item.unread && item.filtered && !item.keepUnread"
					:title="t('news', 'Keep article unread (auto-filtered)')"
					@click="toggleKeepUnread(item)">
					{{ t('news', 'Keep article unread (auto-filtered)') }}
					<template #icon>
						<FilterIcon :size="iconSize" :style="{ color: 'var(--color-placeholder-dark)' }" />
					</template>
				</NcActionButton>
				<NcActionButton
					v-if="!item.unread && !item.filtered && !item.keepUnread"
					:title="t('news', 'Toggle keep current article unread')"
					@click="toggleKeepUnread(item)">
					{{ t('news', 'Toggle keep current article unread') }}
					<template #icon>
						<EyeCheckIcon :size="iconSize" />
					</template>
				</NcActionButton>
				<NcActionButton
					v-if="item.keepUnread"
					:title="t('news', 'Remove keep article unread')"
					@click="toggleKeepUnread(item)">
					{{ t('news', 'Remove keep article unread') }}
					<template #icon>
						<EyeLockIcon :size="iconSize" />
					</template>
				</NcActionButton>
				<NcActionButton :title="t('news', 'Share within Instance')" @click="shareItem = item.id; showShareMenu = true">
					{{ t('news', 'Share within Instance') }}
					<template #icon>
						<ShareVariant :size="iconSize" />
					</template>
				</NcActionButton>
			</NcActions>
		</div>
	</li>
</template>

<script lang="ts">
import type { Feed } from '../../types/Feed.ts'
import type { FeedItem } from '../../types/FeedItem.ts'

import { useIsMobile } from '@nextcloud/vue/composables/useIsMobile'
import { defineComponent } from 'vue'
import NcActionButton from '@nextcloud/vue/components/NcActionButton'
import NcActions from '@nextcloud/vue/components/NcActions'
import EyeIcon from 'vue-material-design-icons/Eye.vue'
import EyeCheckIcon from 'vue-material-design-icons/EyeCheck.vue'
import EyeLockIcon from 'vue-material-design-icons/EyeLock.vue'
import FilterIcon from 'vue-material-design-icons/Filter.vue'
import ShareVariant from 'vue-material-design-icons/ShareVariant.vue'
import StarIcon from 'vue-material-design-icons/Star.vue'
import ShareItem from '../ShareItem.vue'
import { DISPLAY_MODE, ITEM_HEIGHT, SPLIT_MODE } from '../../enums/index.ts'
import { ACTIONS, MUTATIONS } from '../../store/index.ts'
import { API_ROUTES } from '../../types/ApiRoutes.ts'
import { formatDate, formatDateISO, formatDateRelative } from '../../utils/dateUtils.ts'
import { itemThumbnail } from '../../utils/itemThumbnail.ts'

export default defineComponent({
	name: 'FeedItemRow',
	components: {
		StarIcon,
		EyeIcon,
		EyeCheckIcon,
		EyeLockIcon,
		FilterIcon,
		ShareVariant,
		NcActions,
		NcActionButton,
		ShareItem,
	},

	props: {
		/**
		 * The item to display
		 */
		item: {
			type: Object,
			required: true,
		},

		/**
		 * The number of items in the current list
		 */
		itemCount: {
			type: Number,
			required: true,
		},

		/**
		 * The index of the item in the current list
		 */
		itemIndex: {
			type: Number,
			required: true,
		},

		/**
		 * The name of the view e.g. all, unread, feed-10
		 */
		fetchKey: {
			type: String,
			required: true,
		},
	},

	emits: {
		showDetails: () => true,
	},

	setup: () => {
		return {
			isMobile: useIsMobile(),
		}
	},

	data: () => {
		return {
			showShareMenu: false,
			shareItem: undefined,
			thumbnailFailed: false,
		}
	},

	computed: {
		compactMode() {
			return this.$store.getters.displaymode === DISPLAY_MODE.COMPACT
		},

		roomyMode() {
			return this.$store.getters.displaymode === DISPLAY_MODE.ROOMY
		},

		thumbnail() {
			if (this.thumbnailFailed) {
				return null
			}
			return itemThumbnail(this.item, this.$store.getters.mediaOptions ?? {})
		},

		iconSize() {
			return this.roomyMode ? 18 : 24
		},

		verticalSplit() {
			return this.$store.getters.splitmode === SPLIT_MODE.VERTICAL
		},

		itemHeight() {
			if (this.roomyMode) {
				return ITEM_HEIGHT.ROOMY
			}
			return this.compactMode ? ITEM_HEIGHT.COMPACT : ITEM_HEIGHT.DEFAULT
		},

		feedIcon() {
			return API_ROUTES.FAVICON + '/' + this.getFeed(this.item.feedId).urlHash
		},
	},

	methods: {
		formatDate,
		formatDateRelative,
		formatDateISO,
		select(): void {
			this.$store.commit(MUTATIONS.SET_SELECTED_ITEM, { id: this.item.id, key: this.fetchKey })
			this.markRead(this.item)
			this.$emit('showDetails')
		},

		getFeed(id: number): Feed {
			return this.$store.getters.feeds.find((feed: Feed) => feed.id === id) || {}
		},

		markRead(item: FeedItem): void {
			if (!item.keepUnread && item.unread) {
				this.$store.dispatch(ACTIONS.MARK_READ, { item })
			}
		},

		toggleKeepUnread(item: FeedItem): void {
			item.keepUnread = !item.keepUnread
			this.$store.dispatch(ACTIONS.MARK_UNREAD, { item })
		},

		toggleStarred(item: FeedItem): void {
			this.$store.dispatch(item.starred ? ACTIONS.UNSTAR_ITEM : ACTIONS.STAR_ITEM, { item })
		},

		closeShareMenu() {
			this.showShareMenu = false
		},
	},
})

</script>

<style>
	.feed-item-row {
		display: flex; padding: 10px 10px;
	}

	.feed-item-row.compact {
		container-type: inline-size;
		display: flex; padding: 4px 4px !important;
		border-bottom: 1px solid var(--color-border);
	}

	.feed-item-row.compact a.external {
		line-height: 0;
	}

	.feed-item-row:hover {
		background-color: var(--color-background-hover);
	}

	.feed-item-row, .feed-item-row * {
		cursor: pointer;
	}

	.feed-item-row .link-container {
		padding-inline-end: 12px;
		display: flex;
		flex-direction: row;
		align-self: center;
	}

	.favicon {
		height: 24px;
		width: 24px;
		display: inline-block;
		background-size: contain;
	}

	.feed-item-row .main-container {
		flex-grow: 1;
		min-width: 0;
	}

	.feed-item-row .main-container.compact {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.feed-item-row .title-container {
		color: var(--color-text-lighter);
		flex-grow: 1;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.feed-item-row .title-container.unread {
		color: var(--color-main-text);
		font-weight: bold;
	}

	.feed-item-row .title-container.compact {
		flex: 0 1 auto;
		overflow-y: unset;
		max-width: 100%;
		text-overflow: clip;
	}

	.feed-item-row .title-container.mobile {
		overflow-x: scroll;
	}

	.feed-item-row .intro-container {
		line-height: initial;
		height: 32pt;
		overflow: hidden;
	}

	.feed-item-row .intro-container.compact {
		flex: 1 1;
		height: 26pt !important;
		align-content: center;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.feed-item-row .intro {
		color: var(--color-text-lighter);
		font-size: 10pt;
		font-weight: normal;
	}

	@media only screen and (min-width: 320px) {
		.feed-item-row .date-container {
			font-size: small;
		}
	}

	@media only screen and (min-width: 768px) {
		.feed-item-row .date-container {
			font-size: medium;
		}
	}

	.feed-item-row .date-container {
		color: var(--color-text-lighter);
		white-space: nowrap;
	}

	@container (min-width: 500px) {
		.feed-item-row .date-container.compact {
			flex: 0 0 auto;
			font-size: small;
			padding-inline-end: 4px;
		}
	}

	@container (max-width: 499px) {
		.feed-item-row .date-container.compact {
			display: none;
		}
	}

	.feed-item-row .button-container {
		display: flex;
		flex-direction: row;
		align-self: center;
	}

	.feed-item-row .button-container .button-vue,
	.feed-item-row .button-container .button-vue .button-vue__wrapper,
	.feed-item-row .button-container .material-design-icon
	{
		width: 24px !important;
		min-width: 24px;
		min-height: 24px;
		height: 24px;
	}

	.feed-item-row .button-container .material-design-icon {
		color: var(--color-text-lighter)
	}

	.feed-item-row .button-container .material-design-icon:hover {
		color: var(--color-text-light);
	}

	.feed-item-row .button-container .material-design-icon.rss-icon:hover {
		color: #555555;
	}

	.material-design-icon.starred {
		color: rgb(255, 204, 0) !important;
	}

	.feed-item-row .button-container .material-design-icon.keep-unread {
		color: var(--color-main-text);
	}

	.material-design-icon.starred:hover {
		color: #555555;
	}

	.feed-item-row .button-container .eye-check-icon {
		color: var(--color-placeholder-dark);
	}

	/* Roomy: thumbnail, two line title, source line, two line excerpt */
	.feed-item-row.roomy {
		container-type: inline-size;
		box-sizing: border-box;
		align-items: flex-start;
		gap: 16px;
		padding: 14px 12px 14px 16px;
		border-bottom: 1px solid var(--color-border);
	}

	.feed-item-row.roomy .thumbnail-container {
		flex: 0 0 128px;
		height: 80px;
		margin-top: 2px;
		border-radius: var(--border-radius-large, 8px);
		overflow: hidden;
		background-color: var(--color-background-dark);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.feed-item-row.roomy .thumbnail {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.feed-item-row.roomy .thumbnail-container .favicon {
		opacity: 0.5;
	}

	.feed-item-row.roomy .main-container {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.feed-item-row.roomy .title-container {
		margin: 0;
		font-size: 16px;
		line-height: 21px;
		white-space: normal;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
	}

	.feed-item-row.roomy .meta-container {
		display: flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
		font-size: 13px;
		line-height: 18px;
		color: var(--color-text-maxcontrast);
		white-space: nowrap;
	}

	.feed-item-row.roomy .meta-container a.external {
		line-height: 0;
	}

	.feed-item-row.roomy .meta-container .favicon {
		width: 14px;
		height: 14px;
	}

	.feed-item-row.roomy .feed-title {
		overflow: hidden;
		text-overflow: ellipsis;
		min-width: 0;
	}

	.feed-item-row.roomy .intro-container {
		height: 36px;
		line-height: 18px;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
	}

	.feed-item-row.roomy .intro {
		font-size: 13px;
	}

	/* The actions float over the top right corner so the text gets the full width */
	.feed-item-row.roomy {
		position: relative;
	}

	.feed-item-row .button-container.roomy {
		position: absolute;
		top: 8px;
		inset-inline-end: 8px;
		padding: 2px;
		border-radius: var(--border-radius-element, 8px);
		background-color: var(--color-main-background);
		box-shadow: 0 0 6px var(--color-box-shadow);
	}

	@media (hover: hover) {
		.feed-item-row .button-container.roomy {
			opacity: 0;
			transition: opacity 0.1s ease-in-out;
		}

		.feed-item-row.roomy:hover .button-container.roomy,
		.feed-item-row.roomy:focus-within .button-container.roomy {
			opacity: 1;
		}
	}

	.feed-item-row .button-container.roomy .button-vue,
	.feed-item-row .button-container.roomy .button-vue .button-vue__wrapper {
		width: 28px !important;
		min-width: 28px;
		min-height: 28px;
		height: 28px;
	}

	.feed-item-row .button-container.roomy .material-design-icon {
		width: 18px !important;
		min-width: 18px;
		min-height: 18px;
		height: 18px;
	}

	@container (max-width: 480px) {
		.feed-item-row.roomy .thumbnail-container {
			flex-basis: 72px;
			height: 72px;
		}
	}

	.active, .active:hover {
		background-color: var(--color-background-darker);
	}
</style>
