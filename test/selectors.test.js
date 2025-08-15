import { suite } from 'uvu'
import * as assert from 'uvu/assert'
import { format } from '../index.js'

let test = suite('Selectors')

test('A single selector is rendered without a trailing comma', () => {
	let actual = format('a {}')
	let expected = 'a {}'
	assert.is(actual, expected)
})

test('Multiple selectors are placed on a new line, separated by commas', () => {
	let actual = format(`
		selector1,
			selector1a,
			selector1b,
				selector1aa,
		selector2,

		selector3 {
		}
	`)
	let expected = `selector1,
selector1a,
selector1b,
selector1aa,
selector2,
selector3 {}`

	assert.equal(actual, expected)
})

test('formats multiline selectors on a single line', () => {
	let actual = format(`
a.b
 .c .d
   .e .f {
color: green }
	`)
	let expected = `a.b .c .d .e .f {
	color: green;
}`
	assert.equal(actual, expected)
})

test('formats simple selector combinators', () => {
	let actual = format(`
		a>b,
		a>b~c  d,
		.article-content ol li>* {}
	`)
	let expected = `a > b,
a > b ~ c d,
.article-content ol li > * {}`
	assert.equal(actual, expected)
})

test('lowercases type selectors', () => {
	let actual = format(`
		A,
		B,
		C {}
	`)
	let expected = `a,
b,
c {}`
	assert.equal(actual, expected)
})

test('formats nested selector combinators', () => {
	let fixtures = [
		[`:where(a+b) {}`, `:where(a + b) {}`],
		[`:where(:is(ol,ul)) {}`, `:where(:is(ol, ul)) {}`],
		[`li:nth-of-type(1) {}`, `li:nth-of-type(1) {}`],
		[`li:nth-of-type(2n) {}`, `li:nth-of-type(2n) {}`],
	]

	for (let [css, expected] of fixtures) {
		let actual = format(css)
		assert.equal(actual, expected)
	}
})

test('formats pseudo selectors', () => {
	let css = `
		a::before,
		a::after,
		b:before,
		b:after,
		c::first-letter {}
		`
	let expected = `a::before,
a::after,
b::before,
b::after,
c::first-letter {}`

	let actual = format(css)
	assert.equal(actual, expected)
})

test('formats pseudo elements with odd casing', () => {
	let css = `
		a::Before,
		a::After,
		b:Before,
		b:After,
		c:After,
		d::First-letter {}
		`
	let expected = `a::before,
a::after,
b::before,
b::after,
c::after,
d::first-letter {}`

	let actual = format(css)
	assert.equal(actual, expected)
})

test('formats selectors with Nth', () => {
	let fixtures = [
		[`li:nth-child(3n-2) {}`, `li:nth-child(3n -2) {}`],
		[`li:nth-child(0n+1) {}`, `li:nth-child(0n + 1) {}`],
		[`li:nth-child(even of .noted) {}`, `li:nth-child(even of .noted) {}`],
		[`li:nth-child(2n of .noted) {}`, `li:nth-child(2n of .noted) {}`],
		[`li:nth-child(-n + 3 of .noted) {}`, `li:nth-child(-1n + 3 of .noted) {}`],
		[`li:nth-child(-n+3 of li.important) {}`, `li:nth-child(-1n + 3 of li.important) {}`],
		[`p:nth-child(n+8):nth-child(-n+15) {}`, `p:nth-child(1n + 8):nth-child(-1n + 15) {}`],
	]

	for (let [css, expected] of fixtures) {
		let actual = format(css)
		assert.equal(actual, expected)
	}
})

test('formats multiline selectors', () => {
	let actual = format(`
		a:is(
			a,
			b,
			c
		) {}
	`)
	let expected = `a:is(a, b, c) {}`
	assert.is(actual, expected)
})

test('format nesting selectors', () => {
	let actual = format(`
		& a {}
		b & c {}
	`)
	let expected = `& a {}

b & c {}`
	assert.is(actual, expected)
})

test('forces attribute selectors to have quoted values', () => {
	let actual = format(`
		[title=foo],
		[title="bar"],
		[title='baz'] {}
	`)
	let expected = `[title="foo"],
[title="bar"],
[title="baz"] {}`
	assert.is(actual, expected)
})

test('adds a space before attribute selector flags', () => {
	let actual = format(`
		[title="foo" i],
		[title="baz"i],
		[title=foo i] {}
	`)
	let expected = `[title="foo" i],
[title="baz" i],
[title="foo" i] {}`
	assert.is(actual, expected)
})

test('formats :lang correctly', () => {
	let actual = format(`:lang("nl","de"),li:nth-child() {}`)
	let expected = `:lang("nl","de"),
li:nth-child() {}`
	assert.equal(actual, expected)
})

test(`formats ::highlight and ::highlight(Name) correctly`, () => {
	let actual = format(`::highlight,::highlight(Name),::highlight(my-thing) {}`)
	let expected = `::highlight,
::highlight(Name),
::highlight(my-thing) {}`
	assert.equal(actual, expected)
})

test('formats unknown pseudos correctly', () => {
	let actual = format(`
		::foo-bar,
		:unkown-thing(),
		:unnowkn(kjsa.asddk,asd) {}
	`)
	let expected = `::foo-bar,
:unkown-thing(),
:unnowkn(kjsa.asddk,asd) {}`
	assert.equal(actual, expected)
})

test.run()
