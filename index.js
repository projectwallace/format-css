// @ts-expect-error Typing of css-tree is incomplete
import parse from 'css-tree/parser'

const SPACE = ' '
const EMPTY_STRING = ''
const COLON = ':'
const SEMICOLON = ';'
const TYPE_ATRULE = 'Atrule'
const TYPE_RULE = 'Rule'
const TYPE_BLOCK = 'Block'
const TYPE_SELECTORLIST = 'SelectorList'
const TYPE_SELECTOR = 'Selector'
const TYPE_DECLARATION = 'Declaration'
const TYPE_OPERATOR = 'Operator'

// Warning: can be overridden when { minify: true }
let NEWLINE = '\n' // or ''
let TAB = '\t' // or ''
let OPTIONAL_SPACE = ' ' // or ''
let LAST_SEMICOLON = ';'

/**
 * Indent a string
 * @param {number} size
 * @returns A string with {size} tabs
 */
function indent(size) {
	return TAB.repeat(size)
}

/**
 * Check if a string contains uppercase characters
 * @param {string} str
 */
function is_uppercase(str) {
	return /[A-Z]/.test(str)
}

/** @param {string} str */
function lowercase(str) {
	if (is_uppercase(str)) {
		return str.toLowerCase()
	}
	return str
}

/**
 * @param {import('css-tree').CssNode} node
 * @param {string} css
 * @returns A portion of the CSS
 */
function substr(node, css) {
	let loc = node.loc
	if (!loc) return EMPTY_STRING

	let start = loc.start
	let end = loc.end
	return css.slice(start.offset, end.offset)
}

/**
 * @param {import('css-tree').CssNode} node
 * @param {string} css
 * @returns A portion of the CSS
 */
function substr_raw(node, css) {
	let loc = node.loc
	if (!loc) return EMPTY_STRING
	return css.slice(loc.start.offset, loc.end.offset)
}

/**
 * @param {import('css-tree').Rule} node
 * @param {string} css
 * @param {number} indent_level
 * @returns {string} A formatted Rule
 */
function print_rule(node, css, indent_level) {
	let buffer
	let prelude = node.prelude
	let block = node.block

	if (prelude.type === TYPE_SELECTORLIST) {
		buffer = print_selectorlist(prelude, css, indent_level)
	} else {
		// In case parsing the selector list fails we'll print it as-is
		buffer = print_unknown(prelude, css, indent_level)
	}

	if (block.type === TYPE_BLOCK) {
		buffer += print_block(block, css, indent_level)
	}

	return buffer
}

/**
 * @param {import('css-tree').SelectorList} node
 * @param {string} css
 * @param {number} indent_level
 * @returns {string} A formatted SelectorList
 */
function print_selectorlist(node, css, indent_level) {
	let buffer = EMPTY_STRING
	let children = node.children

	children.forEach((selector, item) => {
		if (selector.type === TYPE_SELECTOR) {
			buffer += print_selector(selector, css, indent_level)
		}

		if (item.next !== null) {
			buffer += `,` + NEWLINE
		}
	})

	return buffer
}

/**
 * @param {import('css-tree').Selector|import('css-tree').PseudoClassSelector} node
 * @param {string} css
 */
function print_simple_selector(node, css) {
	let buffer = EMPTY_STRING
	let children = node.children || []

	children.forEach((child) => {
		switch (child.type) {
			case 'Combinator': {
				// putting spaces around `child.name` (+ > ~ or ' '), unless the combinator is ' '
				buffer += SPACE

				if (child.name !== ' ') {
					buffer += child.name + SPACE
				}
				break
			}
			case 'PseudoElementSelector': {
				buffer += COLON + COLON
				buffer += lowercase(child.name)
				break
			}
			case 'PseudoClassSelector': {
				buffer += COLON

				// Special case for `:before` and `:after` which were used in CSS2 and are usually minified
				// as `:before` and `:after`, but we want to keep them as `::before` and `::after`
				let pseudo = lowercase(child.name)

				if (pseudo === 'before' || pseudo === 'after') {
					buffer += COLON
				}

				buffer += pseudo

				if (child.children) {
					buffer += '(' + print_simple_selector(child, css) + ')'
				}
				break
			}
			case TYPE_SELECTORLIST: {
				child.children.forEach((grandchild, item) => {
					if (grandchild.type === TYPE_SELECTOR) {
						buffer += print_simple_selector(grandchild, css)
					}

					if (item.next) {
						buffer += ',' + SPACE
					}
				})
				break
			}
			case 'Nth': {
				let nth = child.nth
				if (nth) {
					if (nth.type === 'AnPlusB') {
						let a = nth.a
						let b = nth.b

						if (a !== null) {
							buffer += a + 'n'
						}

						if (a !== null && b !== null) {
							buffer += SPACE
						}

						if (b !== null) {
							// When (1n + x) but not (1n - x)
							if (a !== null && !b.startsWith('-')) {
								buffer += '+' + SPACE
							}

							buffer += b
						}
					} else {
						// For odd/even or maybe other identifiers later on
						buffer += substr(nth, css)
					}
				}

				if (child.selector !== null) {
					// `of .selector`
					// @ts-expect-error Typing of child.selector is SelectorList, which doesn't seem to be correct
					buffer += SPACE + 'of' + SPACE + print_simple_selector(child.selector, css)
				}
				break
			}
			default: {
				buffer += substr(child, css)
				break
			}
		}
	})

	return buffer
}

