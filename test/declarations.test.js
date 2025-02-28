import { suite } from 'uvu'
import * as assert from 'uvu/assert'
import { format } from '../index.js'

let test = suite('Declarations')

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

	assert.equal(actual, expected)
})

test('lowercases properties', () => {
	let actual = format(`a { COLOR: green }`)
	let expected = `a {
	color: green;
}`
	assert.is(actual, expected)
})

test('does not lowercase custom properties', () => {
	let actual = format(`a {
		--myVar: 1;
	}`)
	let expected = `a {
	--myVar: 1;
}`
	assert.is(actual, expected)
})

test('!important is added', () => {
	let actual = format(`a { color: green !important}`)
	let expected = `a {
	color: green !important;
}`
	assert.is(actual, expected)
})

test('!important is lowercase', () => {
	let actual = format(`a { color: green !IMPORTANT }`)
	let expected = `a {
	color: green !important;
}`
	assert.is(actual, expected)
})

test('browserhack !ie is printed', () => {
	let actual = format(`a { color: green !ie}`)
	let expected = `a {
	color: green !ie;
}`
	assert.is(actual, expected)
})

test('browserhack !IE is lowercased', () => {
	let actual = format(`a { color: green !IE}`)
	let expected = `a {
	color: green !ie;
}`
	assert.is(actual, expected)
})

test.run()
