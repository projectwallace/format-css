import { suite } from "uvu";
import * as assert from "uvu/assert";
import { format } from "../index.js";

let test = suite("Values");

test('collapses abundant whitespace', () => {
	let actual = format(`a {
		transition: all   100ms   ease;
		color: rgb(  0  ,  0   ,  0  );
		color: red   ;
	}`)
	let expected = `a {
	transition: all 100ms ease;
	color: rgb(0, 0, 0);
	color: red;
}`
	assert.is(actual, expected)
})

test("formats simple value lists", () => {
	let actual = format(`
		a {
			transition-property: all,opacity;
			transition: all 100ms ease,opacity 10ms 20ms linear;
			ANIMATION: COLOR 123MS EASE-OUT;
			color: rgb(0,0,0);
			color: HSL(0%,10%,50%);
			content: 'Test';
			background-image: url("EXAMPLE.COM");
		}
	`);
	let expected = `a {
	transition-property: all, opacity;
	transition: all 100ms ease, opacity 10ms 20ms linear;
	animation: COLOR 123ms EASE-OUT;
	color: rgb(0, 0, 0);
	color: hsl(0%, 10%, 50%);
	content: 'Test';
	background-image: url("EXAMPLE.COM");
}`;
	assert.equal(actual, expected);
});

test("formats nested value lists", () => {
	let actual = format(`
		a {
			background: red,linear-gradient(to bottom,red 10%,green 50%,blue 100%);
		}
	`);
	let expected = `a {
	background: red, linear-gradient(to bottom, red 10%, green 50%, blue 100%);
}`;
	assert.equal(actual, expected);
});

test("formats nested var()", () => {
	let actual = format(`
		a {
			color: var(--test1,var(--test2,green));
			color: var(--test3,rgb(0,0,0));
		}
	`);
	let expected = `a {
	color: var(--test1, var(--test2, green));
	color: var(--test3, rgb(0, 0, 0));
}`;
	assert.equal(actual, expected);
});

test("formats multiline values on a single line", () => {
	let actual = format(`
a {
  background: linear-gradient(
    red,
  10% blue,
20% green,100% yellow);
}
	`);
	let expected = `a {
	background: linear-gradient(red, 10% blue, 20% green, 100% yellow);
}`;
	assert.equal(actual, expected);
});

test('does not break font shorthand', () => {
	let actual = format(`a {
		font: 2em/2 sans-serif;
		font: 2em/ 2 sans-serif;
		font: 2em    /     2 sans-serif;
	}`)
	let expected = `a {
	font: 2em/2 sans-serif;
	font: 2em/2 sans-serif;
	font: 2em/2 sans-serif;
}`
	assert.is(actual, expected)
})

test('formats whitespace around operators (*/+-) correctly', () => {
	let actual = format(`a {
	font: 2em/2 sans-serif;
	font-size: calc(2em/2);
	font-size: calc(2em * 2);
	font-size: calc(2em + 2px);
	font-size: calc(2em - 2px);
}`)
	let expected = `a {
	font: 2em/2 sans-serif;
	font-size: calc(2em / 2);
	font-size: calc(2em * 2);
	font-size: calc(2em + 2px);
	font-size: calc(2em - 2px);
}`
	assert.is(actual, expected)
})

test('does not lowercase grid-area names', () => {
	let actual = format(`a { grid-area: emailInputBox; }`)
	let expected = `a {
	grid-area: emailInputBox;
}`
	assert.is(actual, expected)
})

test('does not lowercase custom properties in var()', () => {
	let actual = format(`a { color: var(--MyColor); }`)
	let expected = `a {
	color: var(--MyColor);
}`
	assert.is(actual, expected)
})

test('lowercases CSS functions', () => {
	let actual = format(`a {
		color: RGB(0, 0, 0);
		transform: translateX(100px);
	}`)
	let expected = `a {
	color: rgb(0, 0, 0);
	transform: translatex(100px);
}`
	assert.is(actual, expected)
})

test('does not change casing of `NaN`', () => {
	let actual = format(`a {
		height: calc(1 * NaN);
	}`)
	let expected = `a {
	height: calc(1 * NaN);
}`
	assert.is(actual, expected)
})

test('does not change casing of URLs', () => {
	let actual = format(`a {
		background-image: url("My-Url.png");
	}`)
	let expected = `a {
	background-image: url("My-Url.png");
}`
	assert.is(actual, expected)
})

test('lowercases dimensions', () => {
	let actual = format(`a {
		font-size: 12PX;
		width: var(--test, 33REM);
	}`)
	let expected = `a {
	font-size: 12px;
	width: var(--test, 33rem);
}`
	assert.is(actual, expected)
})

test.run();
