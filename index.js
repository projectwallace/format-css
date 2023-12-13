import parse from 'css-tree/parser'

const NEWLINE = '\n'

/**
 * Indent a string
 * @param {number} size
 * @returns A string with {size} tabs
 */
function indent(size) {
	return '\t'.repeat(size)
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

	// Multi-line nodes, not common
	return str.replace(/\s+/g, ' ')
}

/**
 * @param {import('css-tree').CssNode} node
 * @param {string} css
 * @returns A portion of the CSS
 */
function substr_raw(node, css) {
	if (!node.loc) return ''
	return css.substring(node.loc.start.offset, node.loc.end.offset)
}

/**
 * @param {import('css-tree').Rule} node
 * @param {number} indent_level
 * @param {string} css
 * @returns {string} A formatted Rule
 */
function print_rule(node, indent_level, css) {
	let buffer

	if (node.prelude.type === 'SelectorList') {
		buffer = print_selectorlist(node.prelude, indent_level, css)
	} else {
		buffer = print_unknown(node.prelude, indent_level, css)
	}

	if (node.block !== null && node.block.type === 'Block') {
		buffer += print_block(node.block, indent_level, css)
	}

	return buffer
}

/**
 * @param {import('css-tree').SelectorList} node
 * @param {number} indent_level
 * @param {string} css
 * @returns {string} A formatted SelectorList
 */
function print_selectorlist(node, indent_level, css) {
	let buffer = ''

	for (let selector of node.children) {
		if (selector.type === 'Selector') {
			buffer += print_selector(selector, indent_level, css)
		} else {
			buffer += print_unknown(selector, indent_level, css)
		}

		if (selector !== node.children.last) {
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
						buffer += print_simple_selector(grandchild, css)

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
 * @param {number} indent_level
 * @param {string} css
 * @returns {string} A formatted Selector
 */
function print_selector(node, indent_level, css) {
	return indent(indent_level) + print_simple_selector(node, css)
}

/**
 * @param {import('css-tree').Block} node
 * @param {number} indent_level
 * @param {string} css
 * @returns {string} A formatted Block
 */
function print_block(node, indent_level, css) {
	let children = node.children

	if (children.isEmpty) {
		return ' {}'
	}

	let buffer = ' {' + NEWLINE

	indent_level++

	let prev_type

	for (let child of children) {
		if (child.type === 'Declaration') {
			buffer += print_declaration(child, indent_level, css) + ';'
		} else {
			if (prev_type === 'Declaration') {
				buffer += NEWLINE
			}

			if (child.type === 'Rule') {
				buffer += print_rule(child, indent_level, css)
			} else if (child.type === 'Atrule') {
				buffer += print_atrule(child, indent_level, css)
			} else {
				buffer += print_unknown(child, indent_level, css)
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
 * @param {number} indent_level
 * @param {string} css
 * @returns {string} A formatted Atrule
 */
function print_atrule(node, indent_level, css) {
	let buffer = indent(indent_level) + '@' + node.name.toLowerCase()

	// @font-face has no prelude
	if (node.prelude !== null) {
		buffer += ' ' + print_prelude(node.prelude, 0, css)
	}

	if (node.block === null) {
		// `@import url(style.css);` has no block, neither does `@layer layer1;`
		buffer += ';'
	} else if (node.block.type === 'Block') {
		buffer += print_block(node.block, indent_level, css)
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
 * @param {number} indent_level
 * @param {string} css
 */
function print_prelude(node, indent_level, css) {
	let buffer = substr(node, css)
	return buffer
		.replace(/\s*([:,])/g, '$1 ') // force whitespace after colon or comma
		.replace(/\(\s+/g, '(') // remove whitespace after (
		.replace(/\s+\)/g, ')') // remove whitespace before )
		.replace(/\s+/g, ' ') // collapse multiple whitespaces into one
}

/**
 * @param {import('css-tree').Declaration} node
 * @param {number} indent_level
 * @param {string} css
 * @returns {string} A formatted Declaration
 */
function print_declaration(node, indent_level, css) {
	let property = node.property

	if (!property.startsWith('--')) {
		property = property.toLowerCase()
	}

	let value = print_value(node.value, indent_level, css).trim()

	// Special case for `font` shorthand: remove whitespace around /
	if (property === 'font') {
		value = value.replace(/\s*\/\s*/, '/')
	}

	return indent(indent_level) + property + ': ' + value
}

/**
 * @param {import('css-tree').List} children
 * @param {number} indent_level
 * @param {string} css
 */
function print_list(children, indent_level, css) {
	let buffer = ''

	for (let node of children) {
		if (node !== children.first && node.type !== 'Operator') {
			buffer += ' '
		}

		if (node.type === 'Identifier') {
			buffer += node.name
		} else if (node.type === 'Function') {
			buffer += print_function(node, 0, css)
		} else if (node.type === 'Dimension') {
			buffer += print_dimension(node, 0, css)
		} else if (node.type === 'Value') {
			// Values can be inside var() as fallback
			// var(--prop, VALUE)
			buffer += print_value(node, 0, css)
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

/**
 * @param {import('css-tree').Dimension} node
 * @param {number} indent_level
 * @param {string} css
 */
function print_dimension(node, indent_level, css) {
	return node.value + node.unit.toLowerCase()
}

/**
 * @param {import('css-tree').Value | import('css-tree').Raw} node
 * @param {number} indent_level
 * @param {string} css
 */
function print_value(node, indent_level, css) {
	if (node.type === 'Raw') {
		return print_unknown(node, 0, css)
	}

	return print_list(node.children, 0, css)
}

/**
 * @param {import('css-tree').FunctionNode} node
 * @param {number} indent_level
 * @param {string} css
 */
function print_function(node, indent_level, css) {
	let buffer = node.name.toLowerCase() + '('
	buffer += print_list(node.children, 0, css)
	buffer += ')'
	return buffer
}

/**
 * @param {import('css-tree').CssNode} node
 * @param {number} indent_level
 * @param {string} css
 * @returns {string} A formatted unknown CSS string
 */
function print_unknown(node, indent_level, css) {
	return indent(indent_level) + substr_raw(node, css).trim()
}

/**
 * @param {import('css-tree').StyleSheet} node
 * @param {number} indent_level
 * @param {string} css
 * @returns {string} A formatted Stylesheet
 */
function print(node, indent_level = 0, css) {
	let buffer = ''
	let children = node.children

	for (let child of children) {
		if (child.type === 'Rule') {
			buffer += print_rule(child, indent_level, css)
		} else if (child.type === 'Atrule') {
			buffer += print_atrule(child, indent_level, css)
		} else {
			buffer += print_unknown(child, indent_level, css)
		}

		if (child !== children.last) {
			buffer += NEWLINE + NEWLINE
		}
	}

	return buffer
}

/**
 * Take a string of CSS (minified or not) and format it with some simple rules
 * @param {string} css The original CSS
 * @returns {string} The newly formatted CSS
 */
export function format(css) {
	let ast = parse(css, {
		positions: true,
		parseAtrulePrelude: false,
		parseCustomProperty: true,
		parseValue: true,
	})
	return print(ast, 0, css)
}
