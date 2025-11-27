import { format } from '../index'
import { describe, test, expect } from 'vitest'

test('stylesheet', () => {
	let css = format(`h1 { color: green; }`)
	expect(css).toEqual(`h1 {\n\tcolor: green;\n}`)
})

describe('single rule', () => {
	test('1 selector, empty rule', () => {
		let css = format(`h1 { }`)
		expect(css).toEqual(`h1 {}`)
	})

	test('2 selectors, empty rule', () => {
		let css = format(`h1, h2 { }`)
		expect(css).toEqual(`h1,\nh2 {}`)
	})

	test('1 selector, 1 declaration', () => {
		let css = format(`h1 { color: green; }`)
		expect(css).toEqual(`h1 {\n\tcolor: green;\n}`)
	})

	test('2 selectors, 1 declaration', () => {
		let css = format(`h1, h2 { color: green; }`)
		expect(css).toEqual(`h1,\nh2 {\n\tcolor: green;\n}`)
	})

	test('1 selector, 2 declarations', () => {
		let css = format(`h1 { color: green; color: blue; }`)
		expect(css).toEqual(`h1 {\n\tcolor: green;\n\tcolor: blue;\n}`)
	})
})

describe('atrules', () => {
	describe('@layer', () => {
		describe('no block', () => {
			test('@layer test;', () => {
				let css = format('@layer test;')
				expect(css).toEqual('@layer test;')
			})
			test('@layer test.a;', () => {
				let css = format('@layer test.a;')
				expect(css).toEqual('@layer test.a;')
			})
			test('@layer test1,test2;', () => {
				let css = format('@layer test1, test2;')
				expect(css).toEqual('@layer test1, test2;')
			})
			test.todo('@layer test1.a, test2.b;')
		})
		describe('with block', () => {
			test('empty block', () => {
				let css = format('@layer block-empty {}')
				expect(css).toEqual('@layer block-empty {}')
			})
			test('non-empty block', () => {
				let css = format('@layer block { a {} }')
				expect(css).toEqual('@layer block {\n\ta {}\n}')
			})
		})
		describe('nested atrules', () => {
			test('triple nested atrules', () => {
				let css = format(`@layer { @media all { @layer third {} }}`)
				expect(css).toBe(`@layer {\n\t@media all {\n\t\t@layer third {}\n\t}\n}`)
			})
			test('vadim', () => {
				let css = format(`@layer what {
					@container (width > 0) {
						ul:has(:nth-child(1 of li)) {
							@media (height > 0) {
								&:hover {
									--is: this;
								}
							}
						}
					}
				}`)
				expect(css).toBe(`@layer what {
	@container (width > 0) {
		ul:has(:nth-child(1 of li)) {
			@media (height > 0) {
				&:hover {
					--is: this;
				}
			}
		}
	}
}`)
			})
		})
	})
})

describe('nested rules', () => {
	test('with explicit &', () => {
		let css = format(`h1 {
			color: green;

			& span {
				color: red;
			}
		}`)
		expect(css).toEqual(`h1 {
	color: green;

	& span {
		color: red;
	}
}`)
	})
})

