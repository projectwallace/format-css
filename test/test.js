import { suite } from "uvu";
import * as assert from "uvu/assert";
import { format } from "../index.js";

let Stylesheet = suite("Stylesheet");

Stylesheet("empty input", () => {
	let actual = format(``);
	let expected = ``;
	assert.equal(actual, expected);
});

Stylesheet('handles invalid input', () => {
	let actual = format(`;`)
	let expected = `;`

	assert.equal(actual, expected)
})

Stylesheet("handles comments", () => {
	let actual = format(`
/*!
 * Library vx.x.x (http://css-lib.com)
 * Copyright 1970-1800 CSS Inc.
 * Licensed under MIT (https://example.com)
 */

/*! normalize.css v3.0.3 | MIT License | github.com/necolas/normalize.css */

html /* comment */ {
	font-family /* comment */ : /* comment */ sans-serif;
}
	`);
	let expected = `/*!
 * Library vx.x.x (http://css-lib.com)
 * Copyright 1970-1800 CSS Inc.
 * Licensed under MIT (https://example.com)
 */

/*! normalize.css v3.0.3 | MIT License | github.com/necolas/normalize.css */

html {
	font-family: sans-serif;
}`;

	assert.equal(actual, expected);
});

Stylesheet.run();
