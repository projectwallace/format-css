import { test, expect } from 'vitest'
import { format } from '../index.js'

test('empty input', () => {
	let actual = format(``)
	let expected = ``
	expect(actual).toEqual(expected)
})

test('handles invalid input', () => {
	let actual = format(`;`)
	let expected = `;`
	expect(actual).toEqual(expected)
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
	expect(actual).toEqual(expected)
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
	expect(actual).toEqual(expected)
})
