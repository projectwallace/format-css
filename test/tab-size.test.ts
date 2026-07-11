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

let default_indentation = format(fixture)

test('invalid tab_size: 0 falls back to default tab indentation', () => {
	expect(format(fixture, { tab_size: 0 })).toEqual(default_indentation)
})

test('invalid tab_size: negative falls back to default tab indentation', () => {
	expect(format(fixture, { tab_size: -1 })).toEqual(default_indentation)
})

test('invalid tab_size: fractional falls back to default tab indentation', () => {
	expect(format(fixture, { tab_size: 2.5 })).toEqual(default_indentation)
})

test('invalid tab_size: NaN falls back to default tab indentation', () => {
	expect(format(fixture, { tab_size: NaN })).toEqual(default_indentation)
})

test('invalid tab_size: Infinity falls back to default tab indentation', () => {
	expect(format(fixture, { tab_size: Infinity })).toEqual(default_indentation)
})

test('invalid tab_size: non-numeric string falls back to default tab indentation (bypassing TypeScript types)', () => {
	// @ts-expect-error tab_size is typed as number, but JS callers can pass anything at runtime
	expect(format(fixture, { tab_size: 'abc' })).toEqual(default_indentation)
})

test('invalid tab_size does not throw', () => {
	expect(() => format(fixture, { tab_size: 0 }), 'invalid tab_size should not throw').not.toThrow()
})

test('combine tab_size and minify', () => {
	let actual = format(fixture, {
		tab_size: 2,
		minify: true,
	})
	let expected = `selector{color:red}`
	expect(actual).toEqual(expected)
})
