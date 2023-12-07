# format-css

Fast, small, zero-config library to format CSS with basic [rules](#formatting-rules). The design goal is to format CSS in a way that makes it easy to inspect. Bundle size and runtime speed are more important than versatility and extensibility.

## Example output

![Example input-output of this formatter](https://github.com/projectwallace/format-css/assets/1536852/ce160fd3-fa11-4d90-9432-22567ee1d851)

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

## Acknowledgements

- Thanks to [CSSTree](https://github.com/csstree/csstree) for providing the necessary parser and the interfaces for our CSS Types (the **bold** elements in the list above)

## Related projects

- [Format CSS online](https://www.projectwallace.com/prettify-css?utm_source=github&utm_medium=wallace_format_css_related_projects) - See this minifier in action online!
- [CSS Analyzer](https://github.com/projectwallace/css-analyzer) - The best CSS analyzer that powers all analysis on [projectwallace.com](https://www.projectwallace.com?utm_source=github&utm_medium=wallace_format_css_related_projects)
- [Minify CSS](https://github.com/projectwallace/minify-css) The exact opposite of this library: fast, small, zero-config CSS minifier.
