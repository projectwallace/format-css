import { test, expect } from 'vitest'
import { format } from '../index.js'

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
	expect(() => format(fixture, { tab_size: 0 })).toThrow()
})

test('invalid tab_size: negative', () => {
	expect(() => format(fixture, { tab_size: -1 })).toThrow()
})

test('combine tab_size and minify', () => {
	let actual = format(fixture, {
		tab_size: 2,
		minify: true,
	})
	let expected = `selector{color:red}`
	expect(actual).toEqual(expected)
})
