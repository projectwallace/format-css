import { suite } from "uvu";
import * as assert from "uvu/assert";
import { format } from "../index.js";

let Values = suite("Values");

Values('lowercases things', () => {
	let actual = format(`
		a {
			ANIMATION: COLOR 123MS EASE-OUT;
			color: HSL(0%,10%,50%);
			content: 'Test';
			background-image: url("EXAMPLE.COM");
		}
	`);
	let expected = `a {
	animation: color 123ms ease-out;
	color: hsl(0%, 10%, 50%);
	content: 'Test';
	background-image: url("EXAMPLE.COM");
}`;
	assert.equal(actual, expected);
})

Values('collapses abundant whitespace', () => {
	let actual = format(`a {
		transition: all   100ms   ease;
		color: rgb(  0  ,  0   ,  0  );
	}`)
	let expected = `a {
	transition: all 100ms ease;
	color: rgb(0, 0, 0);
}`
	assert.is(actual, expected)
})

Values("formats simple value lists", () => {
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
	animation: color 123ms ease-out;
	color: rgb(0, 0, 0);
	color: hsl(0%, 10%, 50%);
	content: 'Test';
	background-image: url("EXAMPLE.COM");
}`;
	assert.equal(actual, expected);
});

Values("formats nested value lists", () => {
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

Values("formats nested var()", () => {
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

Values("formats multiline values on a single line", () => {
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

Values('does not break font shorthand', () => {
	let actual = format(`a {
		font: 2em/2 sans-serif;
	}`)
	let expected = `a {
		font: 2em/2 sans-serif;
	}`
	assert.is(actual, expected)
})

Values.skip('formats whitespace around */+- correctly', () => {
	let actual = format(`a {
	font: 2em/2 sans-serif;
	font-size: calc(2em/2);
	font-size: calc(2em + 2px)
}`)
	let expected = `a {
	font: 2em/2 sans-serif;
	font-size: calc(2em / 2);
	font-size: calc(2em + 2px);
}`
	assert.is(actual, expected)
})

Values.run();
