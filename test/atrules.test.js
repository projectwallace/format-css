import { suite } from 'uvu'
import * as assert from 'uvu/assert'
import { format, minify } from '../index.js'

let test = suite('Atrules')

test('AtRules start on a new line', () => {
	let actual = format(`
		@media (min-width: 1000px) {
			selector { property: value; }
		}
		@layer test {
			selector { property: value; }
		}
	`)
	let expected = `@media (min-width: 1000px) {
	selector {
		property: value;
	}
}

@layer test {
	selector {
		property: value;
	}
}`

	assert.equal(actual, expected)
})

test('Atrule blocks are surrounded by {} with correct spacing and indentation', () => {
	let actual = format(`
		@media (min-width:1000px){selector{property:value1}}

		@media (min-width:1000px)
		{
			selector
			{
				property:value2
			}
}`)
	let expected = `@media (min-width: 1000px) {
	selector {
		property: value1;
	}
}

@media (min-width: 1000px) {
	selector {
		property: value2;
	}
}`

	assert.equal(actual, expected)
})

test('adds whitespace between prelude and {', () => {
	let actual = format(`@media all{}`)
	let expected = `@media all {}`
	assert.equal(actual, expected)
})

test('collapses whitespaces in prelude', () => {
	let actual = format(`@media all   and   (min-width: 1000px) {}`)
	let expected = `@media all and (min-width: 1000px) {}`
	assert.equal(actual, expected)
})

test('adds whitespace to @media (min-width:1000px)', () => {
	let actual = format(`@media (min-width:1000px) {}`)
	let expected = `@media (min-width: 1000px) {}`
	assert.equal(actual, expected)
})

test('removes excess whitespace around min-width : 1000px', () => {
	let actual = format(`@media (min-width : 1000px) {}`)
	let expected = `@media (min-width: 1000px) {}`
	assert.equal(actual, expected)
})

test('formats @layer with excess whitespace', () => {
	let actual = format(`@layer    test;`)
	let expected = `@layer test;`
	assert.equal(actual, expected)
})

test('adds whitespace to @layer tbody,thead', () => {
	let actual = format(`@layer tbody,thead;`)
	let expected = `@layer tbody, thead;`
	assert.equal(actual, expected)
})

test('adds whitespace to @supports (display:grid)', () => {
	let actual = format(`@supports (display:grid){}`)
	let expected = `@supports (display: grid) {}`
	assert.equal(actual, expected)
})

test('@media prelude formatting', () => {
	let fixtures = [
		[`@media all and (transform-3d) {}`, `@media all and (transform-3d) {}`],
		[
			`@media only screen and (min-width: 1024px)and (max-width: 1439px), only screen and (min-width: 768px)and (max-width: 1023px) {}`,
			`@media only screen and (min-width: 1024px) and (max-width: 1439px), only screen and (min-width: 768px) and (max-width: 1023px) {}`,
		],
		[`@media (min-width: 1024px)or (max-width: 1439px) {}`, `@media (min-width: 1024px) or (max-width: 1439px) {}`],
		[`@media all and (transform-3d), (-webkit-transform-3d) {}`, `@media all and (transform-3d), (-webkit-transform-3d) {}`],
		[`@media screen or print {}`, `@media screen or print {}`],
		[`@media (update: slow) or (hover: none) {}`, `@media (update: slow) or (hover: none) {}`],
		[`@media (update: slow)or (hover: none) {}`, `@media (update: slow) or (hover: none) {}`],
		[
			`@media all and (-moz-images-in-menus:0) and (min-resolution:.001dpcm) {}`,
			`@media all and (-moz-images-in-menus: 0) and (min-resolution: .001dpcm) {}`,
		],
		[
			`@media all and (-webkit-min-device-pixel-ratio: 10000),not all and (-webkit-min-device-pixel-ratio: 0) {}`,
			`@media all and (-webkit-min-device-pixel-ratio: 10000), not all and (-webkit-min-device-pixel-ratio: 0) {}`,
		],
	]

	for (let [css, expected] of fixtures) {
		let actual = format(css)
		assert.equal(actual, expected)
	}
})

test('lowercases functions inside atrule preludes', () => {
	let actual = format(`
@import URL("style.css") LAYER(test) SUPPORTS(display:grid);
@supports SELECTOR([popover]:open) {}
`)
	let expected = `@import url("style.css") layer(test) supports(display: grid);

@supports selector([popover]:open) {}`
	assert.equal(actual, expected)
})

test('formats @scope', () => {
	let actual = format(`
		@scope (.light-scheme) {}
		@scope (.media-object) to (.content > *) {}
`)
	let expected = `@scope (.light-scheme) {}

@scope (.media-object) to (.content > *) {}`
	assert.equal(actual, expected)
})

test('calc() inside @media', () => {
	let actual = format(`
		@media (min-width: calc(1px*1)) {}
		@media (min-width: calc(2px* 2)) {}
		@media (min-width: calc(3px *3)) {}
		@media (min-width: calc(4px * 4)) {}
		@media (min-width: calc(5px  *  5)) {}
	`)
	let expected = `@media (min-width: calc(1px * 1)) {}

@media (min-width: calc(2px * 2)) {}

@media (min-width: calc(3px * 3)) {}

@media (min-width: calc(4px * 4)) {}

@media (min-width: calc(5px * 5)) {}`
	assert.equal(actual, expected)
})

