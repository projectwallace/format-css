import { suite } from 'uvu'
import * as assert from 'uvu/assert'
import { format } from '../index.js'

let test = suite('Ranges')

test('empty ranges', () => {
	let actual = format(`a {}`, { ranges: [] })
	let expected = {
		css: `a {}`,
		ranges: []
	}
	assert.equal(actual, expected)
})

test('a single valid range', () => {
	let actual = format(`a {} b{color:red}`, { ranges: [{ start: 5, end: 17 }] })
	let expected = {
		css: `a {}

b {
	color: red;
}`,
		ranges: [{
			start: 6,
			end: 24
		}]
	}
	assert.equal(actual, expected)
})

test('a range spanning multiple rules', () => {
	let actual = format(`a {} b{color:red} c{color:blue}`, { ranges: [{ start: 5, end: 30 }] })
	let expected = {
		css: `a {}

b {
	color: red;
}

c {
	color: blue;
}`,
		ranges: [{
			start: 6,
			end: 25
		}]
	}
	assert.equal(actual, expected)
})

test('a single invalid range', () => {
	let actual = format(`a {} b{color:red}`, { ranges: [{ start: 15, end: 28 }] })
	let expected = {
		css: `a {}

b {
	color: red;
}`,
		ranges: []
	}
	assert.equal(actual, expected)
})

test.run()
