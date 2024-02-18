import { suite } from "uvu"
import * as assert from "uvu/assert"
import { minify } from "../index.js"

let test = suite("Minify")

test('empty rule', () => {
	let actual = minify(`a {}`)
	let expected = `a{}`
	assert.equal(actual, expected)
})

test('simple declaration', () => {
	let actual = minify(`:root { --color: red; }`)
	let expected = `:root{--color:red}`
	assert.equal(actual, expected)
})

test('simple atrule', () => {
	let actual = minify(`@media (min-width: 100px) { body { color: red; } }`)
	let expected = `@media (min-width: 100px){body{color:red}}`
	assert.equal(actual, expected)
})

test('empty atrule', () => {
	let actual = minify(`@media (min-width: 100px) {}`)
	let expected = `@media (min-width: 100px){}`
	assert.equal(actual, expected)
})

test("formats multiline values on a single line", () => {
	let actual = minify(`
a {
  background: linear-gradient(
    red,
  10% blue,
20% green,100% yellow);
}
	`);
	let expected = `a{background:linear-gradient(red,10% blue,20% green,100% yellow)}`;
	assert.equal(actual, expected);
})

test('correctly minifies operators', () => {
	let actual = minify(`a { width: calc(100% - 10px); height: calc(100 * 1%); }`)
	let expected = `a{width:calc(100% - 10px);height:calc(100*1%)}`
	assert.equal(actual, expected)
})

test('correctly minifiers modern colors', () => {
	let actual = minify(`a { color: rgb(0 0 0 / 0.1); }`)
	let expected = `a{color:rgb(0 0 0/0.1)}`
	assert.equal(actual, expected)
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
	assert.equal(actual, expected)
})

test('minified Vadims example', () => {
	let actual = minify(`@layer what{@container (width>0){@media (min-height:.001px){ul:has(:nth-child(1 of li)):hover{--is:this}}}}`)
	let expected = `@layer what{@container (width > 0){@media (min-height: .001px){ul:has(:nth-child(1 of li)):hover{--is:this}}}}`
	assert.equal(actual, expected)
})

test.run()
