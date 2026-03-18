#!/usr/bin/env node

import { parseArgs, styleText } from 'node:util'
import { readFileSync } from 'node:fs'
import { format } from '@projectwallace/format-css'

function help(): string {
	return `
${styleText('bold', 'USAGE')}
  $ format-css [options] [file...]
  $ cat styles.css | format-css [options]

${styleText('bold', 'OPTIONS')}
  --minify            Minify the CSS output
  --tab-size=<n>      Use N spaces for indentation instead of tabs
  --help, -h          Show this help

${styleText('bold', 'EXAMPLES')}
  ${styleText('dim', '# Format a file')}
  $ format-css styles.css

  ${styleText('dim', '# Format with 2-space indentation')}
  $ format-css styles.css --tab-size=2

  ${styleText('dim', '# Minify')}
  $ format-css styles.css --minify

  ${styleText('dim', '# Via pipe')}
  $ cat styles.css | format-css
	`.trim()
}

async function readStdin(): Promise<string> {
	const chunks: Buffer[] = []
	for await (const chunk of process.stdin) {
		chunks.push(chunk)
	}
	return Buffer.concat(chunks).toString('utf-8')
}

async function cli(args: string[]): Promise<void> {
	if (args.includes('--help') || args.includes('-h')) {
		console.log(help())
		return
	}

	const { values, positionals } = parseArgs({
		args,
		allowPositionals: true,
		options: {
			minify: { type: 'boolean', default: false },
			'tab-size': { type: 'string' },
		},
	})

	let tab_size: number | undefined
	if (values['tab-size'] !== undefined) {
		tab_size = Number(values['tab-size'])
		if (isNaN(tab_size) || tab_size < 1) {
			throw new Error('--tab-size must be a positive integer')
		}
	}

	const options = {
		minify: values.minify,
		tab_size,
	}

	if (positionals.length > 0) {
		for (const file of positionals) {
			const css = readFileSync(file, 'utf-8')
			process.stdout.write(format(css, options))
		}
	} else if (!process.stdin.isTTY) {
		const css = await readStdin()
		process.stdout.write(format(css, options))
	} else {
		console.log(help())
	}
}

try {
	await cli(process.argv.slice(2))
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error))
	process.exit(1)
}
