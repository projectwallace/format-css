import { suite } from 'uvu'
import * as assert from 'uvu/assert'
import { format } from '../index.js'

let test = suite('Comments')

test('only comment', () => {
	let actual = format(`/* comment */`)
	let expected = `/* comment */`
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

test('before selectors', () => {
	let actual = format(`
		/* comment */
	selector1,
	selector2 {
		property: value;
	}
	`)
	let expected = `/* comment */
selector1,
selector2 {
	property: value;
}`
	assert.is(actual, expected)
})

test('before nested selectors', () => {
	let actual = format(`
		a {
			/* comment */
			& nested1,
			& nested2 {
				property: value;
			}
		}
	`)
	let expected = `a {
	/* comment */
	& nested1,
	& nested2 {
		property: value;
	}
}`
	assert.is(actual, expected)
})

test('after selectors', () => {
	let actual = format(`
	selector1,
	selector2
	/* comment */ {
		property: value;
	}
	`)
	let expected = `selector1,
selector2
/* comment */ {
	property: value;
}`
	assert.is(actual, expected)
})

test('in between selectors', () => {
	let actual = format(`
	selector1,
	/* comment */
	selector2 {
		property: value;
	}
	`)
	let expected = `selector1,
/* comment */
selector2 {
	property: value;
}`
	assert.is(actual, expected)
})

test('in between nested selectors', () => {
	let actual = format(`
		a {
			& nested1,
			/* comment */
			& nested2 {
				property: value;
			}
		}
	`)
	let expected = `a {
	& nested1,
	/* comment */
	& nested2 {
		property: value;
	}
}`
	assert.is(actual, expected)
})

test('as first child in rule', () => {
	let actual = format(`
	selector {
		/* comment */
		property: value;
	}
	`)
	let expected = `selector {
	/* comment */
	property: value;
}`
	assert.is(actual, expected)
})

test('as last child in rule', () => {
	let actual = format(`
	selector {
		property: value;
		/* comment */
	}
	`)
	let expected = `selector {
	property: value;
	/* comment */
}`
	assert.is(actual, expected)
})

test('as last child in nested rule', () => {
	let actual = format(`
	a {
		& selector {
			property: value;
			/* comment */
		}
	}
	`)
	let expected = `a {
	& selector {
		property: value;
		/* comment */
	}
}`
	assert.is(actual, expected)
})

test('as only child in rule', () => {
	let actual = format(`
	selector {
		/* comment */
	}
	`)
	let expected = `selector {
	/* comment */
}`
	assert.is(actual, expected)
})

test('as only child in nested rule', () => {
	let actual = format(`a {
	& selector {
		/* comment */
	}
}`)
	let expected = `a {
	& selector {
		/* comment */
	}
}`
	assert.is(actual, expected)
})

test('in between declarations', () => {
	let actual = format(`
	selector {
		property: value;
		/* comment */
		property: value;
	}
	`)
	let expected = `selector {
	property: value;
	/* comment */
	property: value;
}`
	assert.is(actual, expected)
})

test('in between nested declarations', () => {
	let actual = format(`
	a {
		& selector {
			property: value;
			/* comment */
			property: value;
		}
	}
	`)
	let expected = `a {
	& selector {
		property: value;
		/* comment */
		property: value;
	}
}`
	assert.is(actual, expected)
})

test('as first child in atrule', () => {
	let actual = format(`
	@media (min-width: 1000px) {
		/* comment */
		selector {
			property: value;
		}
	}
	`)
	let expected = `@media (min-width: 1000px) {
	/* comment */
	selector {
		property: value;
	}
}`
	assert.is(actual, expected)
})

test('as first child in nested atrule', () => {
	let actual = format(`
	@media all {
		@media (min-width: 1000px) {
			/* comment */
			selector {
				property: value;
			}
		}
	}
	`)
	let expected = `@media all {
	@media (min-width: 1000px) {
		/* comment */
		selector {
			property: value;
		}
	}
}`
	assert.is(actual, expected)
})

test('as last child in atrule', () => {
	let actual = format(`
	@media (min-width: 1000px) {
		selector {
			property: value;
		}
		/* comment */
	}
	`)
	let expected = `@media (min-width: 1000px) {
	selector {
		property: value;
	}
	/* comment */
}`
	assert.is(actual, expected)
})

test('as last child in nested atrule', () => {
	let actual = format(`
	@media all {
		@media (min-width: 1000px) {
			selector {
				property: value;
			}
			/* comment */
		}
	}
	`)
	let expected = `@media all {
	@media (min-width: 1000px) {
		selector {
			property: value;
		}
		/* comment */
	}
}`
	assert.is(actual, expected)
})

test('as only child in atrule', () => {
	let actual = format(`
	@media (min-width: 1000px) {
		/* comment */
	}
	`)
	let expected = `@media (min-width: 1000px) {
	/* comment */
}`
	assert.is(actual, expected)
})

test('as only child in nested atrule', () => {
	let actual = format(`
	@media all {
		@media (min-width: 1000px) {
			/* comment */
		}
	}
	`)
	let expected = `@media all {
	@media (min-width: 1000px) {
		/* comment */
	}
}`
	assert.is(actual, expected)
})

test('in between rules and atrules', () => {
	let actual = format(`
	/* comment 1 */
	selector {}
	/* comment 2 */
	@media (min-width: 1000px) {
		/* comment 3 */
		selector {}
		/* comment 4 */
	}
	/* comment 5 */
	`)
	let expected = `/* comment 1 */
selector {}
/* comment 2 */
@media (min-width: 1000px) {
	/* comment 3 */
	selector {}
	/* comment 4 */
}
/* comment 5 */`
	assert.is(actual, expected)
})

test('comment before rule and atrule should not be separated by newline', () => {
	let actual = format(`
	/* comment 1 */
	selector {}

	/* comment 2 */
	@media (min-width: 1000px) {
		/* comment 3 */

		selector {}
		/* comment 4 */
	}
	`)
	let expected = `/* comment 1 */
selector {}
/* comment 2 */
@media (min-width: 1000px) {
	/* comment 3 */
	selector {}
	/* comment 4 */
}`
	assert.is(actual, expected)
})

test('a declaration after multiple comments starts on a new line', () => {
	let actual = format(`
	selector {
		/* comment 1 */
		/* comment 2 */
		--custom-property: value;

		/* comment 3 */
		/* comment 4 */
		--custom-property: value;

		/* comment 5 */
		/* comment 6 */
		--custom-property: value;
	}
	`)
	let expected = `selector {
	/* comment 1 */
	/* comment 2 */
	--custom-property: value;
	/* comment 3 */
	/* comment 4 */
	--custom-property: value;
	/* comment 5 */
	/* comment 6 */
	--custom-property: value;
}`
	assert.is(actual, expected)
})

test('multiple comments in between rules and atrules', () => {
	let actual = format(`
	/* comment 1 */
	/* comment 1.1 */
	selector {}
	/* comment 2 */
	/* comment 2.1 */
	@media (min-width: 1000px) {
		/* comment 3 */
		/* comment 3.1 */
		selector {}
		/* comment 4 */
		/* comment 4.1 */
	}
	/* comment 5 */
	/* comment 5.1 */
	`)
	let expected = `/* comment 1 */
/* comment 1.1 */
selector {}
/* comment 2 */
/* comment 2.1 */
@media (min-width: 1000px) {
	/* comment 3 */
	/* comment 3.1 */
	selector {}
	/* comment 4 */
	/* comment 4.1 */
}
/* comment 5 */
/* comment 5.1 */`
	assert.is(actual, expected)
})

test('puts every comment on a new line', () => {
	let actual = format(`
		x {
			/*--font-family: inherit;*/ /*--font-style: normal;*/
		--border-top-color: var(--root-color--support);
	}
`)
	let expected = `x {
	/*--font-family: inherit;*/
	/*--font-style: normal;*/
	--border-top-color: var(--root-color--support);
}`
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

test('skip in @import prelude before specifier', () => {
	let actual = format('@import /*test*/"foo";')
	let expected = '@import "foo";'
	assert.is(actual, expected)
})

test('in @import prelude after specifier', () => {
	let actual = format('@import "foo"/*test*/;')
	let expected = '@import "foo"/*test*/;'
	assert.is(actual, expected)
})

test('skip in selector combinator', () => {
	let actual = format(`
		a/*test*/ /*test*/b,
		a/*test*/+/*test*/b {}
	`)
	let expected = `a b,
a + b {}`
	assert.is(actual, expected)
})

test('in attribute selector', () => {
	let actual = format(`[/*test*/a/*test*/=/*test*/'b'/*test*/i/*test*/]`)
	let expected = `[/*test*/a/*test*/=/*test*/'b'/*test*/i/*test*/]`
	assert.is(actual, expected)
})

test('skip in var() with fallback', () => {
	let actual = format(`a { prop: var( /* 1 */ --name /* 2 */ , /* 3 */ 1 /* 4 */ ) }`)
	let expected = `a {
	prop: var(--name, 1);
}`
	assert.is(actual, expected)
})

test('skip in custom property declaration (space toggle)', () => {
	let actual = format(`a { --test: /*test*/; }`)
	let expected = `a {
	--test: ;
}`
	assert.is(actual, expected)
})

test('before value', () => {
	let actual = format(`a { prop: /*test*/value; }`)
	let expected = `a {
	prop: value;
}`
	assert.is(actual, expected)
})

test('after value', () => {
	let actual = format(`a {
		prop: value/*test*/;
	}`)
	let expected = `a {
	prop: value;
}`
	assert.is(actual, expected)
})

test('skip in value functions', () => {
	let actual = format(`
		a {
			background-image: linear-gradient(/* comment */red, green);
			background-image: linear-gradient(red/* comment */, green);
			background-image: linear-gradient(red, green/* comment */);
			background-image: linear-gradient(red, green)/* comment */
		}
	`)
	let expected = `a {
	background-image: linear-gradient(red, green);
	background-image: linear-gradient(red, green);
	background-image: linear-gradient(red, green);
	background-image: linear-gradient(red, green);
}`
	assert.is(actual, expected)
})

test('strips comments in minification mode', () => {
	let actual = format(`
	/* comment 1 */
	selector {}
	/* comment 2 */
	@media (min-width: 1000px) {
		/* comment 3 */
		selector {}
		/* comment 4 */
	}
	/* comment 5 */
	`, { minify: true })
	let expected = `selector{}@media (min-width:1000px){selector{}}`
	assert.is(actual, expected)
})

test.run()
