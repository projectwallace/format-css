import { defineConfig } from 'tsdown'
import { codecovRollupPlugin } from '@codecov/rollup-plugin'

export default defineConfig([
	{
		entry: 'index.ts',
		platform: 'neutral',
		publint: true,
		plugins: [
			codecovRollupPlugin({
				enableBundleAnalysis: process.env.CODECOV_TOKEN !== undefined,
				bundleName: 'formatCss',
				uploadToken: process.env.CODECOV_TOKEN,
			}),
		],
	},
	{
		entry: 'src/cli/cli.ts',
		platform: 'node',
		dts: false,
		// Reference the lib via its package name to avoid bundling it twice
		external: ['@projectwallace/format-css'],
		plugins: [
			codecovRollupPlugin({
				enableBundleAnalysis: process.env.CODECOV_TOKEN !== undefined,
				bundleName: 'formatCssCli',
				uploadToken: process.env.CODECOV_TOKEN,
			}),
		],
	},
])