describe('selectors', () => {
	test('1 selector, empty rule', () => {
		let css = format(`h1 { }`)
		expect(css).toEqual(`h1 {}`)
	})
	test('2 selectors, empty rule', () => {
		let css = format(`h1, h2 { }`)
		expect(css).toEqual(`h1,\nh2 {}`)
	})

	describe('complex selectors', () => {
		test('test#id', () => {
			let css = format(`test#id { }`)
			expect(css).toEqual(`test#id {}`)
		})
		test('test[class]', () => {
			let css = format(`test[class] { }`)
			expect(css).toEqual(`test[class] {}`)
		})
		test('test.class', () => {
			let css = format(`test.class { }`)
			expect(css).toEqual(`test.class {}`)
		})
		test('lowercases type selector', () => {
			let css = format(`TEST { }`)
			expect(css).toEqual(`test {}`)
		})
		test('combinators > + ~', () => {
			let css = format(`test > my ~ first+selector   .with   .nesting {}`)
			expect(css).toEqual(`test > my ~ first + selector .with .nesting {}`)
		})
		test('pseudo elements: p::before', () => {
			let css = format(`p::Before a::AFTER p::first-line {}`)
			expect(css).toBe(`p::before a::after p::first-line {}`)
		})
		test('pseudo classes (simple): p:has(a)', () => {
			let css = format(`p:has(a) {}`)
			expect(css).toBe(`p:has(a) {}`)
		})
		test('pseudo classes: :nth-child(1) {}', () => {
			let css = format(`:nth-child(1) {}`)
			expect(css).toBe(`:nth-child(1) {}`)
		})
		test('pseudo classes: :nth-child(n+2) {}', () => {
			let css = format(`:nth-child(n+2) {}`)
			expect(css).toBe(`:nth-child(n + 2) {}`)
		})
		test('pseudo classes: :nth-child(-3n+2) {}', () => {
			let css = format(`:nth-child(-3n+2) {}`)
			expect(css).toBe(`:nth-child(-3n + 2) {}`)
		})
		test('pseudo classes: :nth-child(2n-2) {}', () => {
			let css = format(`:nth-child(2n-2) {}`)
			expect(css).toBe(`:nth-child(2n -2) {}`)
		})
		test('pseudo classes: :nth-child(3n of .selector) {}', () => {
			let css = format(`:nth-child(3n of .selector) {}`)
			expect(css).toBe(`:nth-child(3n of .selector) {}`)
		})
		test('attribute selector: x[foo] y[foo=1] z[foo^="meh"]', () => {
			let css = format(`x[foo] y[foo=1] Z[FOO^='meh'] {}`)
			expect(css).toBe(`x[foo] y[foo="1"] z[foo^="meh"] {}`)
		})
		test('nested pseudo classes: ul:has(:nth-child(1 of li)) {}', () => {
			let css = format(`ul:has(:nth-child(1 of li)) {}`)
			expect(css).toBe('ul:has(:nth-child(1 of li)) {}')
		})
		test('pseudo: :is(a, b)', () => {
			let css = format(':is(a,b) {}')
			expect(css).toBe(':is(a, b) {}')
		})
		test(':lang("nl", "de")', () => {
			let css = format(':lang("nl", "de") {}')
			expect(css).toBe(':lang("nl", "de") {}')
		})
	})
})

describe('declaration', () => {
	test('adds ; when missing', () => {
		let css = format(`a { color: blue }`)
		expect(css).toEqual(`a {\n\tcolor: blue;\n}`)
	})

	test('does not add ; when already present', () => {
		let css = format(`a { color: blue; }`)
		expect(css).toEqual(`a {\n\tcolor: blue;\n}`)
	})

	test('print !important', () => {
		let css = format(`a { color: red !important }`)
		expect(css).toEqual(`a {\n\tcolor: red !important;\n}`)
	})

	test('print (legacy) !ie (without semicolon)', () => {
		let css = format(`a { color: red !ie }`)
		expect(css).toEqual(`a {\n\tcolor: red !ie;\n}`)
	})

	test('print (legacy) !ie; (with semicolon)', () => {
		let css = format(`a { color: red !ie; }`)
		expect(css).toEqual(`a {\n\tcolor: red !ie;\n}`)
	})
})

describe('values', () => {
	test('function', () => {
		let css = format(`a { color: rgb(0 0 0); }`)
		expect(css).toBe(`a {\n\tcolor: rgb(0 0 0);\n}`)
	})
	test('dimension', () => {
		let css = format(`a { height: 10PX; }`)
		expect(css).toBe(`a {\n\theight: 10px;\n}`)
	})
	test('percentage', () => {
		let css = format(`a { height: 10%; }`)
		expect(css).toBe(`a {\n\theight: 10%;\n}`)
	})
	test('url()', () => {
		let css = format(`a { src: url(test), url('test'), url("test"); }`)
		expect(css).toBe(`a {\n\tsrc: url("test"), url("test"), url("test");\n}`)
	})
	test('"string"', () => {
		let css = format(`a { content: 'string'; }`)
		expect(css).toBe(`a {\n\tcontent: "string";\n}`)
	})
})
