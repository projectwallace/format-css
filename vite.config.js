/// <reference types="vitest/config" />
import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { codecovVitePlugin } from '@codecov/vite-plugin'

export default defineConfig({
	build: {
		lib: {
			entry: resolve(__dirname, 'index.ts'),
			formats: ['es'],
		},
		rollupOptions: {
			// make sure to externalize deps that shouldn't be bundled
			// into your library
			external: ['css-tree'],
		},
	},
	plugins: [
		dts(),
		codecovVitePlugin({
			enableBundleAnalysis: process.env.CODECOV_TOKEN !== undefined,
			bundleName: 'formatCss',
			uploadToken: process.env.CODECOV_TOKEN,
		}),
	],
	test: {
		coverage: {
			provider: 'v8',
		},
	},
})
