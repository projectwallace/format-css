import { test, expect, describe } from 'vitest'
import { parse_selector, parse_declaration, parse_value } from '@projectwallace/css-parser'
import {
	format,
	minify,
	format_selector,
	format_declaration,
	format_value,
	unquote,
} from '../src/lib/index.js'

test('empty input', () => {
	let actual = format(``)
	let expected = ``
	expect(actual).toEqual(expected)
})

test('handles invalid input', () => {
	let actual = format(`;`)
	let expected = ``
	expect(actual).toEqual(expected)
})

test('Vadim Makeevs example works', () => {
	let actual = format(`
	@layer what {
		@container (width > 0) {
			ul:has(:nth-child(1 of li)) {
				@media (height > 0) {
					&:hover {
						--is: this;
					}
				}
			}
		}
	}
	`)
	let expected = `@layer what {
	@container (width > 0) {
		ul:has(:nth-child(1 of li)) {
			@media (height > 0) {
				&:hover {
					--is: this;
				}
			}
		}
	}
}`
	expect(actual).toEqual(expected)
})

test('format minified Vadims example', () => {
	let actual = format(
		`@layer what{@container (width>0){@media (min-height:.001px){ul:has(:nth-child(1 of li)):hover{--is:this}}}}`,
	)

	let expected = `@layer what {
	@container (width > 0) {
		@media (min-height: .001px) {
			ul:has(:nth-child(1 of li)):hover {
				--is: this;
			}
		}
	}
}`
	expect(actual).toEqual(expected)
})

test('format minified Vadims example', () => {
	let input = `@layer what{@container (width>0){@media (min-height:.001px){ul:has(:nth-child(1 of li)):hover{--is:this}}}}`
	let actual = minify(input)
	expect(actual).toEqual(input)
})

describe('format_selector', () => {
	test('type selector', () => {
		let node = parse_selector('div').children[0]!
		expect(format_selector(node)).toBe('div')
	})

	test('class selector', () => {
		let node = parse_selector('.foo').children[0]!
		expect(format_selector(node)).toBe('.foo')
	})

	test('combinator keeps spaces by default', () => {
		let node = parse_selector('div > span').children[0]!
		expect(format_selector(node)).toBe('div > span')
	})

	test('combinator removes spaces when minified', () => {
		let node = parse_selector('div > span').children[0]!
		expect(format_selector(node, { minify: true })).toBe('div>span')
	})

	test('selector list', () => {
		let node = parse_selector('div, span')
		expect(format_selector(node)).toBe('div, span')
	})

	test('selector list minified', () => {
		let node = parse_selector('div, span')
		expect(format_selector(node, { minify: true })).toBe('div,span')
	})

	test('pseudo-class', () => {
		let node = parse_selector('a:hover').children[0]!
		expect(format_selector(node)).toBe('a:hover')
	})
})

describe('format_declaration', () => {
	test('basic property and value', () => {
		let node = parse_declaration('color: red')
		expect(format_declaration(node)).toBe('color: red')
	})

	test('minified removes space after colon', () => {
		let node = parse_declaration('color: red')
		expect(format_declaration(node, { minify: true })).toBe('color:red')
	})

	test('uppercased property is lowercased', () => {
		let node = parse_declaration('COLOR: red')
		expect(format_declaration(node)).toBe('color: red')
	})

	test('custom property preserves casing', () => {
		let node = parse_declaration('--myVar: 1')
		expect(format_declaration(node)).toBe('--myVar: 1')
	})

	test('!important', () => {
		let node = parse_declaration('color: red !IMPORTANT')
		expect(format_declaration(node)).toBe('color: red !important')
	})

	test('!important minified', () => {
		let node = parse_declaration('color: red !important')
		expect(format_declaration(node, { minify: true })).toBe('color:red!important')
	})
})

describe('format_value', () => {
	test('null returns empty string', () => {
		expect(format_value(null)).toBe('')
	})

	test('simple keyword', () => {
		let { children } = parse_value('red')
		expect(format_value(children)).toBe('red')
	})

	test('calc with + always keeps spaces', () => {
		let { children } = parse_value('calc(1px + 2px)')
		expect(format_value(children)).toBe('calc(1px + 2px)')
		expect(format_value(children, { minify: true })).toBe('calc(1px + 2px)')
	})

	test('calc with * uses optional space', () => {
		let { children } = parse_value('calc(1px * 2)')
		expect(format_value(children)).toBe('calc(1px * 2)')
		expect(format_value(children, { minify: true })).toBe('calc(1px*2)')
	})
})

describe('unquote', () => {
	test('removes double quotes', () => {
		expect(unquote('"hello"')).toBe('hello')
	})

	test('removes single quotes', () => {
		expect(unquote("'hello'")).toBe('hello')
	})

	test('no-op when no quotes', () => {
		expect(unquote('bare')).toBe('bare')
	})

	test('removes only surrounding quotes, not inner ones', () => {
		expect(unquote('"it\'s"')).toBe("it's")
	})
})
