import { test, expect, describe } from 'vitest'
import { format, minify } from '../src/lib/index.js'

describe('@charset', () => {
	test('format', () => {
		expect(format(`@charset "utf-8";`)).toEqual(`@charset "utf-8";`)
	})
	test('minify', () => {
		expect(minify(`@charset "utf-8";`)).toEqual(`@charset "utf-8";`)
	})
})

describe('@import', () => {
	let css = `@import url("a.css") layer(base) supports(display:grid) screen;`
	test('format', () => {
		expect(format(css)).toEqual(`@import url("a.css") layer(base) supports(display: grid) screen;`)
	})
	test('minify', () => {
		expect(minify(css)).toEqual(`@import url("a.css") layer(base) supports(display:grid) screen;`)
	})
})

describe('@namespace', () => {
	test('default namespace', () => {
		expect(format(`@namespace url(x);`)).toEqual(`@namespace url(x);`)
	})
	// oxlint-disable-next-line vitest/no-disabled-tests
	test.skip('format with quoted string keeps the // intact', () => {
		expect(format(`@namespace svg "http://www.w3.org/2000/svg";`)).toEqual(
			`@namespace svg "http://www.w3.org/2000/svg";`,
		)
	})
	test('minify with url()', () => {
		expect(minify(`@namespace svg url(http://www.w3.org/2000/svg);`)).toEqual(
			`@namespace svg url(http://www.w3.org/2000/svg);`,
		)
	})
	// oxlint-disable-next-line vitest/no-disabled-tests
	test.skip('format with unquoted url() keeps the // intact', () => {
		expect(format(`@namespace svg url(http://www.w3.org/2000/svg);`)).toEqual(
			`@namespace svg url(http://www.w3.org/2000/svg);`,
		)
	})
})

describe('@font-face', () => {
	let css = `@font-face{font-family:Foo;src:url(a.woff2) format("woff2")}`
	test('format', () => {
		expect(format(css)).toEqual(`@font-face {
	font-family: Foo;
	src: url(a.woff2) format("woff2");
}`)
	})
	test('minify', () => {
		expect(minify(css)).toEqual(`@font-face{font-family:Foo;src:url(a.woff2) format("woff2")}`)
	})
	test('empty', () => {
		expect(format(`@font-face{}`)).toEqual(`@font-face {}`)
		expect(minify(`@font-face{}`)).toEqual(`@font-face{}`)
	})
	test('uppercase name is lowercased', () => {
		expect(format(`@FONT-FACE{a:b}`)).toEqual(`@font-face {\n\ta: b;\n}`)
	})
})

describe('@font-palette-values', () => {
	let css = `@font-palette-values --identifier{font-family:Bixa;override-colors:0 red}`
	test('format', () => {
		expect(format(css)).toEqual(`@font-palette-values --identifier {
	font-family: Bixa;
	override-colors: 0 red;
}`)
	})
	test('minify', () => {
		expect(minify(css)).toEqual(css)
	})
})

describe('@font-feature-values', () => {
	test('prelude is kept', () => {
		expect(format(`@font-feature-values Font One{}`)).toEqual(`@font-feature-values Font One {}`)
	})
	// oxlint-disable-next-line vitest/no-disabled-tests
	test.skip('preserves nested @styleset block', () => {
		expect(format(`@font-feature-values Font One{@styleset{nice-style:12}}`)).toEqual(
			`@font-feature-values Font One {
	@styleset {
		nice-style: 12;
	}
}`,
		)
	})
})

describe('@keyframes', () => {
	let css = `@keyframes foo{from{opacity:0}50%{opacity:.5}to{opacity:1}}`
	test('format', () => {
		expect(format(css)).toEqual(`@keyframes foo {
	from {
		opacity: 0;
	}

	50% {
		opacity: .5;
	}

	to {
		opacity: 1;
	}
}`)
	})
	test('minify', () => {
		expect(minify(css)).toEqual(css)
	})
	test('vendor-prefixed', () => {
		expect(format(`@-webkit-keyframes foo{from{opacity:0}to{opacity:1}}`)).toEqual(
			`@-webkit-keyframes foo {
	from {
		opacity: 0;
	}

	to {
		opacity: 1;
	}
}`,
		)
	})
	test('empty', () => {
		expect(format(`@keyframes foo{}`)).toEqual(`@keyframes foo {}`)
	})
})

