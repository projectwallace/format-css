import { describe, test, expect } from 'vitest'
import {
	format_with_types,
	LINE_TYPE_SELECTOR,
	LINE_TYPE_DECLARATION,
	LINE_TYPE_BRACKET,
	LINE_TYPE_ATRULE,
	LINE_TYPE_COMMENT,
	LINE_TYPE_EMPTY,
} from '../src/lib/index.js'

describe('format_with_types', () => {
	test('simple rule', () => {
		let { css, types } = format_with_types('a { color: red; }')
		expect(css).toBe('a {\n\tcolor: red;\n}')
		expect(types).toEqual([LINE_TYPE_SELECTOR, LINE_TYPE_DECLARATION, LINE_TYPE_BRACKET])
	})

	test('multiple declarations', () => {
		let { css, types } = format_with_types('a { color: red; background: blue; }')
		expect(types).toEqual([
			LINE_TYPE_SELECTOR,
			LINE_TYPE_DECLARATION,
			LINE_TYPE_DECLARATION,
			LINE_TYPE_BRACKET,
		])
	})

	test('multi-line selector list', () => {
		let { css, types } = format_with_types('a, b { color: red; }')
		expect(css).toBe('a,\nb {\n\tcolor: red;\n}')
		expect(types).toEqual([
			LINE_TYPE_SELECTOR,
			LINE_TYPE_SELECTOR,
			LINE_TYPE_DECLARATION,
			LINE_TYPE_BRACKET,
		])
	})

	test('atrule with block', () => {
		let { css, types } = format_with_types('@media all { a { color: red } }')
		expect(css).toBe('@media all {\n\ta {\n\t\tcolor: red;\n\t}\n}')
		expect(types).toEqual([
			LINE_TYPE_ATRULE,
			LINE_TYPE_SELECTOR,
			LINE_TYPE_DECLARATION,
			LINE_TYPE_BRACKET,
			LINE_TYPE_BRACKET,
		])
	})

	test('atrule without block (@charset)', () => {
		let { css, types } = format_with_types('@charset "utf-8";')
		expect(css).toBe('@charset "utf-8";')
		expect(types).toEqual([LINE_TYPE_ATRULE])
	})

	test('atrule without block (@import)', () => {
		let { css, types } = format_with_types('@import "foo.css";')
		expect(css).toBe('@import "foo.css";')
		expect(types).toEqual([LINE_TYPE_ATRULE])
	})

	test('empty line between rules', () => {
		let { css, types } = format_with_types('a {} b {}')
		expect(css).toBe('a {}\n\nb {}')
		expect(types).toEqual([LINE_TYPE_BRACKET, LINE_TYPE_EMPTY, LINE_TYPE_BRACKET])
	})

	test('single-line comment before rule', () => {
		let { css, types } = format_with_types('/* comment */ a { color: red; }')
		expect(css).toBe('/* comment */\na {\n\tcolor: red;\n}')
		expect(types).toEqual([
			LINE_TYPE_COMMENT,
			LINE_TYPE_SELECTOR,
			LINE_TYPE_DECLARATION,
			LINE_TYPE_BRACKET,
		])
	})

	test('single-line comment inside rule', () => {
		let { css, types } = format_with_types('a { /* comment */ color: red; }')
		expect(css).toBe('a {\n\t/* comment */\n\tcolor: red;\n}')
		expect(types).toEqual([
			LINE_TYPE_SELECTOR,
			LINE_TYPE_COMMENT,
			LINE_TYPE_DECLARATION,
			LINE_TYPE_BRACKET,
		])
	})

	test('multiline comment before rule', () => {
		let { css, types } = format_with_types('/* line 1\n   line 2 */ a { color: red; }')
		expect(css).toBe('/* line 1\n   line 2 */\na {\n\tcolor: red;\n}')
		expect(types).toEqual([
			LINE_TYPE_COMMENT,
			LINE_TYPE_COMMENT,
			LINE_TYPE_SELECTOR,
			LINE_TYPE_DECLARATION,
			LINE_TYPE_BRACKET,
		])
	})

	test('multiline comment inside rule', () => {
		let { css, types } = format_with_types(
			'a {\n\t/* line 1\n\t   line 2 */\n\tcolor: red;\n}',
		)
		expect(css).toBe('a {\n\t/* line 1\n\t   line 2 */\n\tcolor: red;\n}')
		expect(types).toEqual([
			LINE_TYPE_SELECTOR,
			LINE_TYPE_COMMENT,
			LINE_TYPE_COMMENT,
			LINE_TYPE_DECLARATION,
			LINE_TYPE_BRACKET,
		])
	})

	test('multiline comment spanning three lines', () => {
		let { css, types } = format_with_types('/* a\n * b\n * c */ a { color: red; }')
		expect(css).toBe('/* a\n * b\n * c */\na {\n\tcolor: red;\n}')
		expect(types).toEqual([
			LINE_TYPE_COMMENT,
			LINE_TYPE_COMMENT,
			LINE_TYPE_COMMENT,
			LINE_TYPE_SELECTOR,
			LINE_TYPE_DECLARATION,
			LINE_TYPE_BRACKET,
		])
	})

	test('comment containing a semicolon is not a declaration', () => {
		let { css, types } = format_with_types('a { /* color: red; */ color: blue; }')
		expect(types).toEqual([
			LINE_TYPE_SELECTOR,
			LINE_TYPE_COMMENT,
			LINE_TYPE_DECLARATION,
			LINE_TYPE_BRACKET,
		])
	})

	test('comment containing a brace is not a bracket', () => {
		let { css, types } = format_with_types('/* } */ a { color: red; }')
		expect(types[0]).toBe(LINE_TYPE_COMMENT)
	})

	test('types array length matches number of lines', () => {
		let input = '@media all { a, b { color: red; background: blue; } }'
		let { css, types } = format_with_types(input)
		expect(types).toHaveLength(css.split('\n').length)
	})

	test('tab_size option is forwarded', () => {
		let { css } = format_with_types('a { color: red; }', { tab_size: 2 })
		expect(css).toBe('a {\n  color: red;\n}')
	})
})