/**
 * @param {import('css-tree').Selector} node
 * @param {string} css
 * @param {number} indent_level
 * @returns {string} A formatted Selector
 */
function print_selector(node, css, indent_level) {
	return indent(indent_level) + print_simple_selector(node, css)
}

/**
 * @param {import('css-tree').Block} node
 * @param {string} css
 * @param {number} indent_level
 * @returns {string} A formatted Block
 */
function print_block(node, css, indent_level) {
	let children = node.children
	let buffer = OPTIONAL_SPACE

	if (children.isEmpty) {
		return buffer + '{}'
	}

	buffer += '{' + NEWLINE

	indent_level++

	children.forEach((child, item) => {
		if (child.type === TYPE_DECLARATION) {
			buffer += print_declaration(child, css, indent_level)

			if (item.next === null) {
				buffer += LAST_SEMICOLON
			} else {
				buffer += SEMICOLON
			}
		} else {
			if (item.prev !== null && item.prev.data.type === TYPE_DECLARATION) {
				buffer += NEWLINE
			}

			if (child.type === TYPE_RULE) {
				buffer += print_rule(child, css, indent_level)
			} else if (child.type === TYPE_ATRULE) {
				buffer += print_atrule(child, css, indent_level)
			} else {
				buffer += print_unknown(child, css, indent_level)
			}
		}

		if (item.next !== null) {
			buffer += NEWLINE

			if (child.type !== TYPE_DECLARATION) {
				buffer += NEWLINE
			}
		}
	})

	indent_level--

	buffer += NEWLINE
	buffer += indent(indent_level) + '}'

	return buffer
}

/**
 * @param {import('css-tree').Atrule} node
 * @param {string} css
 * @param {number} indent_level
 * @returns {string} A formatted Atrule
 */
function print_atrule(node, css, indent_level) {
	let buffer = indent(indent_level) + '@'
	let prelude = node.prelude
	let block = node.block
	buffer += lowercase(node.name)

	// @font-face has no prelude
	if (prelude !== null) {
		buffer += SPACE + print_prelude(prelude, css)
	}

	if (block === null) {
		// `@import url(style.css);` has no block, neither does `@layer layer1;`
		buffer += SEMICOLON
	} else if (block.type === TYPE_BLOCK) {
		buffer += print_block(block, css, indent_level)
	}

	return buffer
}

/**
 * Pretty-printing atrule preludes takes an insane amount of rules,
 * so we're opting for a couple of 'good-enough' string replacements
 * here to force some nice formatting.
 * Should be OK perf-wise, since the amount of atrules in most
 * stylesheets are limited, so this won't be called too often.
 * @param {import('css-tree').AtrulePrelude | import('css-tree').Raw} node
 * @param {string} css
 */
function print_prelude(node, css) {
	let buffer = substr(node, css)

	return buffer
		.replace(/\s*([:,])/g, buffer.includes('selector(') ? '$1' : '$1 ') // force whitespace after colon or comma, except inside `selector()`
		.replace(/\s*(=>|<=)\s*/g, ' $1 ') // force whitespace around => and <=
		.replace(/\)([a-zA-Z])/g, ') $1') // force whitespace between closing parenthesis and following text (usually and|or)
		.replace(/(?<!<=)(?<!=>)(?<!<= )([<>])(?![<= ])(?![=> ])(?![ =>])/g, ' $1 ')
		.replace(/\s+/g, SPACE) // collapse multiple whitespaces into one
}

/**
 * @param {import('css-tree').Declaration} node
 * @param {string} css
 * @param {number} indent_level
 * @returns {string} A formatted Declaration
 */
function print_declaration(node, css, indent_level) {
	let property = node.property

	// Lowercase the property, unless it's a custom property (starts with --)
	if (!(property.charCodeAt(0) === 45 && property.charCodeAt(1) === 45)) { // 45 == '-'
		property = lowercase(property)
	}

	let value = print_value(node.value, css)

	// Special case for `font` shorthand: remove whitespace around /
	if (property === 'font') {
		value = value.replace(/\s*\/\s*/, '/')
	}

	// Hacky: add a space in case of a `space toggle` during minification
	if (value === EMPTY_STRING && OPTIONAL_SPACE === EMPTY_STRING) {
		value += SPACE
	}

	return indent(indent_level) + property + COLON + OPTIONAL_SPACE + value
}

