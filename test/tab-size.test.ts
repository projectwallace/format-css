import { test, expect } from 'vitest'
import { format } from '../src/lib/index.js'

let fixture = `
	selector {
		color: red;
	}
`

test('tab_size: 2', () => {
	let actual = format(
		`
		selector {
			color: red;
		}

		@media (min-width: 100px) {
			selector {
				color: blue;
			}
		}
	`,
		{ tab_size: 2 },
	)
	let expected = `selector {
  color: red;
}

@media (min-width: 100px) {
  selector {
    color: blue;
  }
}`
	expect(actual).toEqual(expected)
})

test('invalid tab_size: 0', () => {
	expect(() => format(fixture, { tab_size: 0 })).toThrow(
		'tab_size must be a whole number greater than 0',
	)
})

test('invalid tab_size: negative', () => {
	expect(() => format(fixture, { tab_size: -1 })).toThrow(
		'tab_size must be a whole number greater than 0',
	)
})

test('invalid tab_size: fractional', () => {
	expect(() => format(fixture, { tab_size: 2.5 })).toThrow(
		'tab_size must be a whole number greater than 0',
	)
})

test('invalid tab_size: NaN', () => {
	expect(() => format(fixture, { tab_size: NaN })).toThrow(
		'tab_size must be a whole number greater than 0',
	)
})

test('invalid tab_size: Infinity', () => {
	expect(() => format(fixture, { tab_size: Infinity })).toThrow(
		'tab_size must be a whole number greater than 0',
	)
})

test('invalid tab_size: non-numeric string (bypassing TypeScript types)', () => {
	// @ts-expect-error tab_size is typed as number, but JS callers can pass anything at runtime
	expect(() => format(fixture, { tab_size: 'abc' })).toThrow(
		'tab_size must be a whole number greater than 0',
	)
})

test('combine tab_size and minify', () => {
	let actual = format(fixture, {
		tab_size: 2,
		minify: true,
	})
	let expected = `selector{color:red}`
	expect(actual).toEqual(expected)
})
