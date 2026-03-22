import { defineConfig } from 'tsdown'

export default defineConfig([
	{
		entry: 'src/lib/index.ts',
		platform: 'neutral',
		publint: true,
	},
	{
		entry: 'src/cli/cli.ts',
		platform: 'node',
		dts: false,
		// Reference the lib via its package name to avoid bundling it twice
		deps: {
			neverBundle: ['@projectwallace/format-css'],
		},
	},
])