/**
 * @param {import('css-tree').List<import('css-tree').CssNode>} children
 * @param {string} css
 */
function print_list(children, css) {
	let buffer = EMPTY_STRING

	children.forEach((node, item) => {
		if (node.type === 'Identifier') {
			buffer += node.name
		} else if (node.type === 'Function') {
			buffer += print_function(node, css)
		} else if (node.type === 'Dimension') {
			buffer += print_dimension(node)
		} else if (node.type === 'Value') {
			// Values can be inside var() as fallback
			// var(--prop, VALUE)
			buffer += print_value(node, css)
		} else if (node.type === TYPE_OPERATOR) {
			buffer += print_operator(node)
		} else if (node.type === 'Parentheses') {
			buffer += '(' + print_list(node.children, css) + ')'
		} else {
			buffer += substr(node, css)
		}

		// Add space after the item coming after an operator
		if (node.type !== TYPE_OPERATOR) {
			if (item.next !== null) {
				if (item.next.data.type !== TYPE_OPERATOR) {
					buffer += SPACE
				}
			}
		}
	})

	return buffer
}

/**
 * @param {import('css-tree').Operator} node
 * @returns {string} A formatted Operator
 */
function print_operator(node) {
	let buffer = EMPTY_STRING
	// https://developer.mozilla.org/en-US/docs/Web/CSS/calc#notes
	// The + and - operators must be surrounded by whitespace
	// Whitespace around other operators is optional

	// Trim the operator because CSSTree adds whitespace around it
	let operator = node.value.trim()
	let code = operator.charCodeAt(0)

	if (code === 43 || code === 45) { // + or -
		// Add required space before + and - operators
		buffer += SPACE
	} else if (code !== 44) { // ,
		// Add optional space before operator
		buffer += OPTIONAL_SPACE
	}

	// FINALLY, render the operator
	buffer += operator

	if (code === 43 || code === 45) { // + or -
		// Add required space after + and - operators
		buffer += SPACE
	} else {
		// Add optional space after other operators (like *, /, and ,)
		buffer += OPTIONAL_SPACE
	}

	return buffer
}

/** @param {import('css-tree').Dimension} node */
function print_dimension(node) {
	return node.value + lowercase(node.unit)
}

/**
 * @param {import('css-tree').Value | import('css-tree').Raw} node
 * @param {string} css
 */
function print_value(node, css) {
	if (node.type === 'Raw') {
		return print_unknown(node, css, 0)
	}

	return print_list(node.children, css)
}

/**
 * @param {import('css-tree').FunctionNode} node
 * @param {string} css
 */
function print_function(node, css) {
	return lowercase(node.name) + '(' + print_list(node.children, css) + ')'
}

/**
 * @param {import('css-tree').CssNode} node
 * @param {string} css
 * @param {number} indent_level
 * @returns {string} A formatted unknown CSS string
 */
function print_unknown(node, css, indent_level) {
	return indent(indent_level) + substr_raw(node, css).trim()
}

/**
 * @param {import('css-tree').CssNode} node
 * @param {string} css
 * @param {number} [indent_level=0]
 * @returns {string} A formatted Stylesheet
 */
function print(node, css, indent_level = 0) {
	let buffer = EMPTY_STRING

	/** @type {import('css-tree').List<import('css-tree').CssNode>} */
	// @ts-expect-error Property 'children' does not exist on type 'AnPlusB', but we're never using that
	let children = node.children

	children.forEach((child, item) => {
		if (child.type === TYPE_RULE) {
			buffer += print_rule(child, css, indent_level)
		} else if (child.type === TYPE_ATRULE) {
			buffer += print_atrule(child, css, indent_level)
		} else {
			buffer += print_unknown(child, css, indent_level)
		}

		if (item.next !== null) {
			buffer += NEWLINE + NEWLINE
		}
	})

	return buffer
}

/**
 * @typedef {Object} Options
 * @property {boolean} [minify] Whether to minify the CSS or keep it formatted
 *
 * Format a string of CSS using some simple rules
 * @param {string} css The original CSS
 * @param {Options} options
 * @returns {string} The formatted CSS
 */
export function format(css, { minify = false } = {}) {
	/** @type {import('css-tree').CssNode} */
	let ast = parse(css, {
		positions: true,
		parseAtrulePrelude: false,
		parseCustomProperty: true,
		parseValue: true,
	})

	TAB = minify ? EMPTY_STRING : '\t'
	NEWLINE = minify ? EMPTY_STRING : '\n'
	OPTIONAL_SPACE = minify ? EMPTY_STRING : SPACE
	LAST_SEMICOLON = minify ? EMPTY_STRING : SEMICOLON

	return print(ast, css, 0)
}

/**
 * Minify a string of CSS
 * @param {string} css The original CSS
 * @returns {string} The minified CSS
 */
export function minify(css) {
	return format(css, { minify: true })
}
