import { translate as t } from '@nextcloud/l10n'
import { createApp } from 'vue'
import UnreadItemsWidget, { WIDGET_ID } from './components/dashboard/UnreadItemsWidget.vue'

document.addEventListener('DOMContentLoaded', () => {
	window.OCA.Dashboard.register(WIDGET_ID, (el: HTMLElement) => {
		const app = createApp(UnreadItemsWidget)
		app.config.globalProperties.t = t
		app.mount(el)
	})
})
