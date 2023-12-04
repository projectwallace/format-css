import { suite } from "uvu";
import * as assert from "uvu/assert";
import { format } from "../index.js";

let Selectors = suite("Selectors");

Selectors("A single selector is rendered without a trailing comma", () => {
	let actual = format("a {}");
	let expected = "a {}";
	assert.is(actual, expected);
});

Selectors(
	"Multiple selectors are placed on a new line, separated by commas",
	() => {
		let actual = format(`
		selector1,
			selector1a,
			selector1b,
				selector1aa,
		selector2,

		selector3 {
		}
	`);
		let expected = `selector1,
selector1a,
selector1b,
selector1aa,
selector2,
selector3 {}`;

		assert.equal(actual, expected);
	}
);

Selectors("formats multiline selectors on a single line", () => {
	let actual = format(`
a.b
 .c .d
   .e .f {
color: green }
	`);
	let expected = `a.b .c .d .e .f {
	color: green;
}`;
	assert.equal(actual, expected);
});

Selectors("formats simple selector combinators", () => {
	let actual = format(`
		a>b,
		a>b~c  d {}
	`);
	let expected = `a > b,
a > b ~ c d {}`;
	assert.equal(actual, expected);
});

Selectors("formats nested selector combinators", () => {
	let fixtures = [
		[`:where(a+b) {}`, `:where(a + b) {}`],
		[`:where(:is(ol,ul)) {}`, `:where(:is(ol, ul)) {}`],
		[`li:nth-of-type(1) {}`, `li:nth-of-type(1) {}`],
		[`li:nth-of-type(2n) {}`, `li:nth-of-type(2n) {}`],
	];

	for (let [css, expected] of fixtures) {
		let actual = format(css);
		assert.equal(actual, expected);
	}
});

Selectors("formats selectors with Nth", () => {
	let fixtures = [
		[`li:nth-child(3n-2) {}`, `li:nth-child(3n -2) {}`],
		[`li:nth-child(0n+1) {}`, `li:nth-child(0n + 1) {}`],
		[`li:nth-child(even of .noted) {}`, `li:nth-child(even of .noted) {}`],
		[`li:nth-child(2n of .noted) {}`, `li:nth-child(2n of .noted) {}`],
		[`li:nth-child(-n + 3 of .noted) {}`, `li:nth-child(-1n + 3 of .noted) {}`],
		[
			`li:nth-child(-n+3 of li.important) {}`,
			`li:nth-child(-1n + 3 of li.important) {}`,
		],
		[
			`p:nth-child(n+8):nth-child(-n+15) {}`,
			`p:nth-child(1n + 8):nth-child(-1n + 15) {}`,
		],
	];

	for (let [css, expected] of fixtures) {
		let actual = format(css);
		assert.equal(actual, expected);
	}
});

Selectors.run();
