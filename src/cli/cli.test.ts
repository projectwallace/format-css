import { test, expect, describe, vi } from 'vitest'
import { resolve } from 'node:path'
import { parse_arguments, run } from './cli.js'

describe('parse_arguments', () => {
	describe('files', () => {
		test('no files returns empty array', () => {
			let result = parse_arguments([])
			expect(result.files).toEqual([])
		})

		test('valid file path is resolved to absolute path', () => {
			let result = parse_arguments(['styles.css'])
			expect(result.files).toEqual([resolve('styles.css')])
		})

		test('path traversal ../../etc throws', () => {
			expect(() => parse_arguments(['../../etc'])).toThrow('Invalid path: ../../etc')
		})

		test('path traversal ../sibling throws', () => {
			expect(() => parse_arguments(['../sibling/file.css'])).toThrow(
				'Invalid path: ../sibling/file.css',
			)
		})

		test('multiple valid files are all resolved', () => {
			let result = parse_arguments(['a.css', 'b.css'])
			expect(result.files).toEqual([resolve('a.css'), resolve('b.css')])
		})
	})

	describe('--minify', () => {
		test('defaults to false', () => {
			expect(parse_arguments([]).minify).toBe(false)
		})

		test('--minify sets minify to true', () => {
			expect(parse_arguments(['--minify']).minify).toBe(true)
		})
	})

	describe('--tab-size', () => {
		test('defaults to undefined', () => {
			expect(parse_arguments([]).tab_size).toBeUndefined()
		})

		test('--tab-size=2 sets tab_size to 2', () => {
			expect(parse_arguments(['--tab-size=2']).tab_size).toBe(2)
		})

		test('--tab-size=4 sets tab_size to 4', () => {
			expect(parse_arguments(['--tab-size=4']).tab_size).toBe(4)
		})

		test('--tab-size=0 throws', () => {
			expect(() => parse_arguments(['--tab-size=0'])).toThrow(
				'--tab-size must be a positive integer',
			)
		})

		test('--tab-size=-1 throws', () => {
			expect(() => parse_arguments(['--tab-size=-1'])).toThrow(
				'--tab-size must be a positive integer',
			)
		})

		test('--tab-size=abc throws', () => {
			expect(() => parse_arguments(['--tab-size=abc'])).toThrow(
				'--tab-size must be a positive integer',
			)
		})
	})

	test('unknown flag throws', () => {
		expect(() => parse_arguments(['--unknown'])).toThrow(
			`Unknown option '--unknown'. To specify a positional argument starting with a '-', place it at the end of the command after '--', as in '-- "--unknown"`,
		)
	})
})

describe('run', () => {
	function make_io(overrides: Partial<Parameters<typeof run>[1]> = {}) {
		return Object.assign(
			{
				readFile: vi.fn<() => string>(() => 'a{color:red}'),
				readStdin: vi.fn<() => Promise<string>>(() => Promise.resolve('a{color:red}')),
				write: vi.fn<(s: string) => void>(),
				isTTY: false,
			},
			overrides,
		)
	}

	test('--help shows help text', async () => {
		let io = make_io({ isTTY: true })
		await run(['--help'], io)
		expect(io.write).toHaveBeenCalledOnce()
		expect(io.write.mock.calls[0][0]).toContain('USAGE')
	})

	test('-h shows help text', async () => {
		let io = make_io({ isTTY: true })
		await run(['-h'], io)
		expect(io.write).toHaveBeenCalledOnce()
		expect(io.write.mock.calls[0][0]).toContain('USAGE')
	})

	test('no files and isTTY shows help text', async () => {
		let io = make_io({ isTTY: true })
		await run([], io)
		expect(io.write.mock.calls[0][0]).toContain('USAGE')
	})

	test('reads from stdin when no files and not a TTY', async () => {
		let io = make_io({ isTTY: false })
		await run([], io)
		expect(io.readStdin).toHaveBeenCalledOnce()
		expect(io.write).toHaveBeenCalledOnce()
	})

	test('formats file and writes output', async () => {
		let io = make_io({ readFile: vi.fn<() => string>(() => 'a{color:red}') })
		await run(['styles.css'], io)
		expect(io.readFile).toHaveBeenCalledOnce()
		expect(io.write).toHaveBeenCalledOnce()
		expect(io.write.mock.calls[0][0]).toContain('color: red')
	})

	test('formats multiple files', async () => {
		let io = make_io({ readFile: vi.fn<() => string>(() => 'a{color:red}') })
		await run(['a.css', 'b.css'], io)
		expect(io.readFile).toHaveBeenCalledTimes(2)
		expect(io.write).toHaveBeenCalledTimes(2)
	})

	test('--minify minifies the output', async () => {
		let io = make_io({ readFile: vi.fn<() => string>(() => 'a { color: red; }') })
		await run(['styles.css', '--minify'], io)
		expect(io.write.mock.calls[0][0]).toBe('a{color:red}')
	})

	test('--tab-size=2 uses 2-space indentation', async () => {
		let io = make_io({ readFile: vi.fn<() => string>(() => 'a{color:red}') })
		await run(['styles.css', '--tab-size=2'], io)
		expect(io.write.mock.calls[0][0]).toContain('  color')
	})

	test('path traversal throws', async () => {
		let io = make_io()
		await expect(run(['../../etc/passwd'], io)).rejects.toThrow('Invalid path: ../../etc/passwd')
	})
})
