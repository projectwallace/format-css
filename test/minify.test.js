import { suite } from "uvu"
import * as assert from "uvu/assert"
import { format } from "../index.js"

let test = suite("Minify")

const MINIFY_OPTIONS = { minify: true }

test('empty rule', () => {
	let actual = format(`a {}`, MINIFY_OPTIONS)
	let expected = `a{}`
	assert.equal(actual, expected)
})

test('simple declaration', () => {
	let actual = format(`:root { --color: red; }`, MINIFY_OPTIONS)
	let expected = `:root{--color:red;}`
	assert.equal(actual, expected)
})

test('simple atrule', () => {
	let actual = format(`@media (min-width: 100px) { body { color: red; } }`, MINIFY_OPTIONS)
	let expected = `@media (min-width: 100px){body{color:red;}}`
	assert.equal(actual, expected)
})

test('empty atrule', () => {
	let actual = format(`@media (min-width: 100px) {}`, MINIFY_OPTIONS)
	let expected = `@media (min-width: 100px){}`
	assert.equal(actual, expected)
})

test("formats multiline values on a single line", () => {
	let actual = format(`
a {
  background: linear-gradient(
    red,
  10% blue,
20% green,100% yellow);
}
	`, MINIFY_OPTIONS);
	let expected = `a{background:linear-gradient(red, 10% blue, 20% green, 100% yellow);}`;
	assert.equal(actual, expected);
})

test('Vadim Makeevs example works', () => {
	let actual = format(`
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
	`, MINIFY_OPTIONS)
	let expected = `@layer what{@container (width > 0){ul:has(:nth-child(1 of li)){@media (height > 0){&:hover{--is:this;}}}}}`
	assert.equal(actual, expected)
})

test('minified Vadims example', () => {
	let actual = format(`@layer what{@container (width>0){@media (min-height:.001px){ul:has(:nth-child(1 of li)):hover{--is:this}}}}`, MINIFY_OPTIONS)
	let expected = `@layer what{@container (width > 0){@media (min-height: .001px){ul:has(:nth-child(1 of li)):hover{--is:this;}}}}`
	assert.equal(actual, expected)
})

test.run()
