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
	content: 'Test';
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
		content: 'Test' : counter(page);
	}`)
	let expected = `a {
	content: 'Test' : counter(page);
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
