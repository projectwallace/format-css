import { test, expect } from 'vitest'
import { format } from '../index.js'

test('Declarations end with a semicolon (;)', () => {
	let actual = format(`
		@font-face {
			src: url('test');
			font-family: Test
		}

		css {
			property1: value1;
			property2: value2;

			& .nested {
				property1: value3;
				property2: value4
			}
		}

		@media (min-width: 1000px) {
			@layer test {
				css {
					property1: value5
				}
			}
		}
	`)
	let expected = `@font-face {
	src: url("test");
	font-family: Test;
}

css {
	property1: value1;
	property2: value2;

	& .nested {
		property1: value3;
		property2: value4;
	}
}

@media (min-width: 1000px) {
	@layer test {
		css {
			property1: value5;
		}
	}
}`

	expect(actual).toEqual(expected)
})

test('lowercases properties', () => {
	let actual = format(`a { COLOR: green }`)
	let expected = `a {
	color: green;
}`
	expect(actual).toEqual(expected)
})

test('does not lowercase custom properties', () => {
	let actual = format(`a {
		--myVar: 1;
	}`)
	let expected = `a {
	--myVar: 1;
}`
	expect(actual).toEqual(expected)
})

test('!important is added', () => {
	let actual = format(`a { color: green !important}`)
	let expected = `a {
	color: green !important;
}`
	expect(actual).toEqual(expected)
})

test('!important is lowercase', () => {
	let actual = format(`a { color: green !IMPORTANT }`)
	let expected = `a {
	color: green !important;
}`
	expect(actual).toEqual(expected)
})

test('browserhack !ie is printed', () => {
	let actual = format(`a { color: green !ie}`)
	let expected = `a {
	color: green !ie;
}`
	expect(actual).toEqual(expected)
})

test('browserhack !IE is lowercased', () => {
	let actual = format(`a { color: green !IE}`)
	let expected = `a {
	color: green !ie;
}`
	expect(actual).toEqual(expected)
})