test('minify: calc(*) inside @media', () => {
	let actual = minify(`@media (min-width: calc(1px*1)) {}`)
	let expected = `@media (min-width:calc(1px*1)){}`
	assert.equal(actual, expected)
})

test('minify: calc(+) inside @media', () => {
	let actual = minify(`@media (min-width: calc(1px + 1em)) {}`)
	let expected = `@media (min-width:calc(1px + 1em)){}`
	assert.equal(actual, expected)
})

test('minify: calc(-) inside @media', () => {
	let actual = minify(`@media (min-width: calc(1em - 1px)) {}`)
	let expected = `@media (min-width:calc(1em - 1px)){}`
	assert.equal(actual, expected)
})

test('@import prelude formatting', () => {
	let fixtures = [
		['@import url("fineprint.css") print;', '@import url("fineprint.css") print;'],
		['@import url("style.css") layer;', '@import url("style.css") layer;'],
		['@import url("style.css") layer(test.first) supports(display:grid);', '@import url("style.css") layer(test.first) supports(display: grid);'],
	]

	for (let [css, expected] of fixtures) {
		let actual = format(css)
		assert.equal(actual, expected)
	}
})

test('@supports prelude formatting', () => {
	let fixtures = [
		[`@supports (display:grid){}`, `@supports (display: grid) {}`],
		[`@supports (-webkit-appearance: none) {}`, `@supports (-webkit-appearance: none) {}`],
		['@supports selector([popover]:open) {}', '@supports selector([popover]:open) {}'],
	]

	for (let [css, expected] of fixtures) {
		let actual = format(css)
		assert.equal(actual, expected)
	}
})

test('@layer prelude formatting', () => {
	let fixtures = [
		[`@layer    test;`, `@layer test;`],
		[`@layer tbody,thead;`, `@layer tbody, thead;`],
	]

	for (let [css, expected] of fixtures) {
		let actual = format(css)
		assert.equal(actual, expected)
	}
})

test('minify: @layer prelude formatting', () => {
	let fixtures = [
		[`@layer    test;`, `@layer test;`],
		[`@layer tbody,thead;`, `@layer tbody,thead;`],
	]

	for (let [css, expected] of fixtures) {
		let actual = minify(css)
		assert.equal(actual, expected)
	}
})

test('single empty line after a rule, before atrule', () => {
	let actual = format(`
		rule1 { property: value }
		@media (min-width: 1000px) {
			rule2 { property: value }
		}
	`)
	let expected = `rule1 {
	property: value;
}

@media (min-width: 1000px) {
	rule2 {
		property: value;
	}
}`
	assert.equal(actual, expected)
})

test('single empty line in between atrules', () => {
	let actual = format(`
		@layer test1;
		@media (min-width: 1000px) {
			rule2 { property: value }
		}
	`)
	let expected = `@layer test1;

@media (min-width: 1000px) {
	rule2 {
		property: value;
	}
}`
	assert.equal(actual, expected)
})

test('newline between last declaration and nested atrule', () => {
	let actual = format(`
		test {
			property1: value1;
			@media all {
				property2: value2;
			}
		}
	`)
	let expected = `test {
	property1: value1;

	@media all {
		property2: value2;
	}
}`
	assert.equal(actual, expected)
})

test('lowercases the atrule name', () => {
	let actual = format(`@LAYER test {}`)
	let expected = `@layer test {}`
	assert.is(actual, expected)
})

test('does not lowercase the atrule value', () => {
	let actual = format('@keyframes TEST {}')
	let expected = '@keyframes TEST {}'
	assert.is(actual, expected)
})

test('Atrules w/o Block are terminated with a semicolon', () => {
	let actual = format(`
		@layer test;
		@import url('test');
	`)
	let expected = `@layer test;

@import url('test');`
	assert.is(actual, expected)
})

test('Empty atrule braces are placed on the same line', () => {
	let actual = format(`@media all {

	}

	@supports (display: grid) {}`)
	let expected = `@media all {}

@supports (display: grid) {}`
	assert.is(actual, expected)
})

test('new-fangled comparators (width > 1000px)', () => {
	let actual = format(`
		@container (width>1000px) {}
		@media (width>1000px) {}
		@media (width=>1000px) {}
		@media (width<=1000px) {}
		@media (200px<width<1000px) {}
	`)
	let expected = `@container (width > 1000px) {}

@media (width > 1000px) {}

@media (width => 1000px) {}

@media (width <= 1000px) {}

@media (200px < width < 1000px) {}`
	assert.is(actual, expected)
})

test('minify: new-fangled comparators (width > 1000px)', () => {
	let actual = minify(`@container (width>1000px) {}`)
	let expected = `@container (width>1000px){}`
	assert.is(actual, expected)
})

test.skip('preserves comments', () => {
	let actual = format(`
		@media /* comment */ all {}
		@media all /* comment */ {}
		@media (min-width: 1000px /* comment */) {}
		@media (/* comment */ min-width: 1000px) {}
		@layer /* comment */ {}
	`)
	let expected = `@media /* comment */ all {}

@media all /* comment */ {}

@media (min-width: 1000px /* comment */) {}

@media (/* comment */ min-width: 1000px) {}

@layer /* comment */ {}
`
	assert.is(actual, expected)
})

test.run()
