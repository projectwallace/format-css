#!/usr/bin/env node

import { parseArgs, styleText } from 'node:util'
import { readFileSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
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

export type CliArguments = {
	files: string[]
	minify: boolean
	tab_size: number | undefined
}

export function parse_arguments(args: string[]): CliArguments {
	const { values, positionals } = parseArgs({
		args,
		allowPositionals: true,
		options: {
			minify: { type: 'boolean', default: false },
			'tab-size': { type: 'string' },
		},
	})

	const issues: string[] = []

	let tab_size: number | undefined
	if (values['tab-size'] !== undefined) {
		tab_size = Number(values['tab-size'])
		if (isNaN(tab_size) || tab_size < 1) {
			issues.push('--tab-size must be a positive integer')
		}
	}

	const cwd = process.cwd()
	const files: string[] = []
	for (const file of positionals) {
		const resolved = resolve(file)
		if (resolved !== cwd && !resolved.startsWith(cwd + sep)) {
			issues.push(`Invalid path: ${file}`)
		} else {
			files.push(resolved)
		}
	}

	if (issues.length > 0) {
		throw new Error(issues.join('\n'))
	}

	return { files, minify: values.minify ?? false, tab_size }
}

export type CliIO = {
	readFile: (path: string) => string
	readStdin: () => Promise<string>
	write: (output: string) => void
	isTTY: boolean
}

export async function run(args: string[], io: CliIO): Promise<void> {
	if (args.includes('--help') || args.includes('-h')) {
		io.write(help() + '\n')
		return
	}

	const { files, minify, tab_size } = parse_arguments(args)
	const options = { minify, tab_size }

	if (files.length > 0) {
		for (const file of files) {
			io.write(format(io.readFile(file), options))
		}
	} else if (!io.isTTY) {
		io.write(format(await io.readStdin(), options))
	} else {
		io.write(help() + '\n')
	}
}

async function read_stdin(): Promise<string> {
	const chunks: Buffer[] = []
	for await (const chunk of process.stdin) {
		chunks.push(chunk)
	}
	return Buffer.concat(chunks).toString('utf-8')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	try {
		await run(process.argv.slice(2), {
			readFile: (path) => readFileSync(path, 'utf-8'),
			readStdin: read_stdin,
			write: (output) => process.stdout.write(output),
			isTTY: process.stdin.isTTY === true,
		})
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error))
		process.exit(1)
	}
}
