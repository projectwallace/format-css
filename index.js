// @ts-expect-error Typing of css-tree is incomplete
import parse from 'css-tree/parser'

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
 * @param {Options} options
 * @returns {string} The formatted CSS
 */
export function format(css, {
	minify = false,
	tab_size = undefined,
} = Object.create(null)) {

	if (tab_size !== undefined && Number(tab_size) < 1) {
		throw new TypeError('tab_size must be a number greater than 0')
	}

	/** @type {number[]} */
	let comments = []

	/** @type {import('css-tree').CssNode} */
	let ast = parse(css, {
		positions: true,
		parseAtrulePrelude: false,
		parseCustomProperty: true,
		parseValue: true,
		onComment: (/** @type {string} */ _, /** @type {import('css-tree').CssLocation} */ position) => {
			comments.push(position.start.offset, position.end.offset)
		}
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
		if (minify) return EMPTY_STRING

		if (tab_size) {
			return SPACE.repeat(tab_size * size)
		}

		return '\t'.repeat(size)
	}

	/** @param {import('css-tree').CssNode} node */
	function substr(node) {
		let loc = node.loc
		// If the node has no location, return an empty string
		// This is necessary for space toggles
		if (!loc) return EMPTY_STRING
		return css.slice(loc.start.offset, loc.end.offset)
	}

	/** @param {import('css-tree').CssNode} node */
	function start_offset(node) {
		let loc = /** @type {import('css-tree').CssLocation} */(node.loc)
		return loc.start.offset
	}

	/** @param {import('css-tree').CssNode} node */
	function end_offset(node) {
		let loc = /** @type {import('css-tree').CssLocation} */(node.loc)
		return loc.end.offset
	}

	/**
	 * Get a comment from the CSS string after the first offset and before the second offset
	 * @param {number | undefined} after After which offset to look for comments
	 * @param {number | undefined} before Before which offset to look for comments
	 * @returns {string[] | undefined} The comment string, if found
	 */
	function print_comment(after, before) {
		if (minify || after === undefined || before === undefined) {
			return undefined
		}

		let buffer = []
		for (let i = 0; i < comments.length; i += 2) {
			// Check that the comment is within the range
			let start = comments[i]
			if (start === undefined || start < after) continue
			let end = comments[i + 1]
			if (end === undefined || end > before) break

			// Special case for comments that follow another comment:
			if (buffer.length > 0) {
				buffer.push(NEWLINE, indent(indent_level))
			}
			buffer.push(css.slice(start, end))
		}
		return buffer
	}

	/** @param {import('css-tree').Rule} node */
	function print_rule(node) {
		/** @type {string[]} */
		let buffer = []
		let prelude = node.prelude
		let block = node.block

		if (prelude.type === TYPE_SELECTORLIST) {
			buffer.push(...print_selectorlist(prelude))
		}

		let comment = print_comment(end_offset(prelude), start_offset(block))
		if (comment) {
			buffer.push(NEWLINE, indent(indent_level))
			buffer.push(...comment)
		}

		if (block.type === TYPE_BLOCK) {
			buffer.push(...print_block(block))
		}

		return buffer
	}

	/** @param {import('css-tree').SelectorList} node */
	function print_selectorlist(node) {
		/** @type {string[]} */
		let buffer = []

		node.children.forEach((selector, item) => {
			if (selector.type === TYPE_SELECTOR) {
				buffer.push(indent(indent_level), ...print_simple_selector(selector))
			}

			if (item.next !== null) {
				buffer.push(COMMA, NEWLINE)
			}

			let end = item.next !== null ? start_offset(item.next.data) : end_offset(node)
			let comment = print_comment(end_offset(selector), end)
			if (comment) {
				buffer.push(indent(indent_level))
				buffer.push(...comment)
				buffer.push(NEWLINE)
			}
		})

		return buffer
	}

	/** @param {import('css-tree').Selector|import('css-tree').PseudoClassSelector|import('css-tree').PseudoElementSelector} node */
	function print_simple_selector(node) {
		/** @type {string[]} */
		let buffer = []
		let children = node.children || []

		children.forEach((child) => {
			switch (child.type) {
				case 'TypeSelector': {
					buffer.push(lowercase(child.name))
					break
				}
				case 'Combinator': {
					// putting spaces around `child.name` (+ > ~ or ' '), unless the combinator is ' '
					buffer.push(SPACE)

					if (child.name !== ' ') {
						buffer.push(child.name, SPACE)
					}
					break
				}
				case 'PseudoClassSelector':
				case 'PseudoElementSelector': {
					buffer.push(COLON)

					// Special case for `:before` and `:after` which were used in CSS2 and are usually minified
					// as `:before` and `:after`, but we want to print them as `::before` and `::after`
					let pseudo = lowercase(child.name)

					if (pseudo === 'before' || pseudo === 'after' || child.type === 'PseudoElementSelector') {
						buffer.push(COLON)
					}

					buffer.push(pseudo)

					if (child.children) {
						buffer.push(OPEN_PARENTHESES)
						buffer.push(...print_simple_selector(child))
						buffer.push(CLOSE_PARENTHESES)
					}
					break
				}
				case TYPE_SELECTORLIST: {
					child.children.forEach((selector_list_item, item) => {
						if (selector_list_item.type === TYPE_SELECTOR) {
							buffer.push(...print_simple_selector(selector_list_item))
						}

						if (item.next && item.next.data.type === TYPE_SELECTOR) {
							buffer.push(COMMA, OPTIONAL_SPACE)
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
								buffer.push(a, 'n')
							}

							if (a !== null && b !== null) {
								buffer.push(SPACE)
							}

							if (b !== null) {
								// When (1n + x) but not (1n - x)
								if (a !== null && !b.startsWith('-')) {
									buffer.push('+', SPACE)
								}

								buffer.push(b)
							}
						} else {
							// For odd/even or maybe other identifiers later on
							buffer.push(substr(nth))
						}
					}

					if (child.selector !== null) {
						// `of .selector`
						buffer.push(SPACE, 'of', SPACE)
						// @ts-expect-error Typing of child.selector is SelectorList, which doesn't seem to be correct
						buffer.push(...print_simple_selector(child.selector))
					}
					break
				}
				case 'AttributeSelector': {
					buffer.push(OPEN_BRACKET)
					buffer.push(child.name.name)

					if (child.matcher && child.value) {
						buffer.push(child.matcher)
						buffer.push(QUOTE)

						if (child.value.type === 'String') {
							buffer.push(child.value.value)
						} else if (child.value.type === 'Identifier') {
							buffer.push(child.value.name)
						}
						buffer.push(QUOTE)
					}

					if (child.flags) {
						buffer.push(SPACE, child.flags)
					}

					buffer.push(CLOSE_BRACKET)
					break
				}
				default: {
					buffer.push(substr(child))
					break
				}
			}
		})

		return buffer
	}

	/** @param {import('css-tree').Block} node */
	function print_block(node) {
		let children = node.children
		let buffer = [OPTIONAL_SPACE]

		if (children.isEmpty) {
			// Check if the block maybe contains comments
			let comment = print_comment(start_offset(node), end_offset(node))
			if (comment) {
				buffer.push(OPEN_BRACE, NEWLINE)
				buffer.push(indent(indent_level + 1))
				buffer.push(...comment)
				buffer.push(NEWLINE, indent(indent_level), CLOSE_BRACE)
				return buffer
			}
			buffer.push(EMPTY_BLOCK)
			return buffer
		}

		buffer.push(OPEN_BRACE, NEWLINE)

		indent_level++

		let opening_comment = print_comment(start_offset(node), start_offset(/** @type {import('css-tree').CssNode} */(children.first)))
		if (opening_comment) {
			buffer.push(indent(indent_level))
			buffer.push(...opening_comment)
			buffer.push(NEWLINE)
		}

		children.forEach((child, item) => {
			if (item.prev !== null) {
				let comment = print_comment(end_offset(item.prev.data), start_offset(child))
				if (comment) {
					buffer.push(indent(indent_level))
					buffer.push(...comment)
					buffer.push(NEWLINE)
				}
			}

			if (child.type === TYPE_DECLARATION) {
				buffer.push(...print_declaration(child))

				if (item.next === null) {
					buffer.push(LAST_SEMICOLON)
				} else {
					buffer.push(SEMICOLON)
				}
			} else {
				if (item.prev !== null && item.prev.data.type === TYPE_DECLARATION) {
					buffer.push(NEWLINE)
				}

				if (child.type === TYPE_RULE) {
					buffer.push(...print_rule(child))
				} else if (child.type === TYPE_ATRULE) {
					buffer.push(...print_atrule(child))
				} else {
					buffer.push(...print_unknown(child, indent_level))
				}
			}

			if (item.next !== null) {
				buffer.push(NEWLINE)

				if (child.type !== TYPE_DECLARATION) {
					buffer.push(NEWLINE)
				}
			}
		})

		let closing_comment = print_comment(end_offset(/** @type {import('css-tree').CssNode} */(children.last)), end_offset(node))
		if (closing_comment) {
			buffer.push(NEWLINE, indent(indent_level))
			buffer.push(...closing_comment)
		}

		indent_level--
		buffer.push(NEWLINE, indent(indent_level), CLOSE_BRACE)

		return buffer
	}

	/** @param {import('css-tree').Atrule} node */
	function print_atrule(node) {
		let prelude = node.prelude
		let block = node.block
		let buffer = [indent(indent_level), '@', lowercase(node.name)]

		// @font-face and anonymous @layer have no prelude
		if (prelude !== null) {
			buffer.push(SPACE, print_prelude(prelude))
		}

		if (block === null) {
			// `@import url(style.css);` has no block, neither does `@layer layer1;`
			buffer.push(SEMICOLON)
		} else if (block.type === TYPE_BLOCK) {
			buffer.push(...print_block(block))
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

	/** @param {import('css-tree').Declaration} node */
	function print_declaration(node) {
		let property = node.property

		// Lowercase the property, unless it's a custom property (starts with --)
		if (!(property.charCodeAt(0) === 45 && property.charCodeAt(1) === 45)) {
			// 45 == '-'
			property = lowercase(property)
		}

		let value = print_value(node.value).join('')

		// Special case for `font` shorthand: remove whitespace around /
		if (property === 'font') {
			value = value.replace(/\s*\/\s*/, '/')
		}

		/** @type {string[]} */
		let buffer = [indent(indent_level), property, COLON, OPTIONAL_SPACE, value]

		// Hacky: add a space in case of a `space toggle` during minification
		if (value === EMPTY_STRING && minify) {
			buffer.push(SPACE)
		}

		if (node.important === true) {
			buffer.push(OPTIONAL_SPACE, '!important')
		} else if (typeof node.important === 'string') {
			buffer.push(OPTIONAL_SPACE, '!', lowercase(node.important))
		}

		return buffer
	}

	/** @param {import('css-tree').List<import('css-tree').CssNode>} children */
	function print_list(children) {
		/** @type {string[]} */
		let buffer = []

		children.forEach((node, item) => {
			if (node.type === 'Identifier') {
				buffer.push(node.name)
			} else if (node.type === 'Function') {
				buffer.push(lowercase(node.name), OPEN_PARENTHESES, ...print_list(node.children), CLOSE_PARENTHESES)
			} else if (node.type === 'Dimension') {
				buffer.push(node.value, lowercase(node.unit))
			} else if (node.type === 'Value') {
				// Values can be inside var() as fallback
				// var(--prop, VALUE)
				buffer.push(...print_value(node))
			} else if (node.type === TYPE_OPERATOR) {
				buffer.push(...print_operator(node))
			} else if (node.type === 'Parentheses') {
				buffer.push(OPEN_PARENTHESES, ...print_list(node.children), CLOSE_PARENTHESES)
			} else if (node.type === 'Url') {
				buffer.push('url(', QUOTE, node.value, QUOTE, CLOSE_PARENTHESES)
			} else {
				buffer.push(substr(node))
			}

			// Add space after the item coming after an operator
			if (node.type !== TYPE_OPERATOR) {
				if (item.next !== null) {
					if (item.next.data.type !== TYPE_OPERATOR) {
						buffer.push(SPACE)
					}
				}
			}
		})

		return buffer
	}

	/** @param {import('css-tree').Operator} node */
	function print_operator(node) {
		/** @type {string[]} */
		let buffer = []
		// https://developer.mozilla.org/en-US/docs/Web/CSS/calc#notes
		// The + and - operators must be surrounded by whitespace
		// Whitespace around other operators is optional

		// Trim the operator because CSSTree adds whitespace around it
		let operator = node.value.trim()
		let code = operator.charCodeAt(0)

		if (code === 43 || code === 45) {
			// + or -
			// Add required space before + and - operators
			buffer.push(SPACE)
		} else if (code !== 44) {
			// ,
			// Add optional space before operator
			buffer.push(OPTIONAL_SPACE)
		}

		// FINALLY, render the operator
		buffer.push(operator)

		if (code === 43 || code === 45) {
			// + or -
			// Add required space after + and - operators
			buffer.push(SPACE)
		} else {
			// Add optional space after other operators (like *, /, and ,)
			buffer.push(OPTIONAL_SPACE)
		}

		return buffer
	}

	/** @param {import('css-tree').Value | import('css-tree').Raw} node */
	function print_value(node) {
		if (node.type === 'Raw') {
			return print_unknown(node, 0)
		}

		return print_list(node.children)
	}

	/**
	 * @param {import('css-tree').CssNode} node
	 * @param {number} indent_level
	 * @returns {string[]} A formatted unknown CSS string
	 */
	function print_unknown(node, indent_level) {
		return [indent(indent_level), substr(node).trim()]
	}

	/** @type {import('css-tree').List<import('css-tree').CssNode>} */
	// @ts-expect-error Property 'children' does not exist on type 'AnPlusB', but we're never using that
	let children = ast.children
	/** @type {string[]} */
	let buffer = []

	if (children.first) {
		let opening_comment = print_comment(0, start_offset(children.first))
		if (opening_comment) {
			buffer.push(...opening_comment, NEWLINE)
		}

		children.forEach((child, item) => {
			if (child.type === TYPE_RULE) {
				buffer.push(...print_rule(child))
			} else if (child.type === TYPE_ATRULE) {
				buffer.push(...print_atrule(child))
			} else {
				buffer.push(...print_unknown(child, indent_level))
			}

			if (item.next !== null) {
				buffer.push(NEWLINE)

				let comment = print_comment(end_offset(child), start_offset(item.next.data))
				if (comment) {
					buffer.push(indent(indent_level), ...comment)
				}

				buffer.push(NEWLINE)
			}
		})

		let closing_comment = print_comment(end_offset(/** @type {import('css-tree').CssNode} */(children.last)), end_offset(ast))
		if (closing_comment) {
			buffer.push(NEWLINE, ...closing_comment)
		}
	} else {
		let comment = print_comment(0, end_offset(ast))
		if (comment) {
			buffer.push(...comment)
		}
	}

	return buffer.join(EMPTY_STRING)
}

/**
 * Minify a string of CSS
 * @param {string} css The original CSS
 * @returns {string} The minified CSS
 */
export function minify(css) {
	return format(css, { minify: true })
}
