# format-css

Fast, small, zero-config library to format CSS with basic [rules](#formatting-rules). The design goal is to format CSS in a way that makes it easy to inspect. Bundle size and runtime speed are more important than versatility and extensibility.

## Example output

<!-- prettier-ignore -->
```css
/* TURN THIS: */

@layer base.normalize{@media (dynamic-range:high) or (color-gamut:p3){@supports (color:color(display-p3 0 0 0)){:where(html){--link:color(display-p3 .1 .4 1);--link-visited:color(display-p3 .6 .2 1)}}}}@layer base.normalize{:where(html) :where(dialog){background-color:var(--surface-1)}}

/* INTO THIS: */

@layer base.normalize {
	@media (dynamic-range: high) or (color-gamut: p3) {
		@supports (color: color(display-p3 0 0 0)) {
			:where(html) {
				--link: color(display-p3 .1 .4 1);
				--link-visited: color(display-p3 .6 .2 1);
			}
		}
	}
}

@layer base.normalize {
	:where(html) :where(dialog) {
		background-color: var(--surface-1);
	}
}

/* AND BACK AGAIN! */
```

## Installation

```
npm install @projectwallace/format-css
```

## Usage

```js
import { format } from "@projectwallace/format-css";

let old_css = "/* Your old CSS here */";
let new_css = format(old_css);
```

Need more examples?

- [StackBlitz example using CommonJS](https://stackblitz.com/edit/stackblitz-starters-phchci?file=index.js)
- [StackBlitz example using ES Modules](https://stackblitz.com/edit/stackblitz-starters-hrhsed?file=index.js)

## Formatting rules

1. Every **AtRule** starts on a new line
1. Every **Rule** starts on a new line
1. Every **Selector** starts on a new line
1. A comma is placed after every **Selector** that’s not the last in the **SelectorList**
1. Every **Block** is indented with 1 tab more than the previous indentation level
1. Every **Declaration** starts on a new line
1. Every **Declaration** ends with a semicolon (;)
1. An empty line is placed after a **Block** unless it’s the last in the surrounding **Block**
1. Multiline tokens like **Selectors, Values, etc.** are rendered on a single line
1. Unknown syntax is rendered as-is, with multi-line formatting kept intact

## Minify CSS

This package also exposes a minifier function since minifying CSS follows many of the same rules as formatting.

```js
import { format, minify } from "@projectwallace/format-css";

let minified = minify("a {}");

// which is an alias for

let formatted_mini = format("a {}", { minify: true });
```

## Acknowledgements

- Thanks to [CSSTree](https://github.com/csstree/csstree) for providing the necessary parser and the interfaces for our CSS Types (the **bold** elements in the list above)

## Related projects

- [Format CSS online](https://www.projectwallace.com/prettify-css?utm_source=github&utm_medium=wallace_format_css_related_projects) - See this formatter in action online!
- [Minify CSS online](https://www.projectwallace.com/minify-css?utm_source=github&utm_medium=wallace_format_css_related_projects) - See this minifier in action online!
- [CSS Analyzer](https://github.com/projectwallace/css-analyzer) - The best CSS analyzer that powers all analysis on [projectwallace.com](https://www.projectwallace.com?utm_source=github&utm_medium=wallace_format_css_related_projects)
