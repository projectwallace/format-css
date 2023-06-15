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
		@media (min-width:1000px){selector{property:value}}

		@media (min-width:1000px)
		{
			selector
			{
				property:value
			}
}`)
	let expected = `@media (min-width:1000px) {
	selector {
		property: value;
	}
}

@media (min-width:1000px) {
	selector {
		property: value;
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
			property1: value2;
			property2: value2;

			& .nested {
				property1: value2;
				property2: value2
			}
		}

		@media (min-width: 1000px) {
			@layer test {
				css {
					property1: value1
				}
			}
		}
	`)
	let expected = `@font-face {
	src: url('test');
	font-family: Test;
}

css {
	property1: value2;
	property2: value2;

	& .nested {
		property1: value2;
		property2: value2;
	}
}

@media (min-width: 1000px) {
	@layer test {
		css {
			property1: value1;
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

test.run();