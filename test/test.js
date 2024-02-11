import { suite } from "uvu";
import * as assert from "uvu/assert";
import { format } from "../index.js";

let test = suite("Stylesheet");

test("empty input", () => {
	let actual = format(``);
	let expected = ``;
	assert.equal(actual, expected);
});

test('handles invalid input', () => {
	let actual = format(`;`)
	let expected = `;`

	assert.equal(actual, expected)
})

test.run();
