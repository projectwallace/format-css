import { test, expect } from 'vitest'
import { format } from '../index.js'

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
	expect(actual).toEqual(expected)
})

test('formats simple value lists', () => {
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
	`)
	let expected = `a {
	transition-property: all, opacity;
	transition: all 100ms ease, opacity 10ms 20ms linear;
	animation: COLOR 123ms EASE-OUT;
	color: rgb(0, 0, 0);
	color: hsl(0%, 10%, 50%);
	content: "Test";
	background-image: url("EXAMPLE.COM");
}`
	expect(actual).toEqual(expected)
})

test('formats nested value lists', () => {
	let actual = format(`
		a {
			background: red,linear-gradient(to bottom,red 10%,green 50%,blue 100%);
		}
	`)
	let expected = `a {
	background: red, linear-gradient(to bottom, red 10%, green 50%, blue 100%);
}`
	expect(actual).toEqual(expected)
})

test('formats nested var()', () => {
	let actual = format(`
		a {
			color: var(--test1,var(--test2,green));
			color: var(--test3,rgb(0,0,0));
		}
	`)
	let expected = `a {
	color: var(--test1, var(--test2, green));
	color: var(--test3, rgb(0, 0, 0));
}`
	expect(actual).toEqual(expected)
})

test('formats multiline values on a single line', () => {
	let actual = format(`
a {
  background: linear-gradient(
    red,
  10% blue,
20% green,100% yellow);
		color: rgb(
			0,
			0,
			0
		);
}
	`)
	let expected = `a {
	background: linear-gradient(red, 10% blue, 20% green, 100% yellow);
	color: rgb(0, 0, 0);
}`
	expect(actual).toEqual(expected)
})

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
	expect(actual).toEqual(expected)
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
	expect(actual).toEqual(expected)
})

test('formats whitespace around operators (*/+-) correctly in nested parenthesis', () => {
	let actual = format(`a {
	width: calc(((100% - var(--x))/ 12 * 6) + (-1 * var(--y)));
	width: calc(((100% - var(--x))/ 12 * 6) + (-1 * var(--y)));
	width: calc(((100% - var(--x))/ 12 * 6) + (-1 * var(--y)));
	width: calc(((100% - var(--x))/ 12 * 6) + (-1 * var(--y)));
}`)
	let expected = `a {
	width: calc(((100% - var(--x)) / 12 * 6) + (-1 * var(--y)));
	width: calc(((100% - var(--x)) / 12 * 6) + (-1 * var(--y)));
	width: calc(((100% - var(--x)) / 12 * 6) + (-1 * var(--y)));
	width: calc(((100% - var(--x)) / 12 * 6) + (-1 * var(--y)));
}`
	expect(actual).toEqual(expected)
})

test('formats parenthesis correctly', () => {
	let actual = format(`a {
	width: calc(100% - var(--x));
	width: calc((100% - var(--x)));
	width: calc(100% - (var(--x)));
	width: calc((100% - (var(--x))));
}`)
	let expected = `a {
	width: calc(100% - var(--x));
	width: calc((100% - var(--x)));
	width: calc(100% - (var(--x)));
	width: calc((100% - (var(--x))));
}`
	expect(actual).toEqual(expected)
})

test('does not lowercase grid-area names', () => {
	let actual = format(`a { grid-area: emailInputBox; }`)
	let expected = `a {
	grid-area: emailInputBox;
}`
	expect(actual).toEqual(expected)
})

test('does not lowercase custom properties in var()', () => {
	let actual = format(`a { color: var(--MyColor); }`)
	let expected = `a {
	color: var(--MyColor);
}`
	expect(actual).toEqual(expected)
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
	expect(actual).toEqual(expected)
})

test('relative colors', () => {
	let actual = format(`a {
		color: rgb(  from  red 0  0  255);
		color: rgb(  from  rgb( 200  0  0 )  r  r  r  ) ;
		color: hwb( from   var( --base-color  )  h  w  b  /  var( --standard-opacity ) ) ;
		color: lch(from var(--base-color) calc(l + 20) c h);
	}`)
	let expected = `a {
	color: rgb(from red 0 0 255);
	color: rgb(from rgb(200 0 0) r r r);
	color: hwb(from var(--base-color) h w b / var(--standard-opacity));
	color: lch(from var(--base-color) calc(l + 20) c h);
}`
	expect(actual).toEqual(expected)
})

test('does not change casing of `NaN`', () => {
	let actual = format(`a {
		height: calc(1 * NaN);
	}`)
	let expected = `a {
	height: calc(1 * NaN);
}`
	expect(actual).toEqual(expected)
})

test('does not change casing of URLs', () => {
	let actual = format(`a {
		background-image: url("My-Url.png");
	}`)
	let expected = `a {
	background-image: url("My-Url.png");
}`
	expect(actual).toEqual(expected)
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
	expect(actual).toEqual(expected)
})

test('formats unknown content in value', () => {
	let actual = format(`a {
		content: 'Test' counter(page);
	}`)
	let expected = `a {
	content: "Test" counter(page);
}`
	expect(actual).toEqual(expected)
})

test('does not break space toggles', () => {
	let actual = format(`a {
		--ON: initial;
		--OFF: ;
	}`)
	let expected = `a {
	--ON: initial;
	--OFF: ;
}`
	expect(actual).toEqual(expected)
})

test('does not break space toggles (minified)', () => {
	let actual = format(
		`a {
		--ON: initial;
		--OFF: ;
	}`,
		{ minify: true },
	)
	let expected = `a{--ON:initial;--OFF: }`
	expect(actual).toEqual(expected)
})

test('adds quotes around strings in url()', () => {
	let actual = format(`a {
		background-image: url("star.gif");
		list-style-image: url('../images/bullet.jpg');
		content: url("pdficon.jpg");
		cursor: url(mycursor.cur);
		border-image-source: url(/media/diamonds.png);
		src: url('fantasticfont.woff');
		offset-path: url(#path);
		mask-image: url("masks.svg#mask1");
	}`)
	let expected = `a {
	background-image: url("star.gif");
	list-style-image: url("../images/bullet.jpg");
	content: url("pdficon.jpg");
	cursor: url("mycursor.cur");
	border-image-source: url("/media/diamonds.png");
	src: url("fantasticfont.woff");
	offset-path: url("#path");
	mask-image: url("masks.svg#mask1");
}`
	expect(actual).toEqual(expected)
})

test.each([
	`data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 256 256"><g><g><polygon points="79.093,0 48.907,30.187 146.72,128 48.907,225.813 79.093,256 207.093,128"/></g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g></svg>`,
	`data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 24 24"><path fill="rgba(0,0,0,0.5)" d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"></path></svg>`,
])('Does not mess up URLs with inlined SVG', (input) => {
	let actual = format(`test {
		background-image: url('${input}');
		background-image: url(${input});
	}`)
	let expected = `test {
	background-image: url(${input});
	background-image: url(${input});
}`
	expect(actual).toEqual(expected)
})

test.each([
	// Examples from https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Schemes/data
	'data:,Hello%2C%20World%21',
	'data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==',
	'data:text/html,%3Ch1%3EHello%2C%20World%21%3C%2Fh1%3E',
	'data:text/html,%3Cscript%3Ealert%28%27hi%27%29%3B%3C%2Fscript%3E',
	// from https://github.com/projectwallace/format-css/issues/144
	`data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgaGVpZ2h0PSIyNHB4IiB3aWR0aD0iMjRweCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJsaW5lYXItZ3JhZGllbnQiIHgxPSIyMi4zMSIgeTE9IjIzLjYyIiB4Mj0iMy43MyIgeTI9IjMuMDUiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj48c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiNlOTM3MjIiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNmODZmMjUiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48dGl0bGU+TWFnbmlmaWVyPC90aXRsZT48cGF0aCBmaWxsPSJ1cmwoI2xpbmVhci1ncmFkaWVudCkiIGQ9Ik0yMy4zMyAyMC4xbC00LjczLTQuNzRhMTAuMDYgMTAuMDYgMCAxIDAtMy4yMyAzLjIzbDQuNzQgNC43NGEyLjI5IDIuMjkgMCAxIDAgMy4yMi0zLjIzem0tMTcuNDgtNS44NGE1Ljk0IDUuOTQgMCAxIDEgOC40MiAwIDYgNiAwIDAgMS04LjQyIDB6Ii8+PC9zdmc+`,
])('Does not mess up URLs with encoded inlined content: %s', (input) => {
	let actual = format(`test {
		background-image: url(${input});
	}`)
	let expected = `test {
	background-image: url(${input});
}`
	expect(actual).toBe(expected)
})
