import axios from '@nextcloud/axios'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import UnreadItemsWidget, { WIDGET_ID } from '../../../../../src/components/dashboard/UnreadItemsWidget.vue'

describe('UnreadItemsWidget.vue', () => {
	'use strict'

	const items = [
		{ title: 'Newest', subtitle: 'Swedroid · 1 hour ago', link: '/apps/news/item/12', iconUrl: '/apps/news/favicon/abc', sinceId: '12' },
		{ title: 'Older', subtitle: 'SweClockers · 2 hours ago', link: '/apps/news/item/11', iconUrl: '', sinceId: '11' },
	]

	beforeEach(() => {
		vi.useFakeTimers()
		axios.get.mockReset()
		axios.get.mockResolvedValue({ data: { ocs: { data: { [WIDGET_ID]: items } } } })
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('loads the widget items from the dashboard api', async () => {
		const wrapper = shallowMount(UnreadItemsWidget)
		await flushPromises()

		expect(axios.get).toHaveBeenCalledWith(
			expect.stringContaining('apps/dashboard/api/v1/widget-items'),
			{ params: { widgets: [WIDGET_ID], limit: 7 } },
		)
		expect(wrapper.vm.items).toEqual(items)
		expect(wrapper.vm.loading).toBe(false)
	})

	it('shows no items when loading fails', async () => {
		axios.get.mockRejectedValue(new Error('offline'))
		vi.spyOn(console, 'error').mockImplementation(() => {})
		const wrapper = shallowMount(UnreadItemsWidget)
		await flushPromises()

		expect(wrapper.vm.items).toEqual([])
		expect(wrapper.vm.loading).toBe(false)
	})

	it('reloads every five minutes and stops when unmounted', async () => {
		const wrapper = shallowMount(UnreadItemsWidget)
		await flushPromises()
		expect(axios.get).toHaveBeenCalledTimes(1)

		vi.advanceTimersByTime(5 * 60 * 1000)
		expect(axios.get).toHaveBeenCalledTimes(2)

		wrapper.unmount()
		vi.advanceTimersByTime(5 * 60 * 1000)
		expect(axios.get).toHaveBeenCalledTimes(2)
	})
})
