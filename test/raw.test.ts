import { test, expect, describe } from 'vitest'
import { parse, type Declaration, type Rule, type Atrule } from '@projectwallace/css-parser'
import {
	format_declaration,
	format_value,
	format_selector_list,
	format_atrule_prelude,
} from '../src/lib/index.js'

function first_declaration(css: string) {
	let rule = parse(css, { parse_values: false }).first_child!
	return rule.block!.first_child as Declaration
}

describe('parse_values: false', () => {
	test('value is a Raw node', () => {
		expect(first_declaration('a{color:red}').value!.type_name).toBe('Raw')
	})

	test('format_value formats a raw value', () => {
		expect(format_value(first_declaration('a{margin:0   AUTO}').value)).toBe('0 AUTO')
	})

	test('format_declaration formats a raw value', () => {
		expect(format_declaration(first_declaration('a{COLOR:RGB(0,0,0)}'))).toBe('color: rgb(0, 0, 0)')
	})

	test.each([
		'--x:',
		'--Foo:  1px  2px',
		'font: 12px / 1.5 Arial',
		'color: if(media(print): black; else: red)',
		'grid-template-areas: "a"  "b"',
		'background: URL( a.png )',
	])('formats %s the same as a parsed value', (declaration) => {
		let parsed = parse(`a{${declaration}}`).first_child!.block!.first_child as Declaration
		let raw = first_declaration(`a{${declaration}}`)
		expect(format_declaration(raw)).toBe(format_declaration(parsed))
	})

	test('minified', () => {
		expect(format_declaration(first_declaration('a{margin: 0   auto}'), { minify: true })).toBe(
			'margin:0 auto',
		)
	})

	test('!important', () => {
		expect(format_declaration(first_declaration('a{color:red   !IMPORTANT}'))).toBe(
			'color: red !important',
		)
	})
})

describe('parse_selectors: false', () => {
	function prelude(css: string) {
		let rule = parse(css, { parse_selectors: false }).first_child as Rule
		return rule.prelude!
	}

	test('prelude is a Raw node', () => {
		expect(prelude('a,b{}').type_name).toBe('Raw')
	})

	test('format_selector_list formats a raw prelude', () => {
		expect(format_selector_list(prelude('A>b,.c  d{}'))).toBe('a > b, .c d')
	})

	test('minified', () => {
		expect(format_selector_list(prelude('a > b, c{}'), { minify: true })).toBe('a>b,c')
	})
})

describe('parse_atrule_preludes: false', () => {
	test('prelude is a Raw node and its text can be formatted', () => {
		let atrule = parse('@media (min-width:1px){}', { parse_atrule_preludes: false })
			.first_child as Atrule
		expect(atrule.prelude!.type_name).toBe('Raw')
		expect(format_atrule_prelude(atrule.prelude!.text)).toBe('(min-width: 1px)')
	})
})
