import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { format } from './index.js'

test('AtRules and Rules start on a new line', () => {
	let actual = format(`
		selector { property: value; }
		@media (min-width: 1000px) {
			selector { property: value; }
		}
		selector { property: value; }
		@layer test {
			selector { property: value; }
		}
	`)
	let expected = `selector {
	property: value;
}

@media (min-width: 1000px) {
	selector {
		property: value;
	}
}

selector {
	property: value;
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
	let expected = `@media (min-width:1000px) {
	selector {
		property: value1;
	}
}

@media (min-width:1000px) {
	selector {
		property: value2;
	}
}`

	assert.equal(actual, expected)
})

test('Does not do AtRule prelude formatting', () => {
	let actual = format(`@media (min-width:1000px){}`)
	let expected = `@media (min-width:1000px) {}`

	assert.equal(actual, expected)
})

test('Selectors are placed on a new line, separated by commas', () => {
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

test('Declarations end with a semicolon (;)', () => {
	let actual = format(`
		@font-face {
			src: url('test');
			font-family: Test;
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
	src: url('test');
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

test('An empty line is rendered in between Rules', () => {
	let actual = format(`
		rule1 { property: value }
		rule2 { property: value }
	`)
	let expected = `rule1 {
	property: value;
}

rule2 {
	property: value;
}`
	assert.equal(actual, expected)
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

test('handles comments', () => {
	let actual = format(`
.async-hide {
	opacity: 0;
}

/*!
 * Library vx.x.x (http://css-lib.com)
 * Copyright 1970-1800 CSS Inc.
 * Licensed under MIT (https://example.com)
 */

/*! normalize.css v3.0.3 | MIT License | github.com/necolas/normalize.css */

html /* comment */ {
	font-family /* comment */ : /* comment */ sans-serif;
	-webkit-text-size-adjust: 100%;
	-ms-text-size-adjust: 100%;
}
	`)
	let expected = `.async-hide {
	opacity: 0;
}

/*!
 * Library vx.x.x (http://css-lib.com)
 * Copyright 1970-1800 CSS Inc.
 * Licensed under MIT (https://example.com)
 */

/*! normalize.css v3.0.3 | MIT License | github.com/necolas/normalize.css */

html {
	font-family: sans-serif;
	-webkit-text-size-adjust: 100%;
	-ms-text-size-adjust: 100%;
}`

	assert.equal(actual, expected)
})

test('css nesting chaos', () => {
	let actual = format(`
/**
 * Comment!
 */
no-layer-1, no-layer-2 { color: red; font-size: 1rem; COLOR: green; }
@layer components, deep;
@layer base { layer-base { color: green; } }
@layer { @layer named { anon-named { test: 1 } }}
@media (min-width: 1000px) {
  @layer desktop { layer-desktop { color: blue; } }
  @layer { layer-anon, no-2 { anonymous: 1; } }
  @layer test {}
  @supports (min-width: 1px) {
    @layer deep { layer-deep {} }
  }
}
test { a: 1}
@layer components {
  @layer alert {}
  @layer table {
    @layer tbody, thead;
    layer-components-table { color: yellow; }
    @layer tbody { tbody { border: 1px solid; background: red; } }
    @media (min-width: 30em) {
      @supports (display: grid) {
        @layer thead { thead { border: 1px solid; } }
      }
    }
  }
}
@layer components.breadcrumb { layer-components-breadcrumb { } }

@font-face {
  font-family: "Test";
  src: url(some-url.woff2);
}

;;;;;;;;;;;;;;;;;;;
`)
	let expected = `no-layer-1,
no-layer-2 {
	color: red;
	font-size: 1rem;
	COLOR: green;
}

@layer components, deep;

@layer base {
	layer-base {
		color: green;
	}
}

@layer {
	@layer named {
		anon-named {
			test: 1;
		}
	}
}

@media (min-width: 1000px) {
	@layer desktop {
		layer-desktop {
			color: blue;
		}
	}

	@layer {
		layer-anon,
		no-2 {
			anonymous: 1;
		}
	}

	@layer test {}

	@supports (min-width: 1px) {
		@layer deep {
			layer-deep {}
		}
	}
}

test {
	a: 1;
}

@layer components {
	@layer alert {}

	@layer table {
		@layer tbody, thead;

		layer-components-table {
			color: yellow;
		}

		@layer tbody {
			tbody {
				border: 1px solid;
				background: red;
			}
		}

		@media (min-width: 30em) {
			@supports (display: grid) {
				@layer thead {
					thead {
						border: 1px solid;
					}
				}
			}
		}
	}
}

@layer components.breadcrumb {
	layer-components-breadcrumb {}
}

@font-face {
	font-family: "Test";
	src: url(some-url.woff2);
}

;;;;;;;;;;;;;;;;;;;`
	assert.equal(actual, expected);
});

test('newline between last declaration and nested ruleset', () => {
	let actual = format(`
		test {
			property1: value1;
			& > item {
				property2: value2;
				& + another {
					property3: value3;
				}
			}
		}
	`)
	let expected = `test {
	property1: value1;

	& > item {
		property2: value2;

		& + another {
			property3: value3;
		}
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

test('no trailing newline on empty nested rule', () => {
	let actual = format(`
		@layer test {
			empty {}
		}
	`)
	let expected = `@layer test {
	empty {}
}`
	assert.equal(actual, expected)
})

test('empty input', () => {
	let actual = format(` `)
	let expected = ``
	assert.equal(actual, expected)
})

test('formats multiline tokens on a single line', () => {
	let actual = format(`
a {
  background: linear-gradient(
    red,
  10% blue,
20% green,100% yellow);
}

a.b
 .c .d
   .e .f {
color: green }
	`)
	let expected = `a {
	background: linear-gradient( red, 10% blue, 20% green,100% yellow);
}

a.b .c .d .e .f {
	color: green;
}`
	assert.equal(actual, expected)
})

test('formats Raw rule prelude', () => {
	let actual = format(`:lang("nl","de"),li:nth-child() {}`)
	let expected = `:lang("nl","de"),li:nth-child() {}` // no formatting applied
	assert.equal(actual, expected)
})

test('formats simple selector combinators', () => {
	let actual = format(`
		a>b,
		a>b~c  d {}
	`)
	let expected = `a > b,
a > b ~ c d {}`
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

test.skip('formats simple value lists', () => {
	let actual = format(`
		a {
			transition-property: all,opacity;
			transition: all 100ms ease,opacity 10ms 20ms linear;
			color: rgb(0,0,0);
		}
	`)
	let expected = `a {
	transition-property: all, opacity;
	transition: all 100ms ease, opacity 10ms 20ms linear;
	color: rgb(0, 0, 0);
}`
	assert.equal(actual, expected)
})

test.skip('formats nested value lists', () => {
	let actual = format(`
		a {
			background: red,linear-gradient(to bottom,red 10%,green 50%,blue 100%);
			color: var(--test1,var(--test2,green));
		}
	`)
	let expected = `a {
	background: red, linear-gradient(to bottom, red 10%, green 50%, blue 100%);
	color: var(--test1, var(--test2, green));
}`
	assert.equal(actual, expected)
})

test.run();