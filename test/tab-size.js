import { suite } from 'uvu'
import * as assert from 'uvu/assert'
import { format } from '../index.js'

let test = suite('Tab Size')

let fixture = `
	selector {
		color: red;
	}
`

test('tab_size: 2', () => {
	let actual = format(`
		selector {
			color: red;
		}

		@media (min-width: 100px) {
			selector {
				color: blue;
			}
		}
	`, { tab_size: 2 })
	let expected = `selector {
  color: red;
}

@media (min-width: 100px) {
  selector {
    color: blue;
  }
}`
	assert.equal(actual, expected)
})

test('invalid tab_size: 0', () => {
	assert.throws(() => format(fixture, { tab_size: 0 }))
})

test('invalid tab_size: negative', () => {
	assert.throws(() => format(fixture, { tab_size: -1 }))
})

test('combine tab_size and minify', () => {
	let actual = format(fixture, {
		tab_size: 2,
		minify: true
	})
	let expected = `selector{color:red}`
	assert.equal(actual, expected)
})

test.run()
