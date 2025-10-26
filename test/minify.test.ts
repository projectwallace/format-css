import { test, expect } from 'vitest'
import { minify } from '../index.js'

test('empty rule', () => {
	let actual = minify(`a {}`)
	let expected = `a{}`
	expect(actual).toEqual(expected)
})

test('simple declaration', () => {
	let actual = minify(`:root { --color: red; }`)
	let expected = `:root{--color:red}`
	expect(actual).toEqual(expected)
})

test('simple atrule', () => {
	let actual = minify(`@media (min-width: 100px) { body { color: red; } }`)
	let expected = `@media (min-width: 100px){body{color:red}}`
	expect(actual).toEqual(expected)
})

test('empty atrule', () => {
	let actual = minify(`@media (min-width: 100px) {}`)
	let expected = `@media (min-width: 100px){}`
	expect(actual).toEqual(expected)
})

test('formats multiline values on a single line', () => {
	let actual = minify(`
a {
  background: linear-gradient(
    red,
  10% blue,
20% green,100% yellow);
}
	`)
	let expected = `a{background:linear-gradient(red,10% blue,20% green,100% yellow)}`
	expect(actual).toEqual(expected)
})

test('correctly minifies operators', () => {
	let actual = minify(`a { width: calc(100% - 10px); height: calc(100 * 1%); }`)
	let expected = `a{width:calc(100% - 10px);height:calc(100*1%)}`
	expect(actual).toEqual(expected)
})

test('correctly minifiers modern colors', () => {
	let actual = minify(`a { color: rgb(0 0 0 / 0.1); }`)
	let expected = `a{color:rgb(0 0 0/0.1)}`
	expect(actual).toEqual(expected)
})

test('Vadim Makeevs example works', () => {
	let actual = minify(`
	@layer what {
		@container (width > 0) {
			ul:has(:nth-child(1 of li)) {
				@media (height > 0) {
					&:hover {
						--is: this;
					}
				}
			}
		}
	}
	`)
	let expected = `@layer what{@container (width > 0){ul:has(:nth-child(1 of li)){@media (height > 0){&:hover{--is:this}}}}}`
	expect(actual).toEqual(expected)
})

test('minified Vadims example', () => {
	let actual = minify(`@layer what{@container (width>0){@media (min-height:.001px){ul:has(:nth-child(1 of li)):hover{--is:this}}}}`)
	let expected = `@layer what{@container (width > 0){@media (min-height: .001px){ul:has(:nth-child(1 of li)):hover{--is:this}}}}`
	expect(actual).toEqual(expected)
})

test('removes whitespace before !important', () => {
	let actual = minify(`a { color: green !important }`)
	let expected = `a{color:green!important}`
	expect(actual).toEqual(expected)
})

test.only('minifies complex selectors', () => {
	let actual = minify(`:is(a, b) { color: green }`)
	let expected = `:is(a,b){color:green}`
	expect(actual).toEqual(expected)
})
