import { test, expect } from 'vitest'
import { format, minify } from '../src/lib/index.js'

test('formats if() with one condition per line, per issue #219', () => {
	let actual = format(`test {
		color: if(media(print): black; supports(display: grid): green; else: red);
	}`)
	let expected = `test {
	color: if(
		media(print): black;
		supports(display: grid): green;
		else: red;
	);
}`
	expect(actual).toEqual(expected)
})

test('honors tab_size for if() branches', () => {
	let actual = format(`a { color: if(media(print): black; else: red); }`, { tab_size: 2 })
	let expected = `a {
  color: if(
    media(print): black;
    else: red;
  );
}`
	expect(actual).toEqual(expected)
})

test('minifies if() onto a single line', () => {
	let actual = minify(`a { color: if( media(print) : black ; else : red ) ; }`)
	expect(actual).toBe('a{color:if(media(print):black;else:red)}')
})

test('lowercases if() and its condition function names', () => {
	let actual = format(`a { color: IF(MEDIA(print): black; ELSE: red); }`)
	let expected = `a {
	color: if(
		media(print): black;
		else: red;
	);
}`
	expect(actual).toEqual(expected)
})

test('formats style() and compound supports() conditions', () => {
	let actual = format(
		`a { color: if(style(--x: 1): red; supports((display:grid) and (color:red)): blue; else: black); }`,
	)
	let expected = `a {
	color: if(
		style(--x: 1): red;
		supports((display: grid) and (color: red)): blue;
		else: black;
	);
}`
	expect(actual).toEqual(expected)
})

test('formats media() range conditions', () => {
	let actual = format(`a { color: if(media(400px<=width<=700px): green; else: black); }`)
	let expected = `a {
	color: if(
		media(400px <= width <= 700px): green;
		else: black;
	);
}`
	expect(actual).toEqual(expected)
})

test('formats nested if() with correct indentation', () => {
	let actual = format(
		`a { color: if(media(print): if(supports(display:grid): green; else: yellow); else: red); }`,
	)
	let expected = `a {
	color: if(
		media(print): if(
			supports(display: grid): green;
			else: yellow;
		);
		else: red;
	);
}`
	expect(actual).toEqual(expected)
})

test('formats an if() branch with an empty value', () => {
	let actual = format(`a { --x: if(style(--y: 1):; else: 1); }`)
	let expected = `a {
	--x: if(
		style(--y: 1):;
		else: 1;
	);
}`
	expect(actual).toEqual(expected)
})

test('formats an if() without an else', () => {
	let actual = format(`a { --x: if(style(--y: 1):1 }`)
	let expected = `a {
	--x: if(
		style(--y: 1): 1;
	);
}`
	expect(actual).toEqual(expected)
})

test('formats an if() without a condition, only an else', () => {
	let actual = format(`a { --x: if(else:1) }`)
	let expected = `a {
	--x: if(
		else: 1;
	);
}`
	expect(actual).toEqual(expected)
})

test('formats an if() with multiple else', () => {
	let actual = format(`
		div {
			background-image: if(
				style(--scheme: ice): linear-gradient(#caf0f8, white, #caf0f8);
				else: url("debug.png");
				style(--scheme: fire): linear-gradient(#ffc971, white, #ffc971);
				else: none
			);
		}
	`)
	let expected = `div {
	background-image: if(
		style(--scheme: ice): linear-gradient(#caf0f8, white, #caf0f8);
		else: url("debug.png");
		style(--scheme: fire): linear-gradient(#ffc971, white, #ffc971);
		else: none;
	);
}`
	expect(actual).toBe(expected)
})

test('formats an empty if()', () => {
	let actual = format(`a { --x: if(); }`)
	let expected = `a {
	--x: if();
}`
	expect(actual).toEqual(expected)
})

test('formats operators', () => {
	let actual = format(`
		div {
			background-color: if(
				style((--scheme: dark) or (--scheme: very-dark)): black;
			);

			background-color: if(
				style((--scheme: dark) and (--contrast: hi)): black;
			);

			background-color: if(
				not style(--scheme: light): black;
			);
		}
	`)
	let expected = `div {
	background-color: if(
		style((--scheme: dark) or (--scheme: very-dark)): black;
	);
	background-color: if(
		style((--scheme: dark) and (--contrast: hi)): black;
	);
	background-color: if(
		not style(--scheme: light): black;
	);
}`
	expect(actual).toBe(expected)
})
