<template>
	<NcDashboardWidget
		:items="items"
		:loading="loading"
		:showMoreUrl="showMoreUrl"
		:showMoreLabel="t('news', 'Show all unread articles')"
		:emptyContentMessage="t('news', 'No unread articles')">
		<template #default="{ item }">
			<a class="news-widget-item" :href="item.link" :title="item.title">
				<img
					v-if="item.iconUrl"
					class="news-widget-item__icon"
					:src="item.iconUrl"
					alt=""
					loading="lazy">
				<span class="news-widget-item__title">{{ item.title }}</span>
			</a>
		</template>
	</NcDashboardWidget>
</template>

<script lang="ts">
import axios from '@nextcloud/axios'
import { generateOcsUrl, generateUrl } from '@nextcloud/router'
import { defineComponent } from 'vue'
import NcDashboardWidget from '@nextcloud/vue/components/NcDashboardWidget'

export const WIDGET_ID = 'news-unread'

const RELOAD_INTERVAL = 5 * 60 * 1000

type WidgetItem = {
	title: string
	subtitle: string
	link: string
	iconUrl: string
	sinceId: string
}

export default defineComponent({
	name: 'UnreadItemsWidget',
	components: {
		NcDashboardWidget,
	},

	data() {
		return {
			items: [] as WidgetItem[],
			loading: true,
			timer: undefined as number | undefined,
		}
	},

	computed: {
		showMoreUrl(): string {
			return generateUrl('/apps/news/unread')
		},
	},

	mounted() {
		this.fetchItems()
		this.timer = window.setInterval(this.fetchItems, RELOAD_INTERVAL)
	},

	unmounted() {
		window.clearInterval(this.timer)
	},

	methods: {
		async fetchItems(): Promise<void> {
			try {
				// Same data the dashboard API serves to other clients
				const url = generateOcsUrl('apps/dashboard/api/v1/widget-items')
				const response = await axios.get(url, { params: { widgets: [WIDGET_ID], limit: 7 } })
				this.items = response.data.ocs.data[WIDGET_ID] ?? []
			} catch (error) {
				console.error('Failed to load unread articles', error)
				this.items = []
			} finally {
				this.loading = false
			}
		},
	},
})
</script>

<style scoped>
.news-widget-item {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 8px;
	border-radius: var(--border-radius-large, 8px);
	color: var(--color-main-text);
}

.news-widget-item:hover,
.news-widget-item:focus-visible {
	background-color: var(--color-background-hover);
}

.news-widget-item__icon {
	flex: 0 0 32px;
	width: 32px;
	height: 32px;
	border-radius: var(--border-radius, 4px);
	object-fit: contain;
}

.news-widget-item__title {
	min-width: 0;
	font-weight: bold;
	line-height: 20px;
	overflow: hidden;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	line-clamp: 2;
	-webkit-box-orient: vertical;
}
</style>
