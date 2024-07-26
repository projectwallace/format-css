import { suite } from 'uvu'
import * as assert from 'uvu/assert'
import { format } from '../index.js'

let test = suite('Stylesheet')

test('empty input', () => {
	let actual = format(``)
	let expected = ``
	assert.equal(actual, expected)
})

test('handles invalid input', () => {
	let actual = format(`;`)
	let expected = `;`

	assert.equal(actual, expected)
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
	`)
	let expected = `@layer what {
	@container (width > 0) {
		ul:has(:nth-child(1 of li)) {
			@media (height > 0) {
				&:hover {
					--is: this;
				}
			}
		}
	}
}`
	assert.equal(actual, expected)
})

test('minified Vadims example', () => {
	let actual = format(`@layer what{@container (width>0){@media (min-height:.001px){ul:has(:nth-child(1 of li)):hover{--is:this}}}}`)

	let expected = `@layer what {
	@container (width > 0) {
		@media (min-height: .001px) {
			ul:has(:nth-child(1 of li)):hover {
				--is: this;
			}
		}
	}
}`
	assert.equal(actual, expected)
})

test.run()
