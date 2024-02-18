// @ts-expect-error Typing of css-tree is incomplete
import parse from 'css-tree/parser'

// Warning: can be overridden when { minify: true }
let NEWLINE = '\n' // or ''
let TAB = '\t' // or ''
let SPACE = ' ' // or ''

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
	for (let char of str) {
		let code = char.charCodeAt(0)
		if (code >= 65 && code <= 90) {
			return true
		}
	}
	return false
}

/**
 * @param {import('css-tree').CssNode} node
 * @param {string} css
 * @returns A portion of the CSS
 */
function substr(node, css) {
	let loc = node.loc

	if (!loc) return ''

	let start = loc.start
	let end = loc.end
	let str = css.substring(start.offset, end.offset)

	// Single-line node, most common case
	if (start.line === end.line) {
		return str
	}

	// Multi-line nodes, less common
	return str.replace(/\s+/g, ' ')
}

/**
 * @param {import('css-tree').CssNode} node
 * @param {string} css
 * @returns A portion of the CSS
 */
function substr_raw(node, css) {
	let loc = node.loc
	if (!loc) return ''
	return css.substring(loc.start.offset, loc.end.offset)
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

	if (prelude !== undefined && prelude.type === 'SelectorList') {
		buffer = print_selectorlist(prelude, css, indent_level)
	} else {
		buffer = print_unknown(prelude, css, indent_level)
	}

	if (block !== null && block.type === 'Block') {
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
	let buffer = ''
	let children = node.children

	for (let selector of children) {
		if (selector.type === 'Selector') {
			buffer += print_selector(selector, css, indent_level)
		} else {
			buffer += print_unknown(selector, css, indent_level)
		}

		if (selector !== children.last) {
			buffer += `,` + NEWLINE
		}
	}
	return buffer
}

/**
 * @param {import('css-tree').Selector|import('css-tree').PseudoClassSelector} node
 * @param {string} css
 */
function print_simple_selector(node, css) {
	let buffer = ''

	if (node.children) {
		for (let child of node.children) {
			switch (child.type) {
				case 'Combinator': {
					// putting spaces around `child.name`, unless the combinator is ' '
					buffer += ' '
					if (child.name !== ' ') {
						buffer += child.name + ' '
					}
					break
				}
				case 'PseudoClassSelector': {
					buffer += ':' + child.name

					if (child.children) {
						buffer += '(' + print_simple_selector(child, css) + ')'
					}
					break
				}
				case 'SelectorList': {
					for (let grandchild of child.children) {
						if (grandchild.type === 'Selector') {
							buffer += print_simple_selector(grandchild, css)
						}

						if (grandchild !== child.children.last) {
							buffer += ', '
						}
					}
					break
				}
				case 'Nth': {
					if (child.nth) {
						if (child.nth.type === 'AnPlusB') {
							let a = child.nth.a
							let b = child.nth.b

							if (a !== null) {
								buffer += a + 'n'
							}

							if (a !== null && b !== null) {
								buffer += ' '
							}

							if (b !== null) {
								// When (1n + x) but not (1n - x)
								if (a !== null && !b.startsWith('-')) {
									buffer += '+ '
								}

								buffer += b
							}
						} else {
							// For odd/even or maybe other identifiers later on
							buffer += substr(child.nth, css)
						}
					}

					if (child.selector !== null) {
						// `of .selector`
						// @ts-expect-error Typing of child.selector is SelectorList, which doesn't seem to be correct
						buffer += ' of ' + print_simple_selector(child.selector, css)
					}
					break
				}
				default: {
					buffer += substr(child, css)
					break
				}
			}
		}
	}

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
	let buffer = SPACE

	if (children.isEmpty) {
		return buffer + '{}'
	}

	buffer += '{' + NEWLINE

	indent_level++

	let prev_type

	for (let child of children) {
		if (child.type === 'Declaration') {
			buffer += print_declaration(child, css, indent_level) + ';'
		} else {
			if (prev_type === 'Declaration') {
				buffer += NEWLINE
			}

			if (child.type === 'Rule') {
				buffer += print_rule(child, css, indent_level)
			} else if (child.type === 'Atrule') {
				buffer += print_atrule(child, css, indent_level)
			} else {
				buffer += print_unknown(child, css, indent_level)
			}
		}

		if (child !== children.last) {
			buffer += NEWLINE

			if (child.type !== 'Declaration') {
				buffer += NEWLINE
			}
		}

		prev_type = child.type
	}

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
	let name = node.name
	let prelude = node.prelude
	let block = node.block
	buffer += is_uppercase(name) ? name.toLowerCase() : name

	// @font-face has no prelude
	if (prelude !== null) {
		buffer += ' ' + print_prelude(prelude, css)
	}

	if (block === null) {
		// `@import url(style.css);` has no block, neither does `@layer layer1;`
		buffer += ';'
	} else if (block.type === 'Block') {
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
		.replace(/\s*([:,])/g, '$1 ') // force whitespace after colon or comma
		.replace(/\s*(=>|<=)\s*/g, ' $1 ') // force whitespace around => and <=
		.replace(/(?<!<=)(?<!=>)(?<!<= )([<>])(?![<= ])(?![=> ])(?![ =>])/g, ' $1 ')
		.replace(/\s+/g, ' ') // collapse multiple whitespaces into one
}

/**
 * @param {import('css-tree').Declaration} node
 * @param {string} css
 * @param {number} indent_level
 * @returns {string} A formatted Declaration
 */
function print_declaration(node, css, indent_level) {
	let property = node.property

	if (!property.startsWith('--') && is_uppercase(property)) {
		property = property.toLowerCase()
	}

	let value = print_value(node.value, css).trim()

	// Special case for `font` shorthand: remove whitespace around /
	if (property === 'font') {
		value = value.replace(/\s*\/\s*/, '/')
	}

	return indent(indent_level) + property + ':' + SPACE + value
}

/**
 * @param {import('css-tree').List<import('css-tree').CssNode>} children
 * @param {string} css
 */
function print_list(children, css) {
	let buffer = ''

	for (let node of children) {
		if (node !== children.first && node.type !== 'Operator') {
			buffer += ' '
		}

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
		} else if (node.type === 'Operator') {
			// Put extra spacing before + - / *
			// but not before a comma
			if (node.value !== ',') {
				buffer += ' '
			}
			buffer += substr(node, css)
		} else {
			buffer += substr(node, css)
		}
	}
	return buffer
}

/** @param {import('css-tree').Dimension} node */
function print_dimension(node) {
	let unit = node.unit
	let buffer = node.value
	buffer += is_uppercase(unit) ? unit.toLowerCase() : unit;
	return buffer
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
	let name = node.name
	let buffer = name

	if (is_uppercase(name)) {
		buffer = name.toLowerCase()
	}

	buffer += '('
	buffer += print_list(node.children, css)
	buffer += ')'
	return buffer
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
	let buffer = ''
	// @ts-expect-error Property 'children' does not exist on type 'AnPlusB', but we're never using that
	let children = node.children

	for (let child of children) {
		if (child.type === 'Rule') {
			buffer += print_rule(child, css, indent_level)
		} else if (child.type === 'Atrule') {
			buffer += print_atrule(child, css, indent_level)
		} else {
			buffer += print_unknown(child, css, indent_level)
		}

		if (child !== children.last) {
			buffer += NEWLINE + NEWLINE
		}
	}

	return buffer
}

/**
 * @typedef {Object} Options
 * @property {boolean} [minify] Whether to minify the CSS or keep it formatted
 *
 * Take a string of CSS (minified or not) and format it with some simple rules
 * @param {string} css The original CSS
 * @param {Options} options
 * @returns {string} The formatted CSS
 */
export function format(css, { minify = false } = {}) {
	let ast = parse(css, {
		positions: true,
		parseAtrulePrelude: false,
		parseCustomProperty: true,
		parseValue: true,
	})

	TAB = minify ? '' : '\t'
	NEWLINE = minify ? '' : '\n'
	SPACE = minify ? '' : ' '

	return print(ast, css, 0)
}

/**
 * Take a string of CSS and minify it
 * @param {string} css The original CSS
 * @returns {string} The minified CSS
 */
export function minify(css) {
	return format(css, { minify: true })
}
