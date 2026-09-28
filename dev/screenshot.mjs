// Screenshots of the local dev instance started by dev/local-nextcloud.sh.
// Needs: npm i --no-save playwright-core, and a system Chrome.
//
//   node dev/screenshot.mjs <out-dir> [path] [width] [height]
/* eslint-disable no-console */
import process from 'node:process'
import { chromium } from 'playwright-core'

const [outDir = '.', path = '/apps/news/', width = '1700', height = '1000'] = process.argv.slice(2)
const base = process.env.NC_URL ?? 'http://127.0.0.1:8088'

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome' })
const page = await browser.newPage({ viewport: { width: Number(width), height: Number(height) }, colorScheme: process.env.SCHEME ?? 'light' })
page.on('response', (r) => {
	if (r.status() >= 400) {
		console.error('http', r.status(), r.url())
	}
})
page.on('pageerror', (e) => console.error('pageerror:', e.message))
page.on('console', (m) => {
	if (m.type() === 'error' || m.type() === 'warning') {
		console.error('console.' + m.type() + ':', m.text().slice(0, 300))
	}
})
await page.goto(base + '/login')
await page.fill('#user', 'admin')
await page.fill('#password', 'admin')
await page.click('button[type=submit]')
await page.waitForURL((u) => !u.pathname.includes('/login'))
await page.goto(base + path)
await page.waitForSelector(process.env.WAIT ?? '.feed-item-row', { timeout: 30000 }).catch(() => console.error('no rows'))
await page.waitForTimeout(2500)
if (process.env.HOVER) {
	await page.hover('.feed-item-row >> nth=1')
	await page.waitForTimeout(300)
}
if (process.env.SETTINGS) {
	await page.getByText('News settings').click()
	await page.getByRole('link', { name: 'Appearance' }).click().catch(() => {})
	await page.waitForTimeout(800)
}
const name = process.env.NAME ?? `news-${width}x${height}`
const file = `${outDir}/${name}.png`
await page.screenshot({ path: file })
console.log(file)
await browser.close()
