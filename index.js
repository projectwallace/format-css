// @ts-expect-error Typing of css-tree is incomplete
import parse from 'css-tree/parser'

/**
 * @typedef {import('css-tree').CssNode} CssNode
 * @typedef {import('css-tree').List<CssNode>} List
 * @typedef {import('css-tree').CssLocation} CssLocation
 * @typedef {import('css-tree').Raw} Raw
 * @typedef {import('css-tree').StyleSheet} StyleSheet
 * @typedef {import('css-tree').Atrule} Atrule
 * @typedef {import('css-tree').AtrulePrelude} AtrulePrelude
 * @typedef {import('css-tree').Rule} Rule
 * @typedef {import('css-tree').SelectorList} SelectorList
 * @typedef {import('css-tree').Selector} Selector
 * @typedef {import('css-tree').PseudoClassSelector} PseudoClassSelector
 * @typedef {import('css-tree').PseudoElementSelector} PseudoElementSelector
 * @typedef {import('css-tree').Block} Block
 * @typedef {import('css-tree').Declaration} Declaration
 * @typedef {import('css-tree').Value} Value
 * @typedef {import('css-tree').Operator} Operator
 */

const SPACE = ' '
const EMPTY_STRING = ''
const COLON = ':'
const SEMICOLON = ';'
const QUOTE = '"'
const OPEN_PARENTHESES = '('
const CLOSE_PARENTHESES = ')'
const OPEN_BRACKET = '['
const CLOSE_BRACKET = ']'
const OPEN_BRACE = '{'
const CLOSE_BRACE = '}'
const EMPTY_BLOCK = '{}'
const COMMA = ','
const TYPE_ATRULE = 'Atrule'
const TYPE_RULE = 'Rule'
const TYPE_BLOCK = 'Block'
const TYPE_SELECTORLIST = 'SelectorList'
const TYPE_SELECTOR = 'Selector'
const TYPE_PSEUDO_ELEMENT_SELECTOR = 'PseudoElementSelector'
const TYPE_DECLARATION = 'Declaration'
const TYPE_OPERATOR = 'Operator'

/** @param {string} str */
function lowercase(str) {
	// Only create new strings in memory if we need to
	if (/[A-Z]/.test(str)) {
		return str.toLowerCase()
	}
	return str
}

/**
 * @typedef {Object} Options
 * @property {boolean} [minify] Whether to minify the CSS or keep it formatted
 * @property {number} [tab_size] Tell the formatter to use N spaces instead of tabs
 *
 * Format a string of CSS using some simple rules
 * @param {string} css The original CSS
 * @param {Options} [options]
 * @returns {string} The formatted CSS
 */
