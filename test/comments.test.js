import { suite } from "uvu"
import * as assert from "uvu/assert"
import { format } from "../index.js"

let test = suite("Comments")

test.skip('regular comment before rule', () => {
	let actual = format(`
	/* comment */
	selector {}
	`)
	let expected = `/* comment */

selector {}`
	assert.is(actual, expected)
})

test('bang comment before rule', () => {
	let actual = format(`
	/*! comment */
	selector {}
	`)
	let expected = `/*! comment */

selector {}`
	assert.is(actual, expected)
})

test('in @media prelude', () => {
	// from CSSTree https://github.com/csstree/csstree/blob/ba6dfd8bb0e33055c05f13803d04825d98dd2d8d/fixtures/ast/mediaQuery/MediaQuery.json#L147
	let actual = format('@media all /*0*/ (/*1*/foo/*2*/:/*3*/1/*4*/) {}')
	let expected = '@media all /*0*/ (/*1*/foo/*2*/: /*3*/1/*4*/) {}'
	assert.is(actual, expected)
})

test('in @supports prelude', () => {
	// from CSSTree https://github.com/csstree/csstree/blob/ba6dfd8bb0e33055c05f13803d04825d98dd2d8d/fixtures/ast/atrule/atrule/supports.json#L119
	let actual = format('@supports not /*0*/(/*1*/flex :/*3*/1/*4*/)/*5*/{}')
	let expected = '@supports not /*0*/(/*1*/flex: /*3*/1/*4*/)/*5*/ {}'
	assert.is(actual, expected)
})

test.skip('in @import prelude before specifier', () => {
	let actual = format('@import /*test*/"foo"/*test*/;')
	let expected = '@import /*test*/"foo"/*test*/;'
	assert.is(actual, expected)
})

test('in @import prelude after specifier', () => {
	let actual = format('@import "foo"/*test*/;')
	let expected = '@import "foo"/*test*/;'
	assert.is(actual, expected)
})

test.skip('in selector combinator', () => {
	let actual = format(`
		a/*test*/ /*test*/b,
		a/*test*/+/*test*/b {}
	`)
	let expected = `a/*test*/ /*test*/b,
a /*test*/ + /*test*/ b {}`
	assert.is(actual, expected)
})

test('in attribute selector', () => {
	let actual = format(`[/*test*/a/*test*/=/*test*/'b'/*test*/i/*test*/]`)
	let expected = `[/*test*/a/*test*/=/*test*/'b'/*test*/i/*test*/]`
	assert.is(actual, expected)
})

test.skip('in var() with fallback', () => {
	let actual = format(`a { prop: var( /* 1 */ --name /* 2 */ , /* 3 */ 1 /* 4 */ ) }`)
	let expected = `a {
	prop: var(/* 1 */ --name /* 2 */, /* 3 */ 1 /* 4 */);
}`
	assert.is(actual, expected)
})

test.skip('in custom property declaration', () => {
	let actual = format(`a { --test: /*test*/; }`)
	let expected = `a {
	--test: /*test*/;
}`
	assert.is(actual, expected)
})

test.skip('before value', () => {
	let actual = format(`a { prop: /*test*/value; }`)
	let expected = `a {
	prop: /*test*/value;
}`
	assert.is(actual, expected)
})

test.skip('after value', () => {
	let actual = format(`a {
		prop: value/*test*/;
	}`)
	let expected = `a {
	prop: value/*test*/;
}`
	assert.is(actual, expected)
})

test.skip('in value functions', () => {
	let actual = format(`
		a {
			background-image: linear-gradient(/* comment */red, green);
			background-image: linear-gradient(red/* comment */, green);
			background-image: linear-gradient(red, green/* comment */);
			background-image: linear-gradient(red, green)/* comment */
		}
	`)
	let expected = `a {
	background-image: linear-gradient(/* comment */red, green);
	background-image: linear-gradient(red/* comment */, green);
	background-image: linear-gradient(red, green/* comment */);
	background-image: linear-gradient(red, green)/* comment */
}`
	assert.is(actual, expected)
})

test.run()
