import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
	resolve: {
		alias: {
			'@projectwallace/format-css/minify': resolve('./src/lib/minify.ts'),
			'@projectwallace/format-css': resolve('./src/lib/index.ts'),
		},
	},
	test: {
		coverage: {
			provider: 'v8',
		},
	},
})