export function format(css, {
	minify = false,
	tab_size = undefined,
} = Object.create(null)) {

	if (tab_size !== undefined && Number(tab_size) < 1) {
		throw new TypeError('tab_size must be a number greater than 0')
	}

	/** @type {StyleSheet} */
	let ast = parse(css, {
		positions: true,
		parseAtrulePrelude: false,
		parseCustomProperty: true,
		parseValue: true,
	})

	const NEWLINE = minify ? EMPTY_STRING : '\n'
	const OPTIONAL_SPACE = minify ? EMPTY_STRING : SPACE
	const LAST_SEMICOLON = minify ? EMPTY_STRING : SEMICOLON

	let indent_level = 0

	/**
	 * Indent a string
	 * @param {number} size
	 * @returns {string} A string with [size] tabs/spaces
	 */
	function indent(size) {
		if (minify === true) return EMPTY_STRING

		if (tab_size !== undefined) {
			return SPACE.repeat(tab_size * size)
		}

		return '\t'.repeat(size)
	}

	/** @param {CssNode} node */
	function substr(node) {
		let loc = node.loc
		// If the node has no location, return an empty string
		// This is necessary for space toggles
		if (loc === undefined || loc === null) return EMPTY_STRING
		return css.slice(loc.start.offset, loc.end.offset)
	}

	/** @param {Rule} node */
	function print_rule(node) {
		let buffer
		let prelude = node.prelude
		let block = node.block

		if (prelude.type === TYPE_SELECTORLIST) {
			buffer = print_selectorlist(prelude)
		}

		if (block.type === TYPE_BLOCK) {
			buffer += print_block(block)
		}

		return buffer
	}

	/** @param {SelectorList} node */
	function print_selectorlist(node) {
		let buffer = EMPTY_STRING

		node.children.forEach((selector, item) => {
			if (selector.type === TYPE_SELECTOR) {
				buffer += indent(indent_level) + print_simple_selector(selector)
			}

			if (item.next !== null) {
				buffer += COMMA + NEWLINE
			}
		})

		return buffer
	}

	/** @param {Selector | PseudoClassSelector | PseudoElementSelector} node */
	function print_simple_selector(node) {
		let buffer = EMPTY_STRING
		let children = node.children || []

		children.forEach((child) => {
			switch (child.type) {
				case 'TypeSelector': {
					buffer += lowercase(child.name)
					break
				}
				case 'Combinator': {
					// putting spaces around `child.name` (+ > ~ or ' '), unless the combinator is ' '
					buffer += SPACE

					if (child.name !== ' ') {
						buffer += child.name + SPACE
					}
					break
				}
				case 'PseudoClassSelector':
				case TYPE_PSEUDO_ELEMENT_SELECTOR: {
					buffer += COLON

					// Special case for `:before` and `:after` which were used in CSS2 and are usually minified
					// as `:before` and `:after`, but we want to print them as `::before` and `::after`
					let pseudo = lowercase(child.name)

					if (pseudo === 'before' || pseudo === 'after' || child.type === TYPE_PSEUDO_ELEMENT_SELECTOR) {
						buffer += COLON
					}

					buffer += pseudo

					if (child.children !== null) {
						buffer += OPEN_PARENTHESES + print_simple_selector(child) + CLOSE_PARENTHESES
					}
					break
				}
				case TYPE_SELECTORLIST: {
					child.children.forEach((selector_list_item, item) => {
						if (selector_list_item.type === TYPE_SELECTOR) {
							buffer += print_simple_selector(selector_list_item)
						}

						if (item.next !== null && item.next.data.type === TYPE_SELECTOR) {
							buffer += COMMA + OPTIONAL_SPACE
						}
					})
					break
				}
				case 'Nth': {
					let nth = child.nth
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
						buffer += substr(nth)
					}

					if (child.selector !== null) {
						// `of .selector`
						// @ts-expect-error Typing of child.selector is SelectorList, which doesn't seem to be correct
						buffer += SPACE + 'of' + SPACE + print_simple_selector(child.selector)
					}
					break
				}
				case 'AttributeSelector': {
					buffer += OPEN_BRACKET
					buffer += child.name.name

					if (child.matcher !== null && child.value !== null) {
						buffer += child.matcher
						buffer += QUOTE

						if (child.value.type === 'String') {
							buffer += child.value.value
						} else if (child.value.type === 'Identifier') {
							buffer += child.value.name
						}
						buffer += QUOTE
					}

					if (child.flags !== null) {
						buffer += SPACE + child.flags
					}

					buffer += CLOSE_BRACKET
					break
				}
				case 'NestingSelector': {
					buffer += '&'
					break
				}
				default: {
					buffer += substr(child)
					break
				}
			}
		})

		return buffer
	}

	/** @param {Block} node */
	function print_block(node) {
		let children = node.children
		let buffer = OPTIONAL_SPACE

		if (children.isEmpty) {
			return buffer + EMPTY_BLOCK
		}

		buffer += OPEN_BRACE + NEWLINE

		indent_level++

		children.forEach((child, item) => {
			if (child.type === TYPE_DECLARATION) {
				buffer += print_declaration(child)

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
					buffer += print_rule(child)
				} else if (child.type === TYPE_ATRULE) {
					buffer += print_atrule(child)
				} else {
					buffer += print_unknown(child, indent_level)
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
		buffer += NEWLINE + indent(indent_level) + CLOSE_BRACE

		return buffer
	}

	/** @param {Atrule} node */
	function print_atrule(node) {
		let buffer = indent(indent_level) + '@'
		let prelude = node.prelude
		let block = node.block
		buffer += lowercase(node.name)

		// @font-face and anonymous @layer have no prelude
		if (prelude !== null) {
			buffer += SPACE + print_prelude(prelude)
		}

		if (block === null) {
			// `@import url(style.css);` has no block, neither does `@layer layer1;`
			buffer += SEMICOLON
		} else if (block.type === TYPE_BLOCK) {
			buffer += print_block(block)
		}

		return buffer
	}

	/**
	 * Pretty-printing atrule preludes takes an insane amount of rules,
	 * so we're opting for a couple of 'good-enough' string replacements
	 * here to force some nice formatting.
	 * Should be OK perf-wise, since the amount of atrules in most
	 * stylesheets are limited, so this won't be called too often.
	 * @param {AtrulePrelude | Raw} node
	 */
	function print_prelude(node) {
		let buffer = substr(node)

		return buffer
			.replace(/\s*([:,])/g, buffer.toLowerCase().includes('selector(') ? '$1' : '$1 ') // force whitespace after colon or comma, except inside `selector()`
			.replace(/\)([a-zA-Z])/g, ') $1') // force whitespace between closing parenthesis and following text (usually and|or)
			.replace(/\s*(=>|<=)\s*/g, ' $1 ') // force whitespace around => and <=
			.replace(/([^<>=\s])([<>])([^<>=\s])/g, `$1${OPTIONAL_SPACE}$2${OPTIONAL_SPACE}$3`) // add spacing around < or > except when it's part of <=, >=, =>
			.replace(/\s+/g, OPTIONAL_SPACE) // collapse multiple whitespaces into one
			.replace(/calc\(\s*([^()+\-*/]+)\s*([*/+-])\s*([^()+\-*/]+)\s*\)/g, (_, left, operator, right) => {
				// force required or optional whitespace around * and / in calc()
				let space = operator === '+' || operator === '-' ? SPACE : OPTIONAL_SPACE
				return `calc(${left.trim()}${space}${operator}${space}${right.trim()})`
			})
			.replace(/selector|url|supports|layer\(/ig, (match) => lowercase(match)) // lowercase function names
	}

	/** @param {Declaration} node */
	function print_declaration(node) {
		let property = node.property

		// Lowercase the property, unless it's a custom property (starts with --)
		if (!(property.charCodeAt(0) === 45 && property.charCodeAt(1) === 45)) {
			// 45 == '-'
			property = lowercase(property)
		}

		let value = print_value(node.value)

		// Special case for `font` shorthand: remove whitespace around /
		if (property === 'font') {
			value = value.replace(/\s*\/\s*/, '/')
		}

		// Hacky: add a space in case of a `space toggle` during minification
		if (value === EMPTY_STRING && minify === true) {
			value += SPACE
		}

		if (node.important === true) {
			value += OPTIONAL_SPACE + '!important'
		} else if (typeof node.important === 'string') {
			value += OPTIONAL_SPACE + '!' + lowercase(node.important)
		}

		return indent(indent_level) + property + COLON + OPTIONAL_SPACE + value
	}

	/** @param {List} children */
	function print_list(children) {
		let buffer = EMPTY_STRING

		children.forEach((node, item) => {
			if (node.type === 'Identifier') {
				buffer += node.name
			} else if (node.type === 'Function') {
				buffer += lowercase(node.name) + OPEN_PARENTHESES + print_list(node.children) + CLOSE_PARENTHESES
			} else if (node.type === 'Dimension') {
				buffer += node.value + lowercase(node.unit)
			} else if (node.type === 'Value') {
				// Values can be inside var() as fallback
				// var(--prop, VALUE)
				buffer += print_value(node)
			} else if (node.type === TYPE_OPERATOR) {
				buffer += print_operator(node)
			} else if (node.type === 'Parentheses') {
				buffer += OPEN_PARENTHESES + print_list(node.children) + CLOSE_PARENTHESES
			} else if (node.type === 'Url') {
				buffer += 'url(' + QUOTE + node.value + QUOTE + CLOSE_PARENTHESES
			} else {
				buffer += substr(node)
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

	/** @param {Operator} node */
	function print_operator(node) {
		let buffer = EMPTY_STRING
		// https://developer.mozilla.org/en-US/docs/Web/CSS/calc#notes
		// The + and - operators must be surrounded by whitespace
		// Whitespace around other operators is optional

		// Trim the operator because CSSTree adds whitespace around it
		let operator = node.value.trim()
		let code = operator.charCodeAt(0)

		if (code === 43 || code === 45) {
			// + or -
			// Add required space before + and - operators
			buffer += SPACE
		} else if (code !== 44) {
			// ,
			// Add optional space before operator
			buffer += OPTIONAL_SPACE
		}

		// FINALLY, render the operator
		buffer += operator

		if (code === 43 || code === 45) {
			// + or -
			// Add required space after + and - operators
			buffer += SPACE
		} else {
			// Add optional space after other operators (like *, /, and ,)
			buffer += OPTIONAL_SPACE
		}

		return buffer
	}

	/** @param {Value | Raw} node */
	function print_value(node) {
		if (node.type === 'Raw') {
			return print_unknown(node, 0)
		}

		return print_list(node.children)
	}

	/**
	 * @param {CssNode} node
	 * @param {number} indent_level
	 * @returns {string} A formatted unknown CSS string
	 */
	function print_unknown(node, indent_level) {
		return indent(indent_level) + substr(node).trim()
	}

	let children = ast.children
	let buffer = EMPTY_STRING

	if (children.first !== null) {
		children.forEach((child, item) => {
			if (child.type === TYPE_RULE) {
				buffer += print_rule(child)
			} else if (child.type === TYPE_ATRULE) {
				buffer += print_atrule(child)
			} else {
				buffer += print_unknown(child, indent_level)
			}

			if (item.next !== null) {
				buffer += NEWLINE
				buffer += NEWLINE
			}
		})
	}

	return buffer
}

/**
 * Minify a string of CSS
 * @param {string} css The original CSS
 * @returns {string} The minified CSS
 */
export function minify(css) {
	return format(css, { minify: true })
}
