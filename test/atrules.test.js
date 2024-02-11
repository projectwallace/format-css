import { suite } from 'uvu'
import * as assert from 'uvu/assert'
import { format } from '../index.js'

let Atrules = suite('Atrules')

Atrules('AtRules start on a new line', () => {
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

Atrules('Atrule blocks are surrounded by {} with correct spacing and indentation', () => {
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

Atrules('AtRule prelude formatting', () => {
	let fixtures = [
		[`@media all{}`, `@media all {}`],
		[`@media all   and print{}`, `@media all and print {}`],
		[`@media (min-width:1000px){}`, `@media (min-width: 1000px) {}`],
		[`@media (min-width : 1000px) {}`, `@media (min-width: 1000px) {}`],
		[`@media all and (transform-3d) {}`, `@media all and (transform-3d) {}`],
		[`@media all and (transform-3d), (-webkit-transform-3d) {}`, `@media all and (transform-3d), (-webkit-transform-3d) {}`],
		[`@media screen or print {}`, `@media screen or print {}`],
		[`@layer    test;`, `@layer test;`],
		[`@layer tbody,thead;`, `@layer tbody, thead;`],
		[`@supports (display:grid){}`, `@supports (display: grid) {}`],
		[`@supports (-webkit-appearance: none) {}`, `@supports (-webkit-appearance: none) {}`],
		[`@media all and (-moz-images-in-menus:0) and (min-resolution:.001dpcm) {}`, `@media all and (-moz-images-in-menus: 0) and (min-resolution: .001dpcm) {}`],
		[`@media all and (-webkit-min-device-pixel-ratio: 10000),not all and (-webkit-min-device-pixel-ratio: 0) {}`, `@media all and (-webkit-min-device-pixel-ratio: 10000), not all and (-webkit-min-device-pixel-ratio: 0) {}`]
	]

	for (let [css, expected] of fixtures) {
		let actual = format(css)
		assert.equal(actual, expected)
	}
})

Atrules('single empty line after a rule, before atrule', () => {
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

Atrules('single empty line in between atrules', () => {
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

Atrules('newline between last declaration and nested atrule', () => {
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

Atrules('lowercases the atrule name', () => {
	let actual = format(`@LAYER test {}`)
	let expected = `@layer test {}`
	assert.is(actual, expected)
})

Atrules('does not lowercase the atrule value', () => {
	let actual = format('@keyframes TEST {}')
	let expected = '@keyframes TEST {}'
	assert.is(actual, expected)
})

Atrules('Atrules w/o Block are terminated with a semicolon', () => {
	let actual = format(`
		@layer test;
		@import url('test');
	`)
	let expected = `@layer test;

@import url('test');`
	assert.is(actual, expected)
})

Atrules('Empty atrule braces are placed on the same line', () => {
	let actual = format(`@media all {

	}

	@supports (display: grid) {}`)
	let expected = `@media all {}

@supports (display: grid) {}`
	assert.is(actual, expected)
})

Atrules('new-fangled comparators (width > 1000px)', () => {
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

Atrules.skip('preserves comments', () => {
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

Atrules.run();