describe('@counter-style', () => {
	let css = `@counter-style thumbs{system:cyclic;symbols:"👍";suffix:" "}`
	test('format', () => {
		expect(format(css)).toEqual(`@counter-style thumbs {
	system: cyclic;
	symbols: "👍";
	suffix: " ";
}`)
	})
	test('minify', () => {
		expect(minify(css)).toEqual(css)
	})
})

describe('@property', () => {
	let css = `@property --x{syntax:'<length>';inherits:false;initial-value:0px}`
	test('format', () => {
		expect(format(css)).toEqual(`@property --x {
	syntax: "<length>";
	inherits: false;
	initial-value: 0px;
}`)
	})
	test('minify', () => {
		expect(minify(css)).toEqual(`@property --x{syntax:"<length>";inherits:false;initial-value:0px}`)
	})
})

describe('@page', () => {
	test('without selector', () => {
		expect(format(`@page{margin:1in}`)).toEqual(`@page {\n\tmargin: 1in;\n}`)
	})
	test('nested in @media', () => {
		expect(format(`@media print{@page{margin:0}}`)).toEqual(`@media print {
	@page {
		margin: 0;
	}
}`)
	})
	test('minify with pseudo-class', () => {
		expect(minify(`@page :first{margin:1in}`)).toEqual(`@page :first{margin:1in}`)
	})
	// oxlint-disable-next-line vitest/no-disabled-tests
	test.skip('format keeps pseudo-class attached to the colon', () => {
		expect(format(`@page :first{margin:1in}`)).toEqual(`@page :first {\n\tmargin: 1in;\n}`)
	})
	// oxlint-disable-next-line vitest/no-disabled-tests
	test.skip('preserves margin at-rules', () => {
		expect(format(`@page{margin:1in;@top-left{content:"x"}}`)).toEqual(`@page {
	margin: 1in;

	@top-left {
		content: "x";
	}
}`)
	})
})

describe('@container', () => {
	test('named container', () => {
		expect(format(`@container sidebar (min-width:400px){a{color:red}}`)).toEqual(
			`@container sidebar (min-width: 400px) {
	a {
		color: red;
	}
}`,
		)
	})
	test('range syntax and style()', () => {
		expect(format(`@container (width>400px) and style(--x:1){a{color:red}}`)).toEqual(
			`@container (width > 400px) and style(--x: 1) {
	a {
		color: red;
	}
}`,
		)
	})
	test('minify', () => {
		expect(
			minify(`@container sidebar (min-width: 400px) and (width > 100px){a{color:red}}`),
		).toEqual(`@container sidebar (min-width:400px) and (width>100px){a{color:red}}`)
	})
	test('nested in rule', () => {
		expect(format(`a{@container (min-width:1px){b:c}}`)).toEqual(`a {
	@container (min-width: 1px) {
		b: c;
	}
}`)
	})
})

describe('@scope', () => {
	test('with root and limit', () => {
		expect(format(`@scope (.a) to (.b){img{border:1px solid black}}`)).toEqual(
			`@scope (.a) to (.b) {
	img {
		border: 1px solid black;
	}
}`,
		)
	})
	test('without prelude', () => {
		expect(format(`@scope{a{b:c}}`)).toEqual(`@scope {\n\ta {\n\t\tb: c;\n\t}\n}`)
	})
	test('minify', () => {
		expect(minify(`@scope (.a) to (.b) { img { border: 1px solid black } }`)).toEqual(
			`@scope (.a) to (.b){img{border:1px solid black}}`,
		)
	})
	test('empty', () => {
		expect(format(`@scope (.a){}`)).toEqual(`@scope (.a) {}`)
	})
})

describe('@starting-style', () => {
	test('top-level', () => {
		expect(format(`@starting-style{a{opacity:0}}`)).toEqual(
			`@starting-style {\n\ta {\n\t\topacity: 0;\n\t}\n}`,
		)
	})
	test('nested inside a rule', () => {
		expect(format(`a{@starting-style{opacity:0}}`)).toEqual(
			`a {\n\t@starting-style {\n\t\topacity: 0;\n\t}\n}`,
		)
	})
	test('minify', () => {
		expect(minify(`@starting-style { a { opacity: 0 } }`)).toEqual(`@starting-style{a{opacity:0}}`)
	})
})

describe('@view-transition', () => {
	test('format', () => {
		expect(format(`@view-transition{navigation:auto}`)).toEqual(
			`@view-transition {\n\tnavigation: auto;\n}`,
		)
	})
	test('minify', () => {
		expect(minify(`@view-transition { navigation: auto }`)).toEqual(
			`@view-transition{navigation:auto}`,
		)
	})
})

describe('@position-try', () => {
	test('format', () => {
		expect(format(`@position-try --x{top:anchor(bottom)}`)).toEqual(
			`@position-try --x {\n\ttop: anchor(bottom);\n}`,
		)
	})
	test('minify', () => {
		expect(minify(`@position-try --x { top: anchor(bottom) }`)).toEqual(
			`@position-try --x{top:anchor(bottom)}`,
		)
	})
})

describe('@color-profile', () => {
	test('format', () => {
		expect(format(`@color-profile --swop{src:url(a.icc)}`)).toEqual(
			`@color-profile --swop {\n\tsrc: url(a.icc);\n}`,
		)
	})
})

describe('@layer', () => {
	test('statement with list', () => {
		expect(format(`@layer a,b;`)).toEqual(`@layer a, b;`)
		expect(minify(`@layer a, b;`)).toEqual(`@layer a,b;`)
	})
	test('block', () => {
		expect(format(`@layer a{b{c:d}}`)).toEqual(`@layer a {\n\tb {\n\t\tc: d;\n\t}\n}`)
	})
})

describe('@supports', () => {
	test('not', () => {
		expect(format(`@supports not (display:grid){a{b:c}}`)).toEqual(
			`@supports not (display: grid) {\n\ta {\n\t\tb: c;\n\t}\n}`,
		)
	})
	test('minify', () => {
		expect(minify(`@supports not (display: grid){a{b:c}}`)).toEqual(
			`@supports not (display:grid){a{b:c}}`,
		)
	})
})

describe('nesting of atrules', () => {
	test('@media in @media', () => {
		expect(format(`@media screen{@media (min-width:1px){a{b:c}}}`)).toEqual(`@media screen {
	@media (min-width: 1px) {
		a {
			b: c;
		}
	}
}`)
	})
	test('multiple different atrules inside a rule', () => {
		expect(format(`a{@media print{e:f} @starting-style{g:h}}`)).toEqual(`a {
	@media print {
		e: f;
	}

	@starting-style {
		g: h;
	}
}`)
	})
	test('minify', () => {
		expect(minify(`a{@media print{e:f} @starting-style{g:h}}`)).toEqual(
			`a{@media print{e:f}@starting-style{g:h}}`,
		)
	})
})

describe('unknown / custom atrules', () => {
	test('without block', () => {
		expect(format(`@unknown-custom foo bar;`)).toEqual(`@unknown-custom foo bar;`)
		expect(minify(`@unknown-custom foo bar;`)).toEqual(`@unknown-custom foo bar;`)
	})
	test('collapses whitespace in prelude, with block', () => {
		expect(format(`@unknown-custom   foo   bar{a{b:c}}`)).toEqual(
			`@unknown-custom foo bar {\n\ta {\n\t\tb: c;\n\t}\n}`,
		)
		expect(minify(`@unknown-custom   foo   bar{a{b:c}}`)).toEqual(`@unknown-custom foo bar{a{b:c}}`)
	})
	test('@mixin', () => {
		expect(format(`@mixin foo{a:b}`)).toEqual(`@mixin foo {\n\ta: b;\n}`)
	})
	test('@nest', () => {
		expect(format(`@nest .a &{b:c}`)).toEqual(`@nest .a & {\n\tb: c;\n}`)
	})
	test('@custom-media', () => {
		expect(format(`@custom-media --small (max-width:30em);`)).toEqual(
			`@custom-media --small (max-width: 30em);`,
		)
		expect(minify(`@custom-media --small (max-width: 30em);`)).toEqual(
			`@custom-media --small (max-width:30em);`,
		)
	})
	// oxlint-disable-next-line vitest/no-disabled-tests
	test.skip('@custom-selector keeps :--name together', () => {
		expect(format(`@custom-selector :--heading h1,h2,h3;`)).toEqual(
			`@custom-selector :--heading h1, h2, h3;`,
		)
	})
	// oxlint-disable-next-line vitest/no-disabled-tests
	test.skip('@function signature', () => {
		expect(format(`@function --f(--a <length>) returns <length>{result:var(--a)}`)).toEqual(
			`@function --f(--a <length>) returns <length> {\n\tresult: var(--a);\n}`,
		)
	})
	// oxlint-disable-next-line vitest/no-disabled-tests
	test.skip('@document with unquoted url() keeps the // intact', () => {
		expect(format(`@document url(http://x){a{b:c}}`)).toEqual(
			`@document url(http://x) {\n\ta {\n\t\tb: c;\n\t}\n}`,
		)
	})
})
