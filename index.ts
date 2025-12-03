import {
	CSSNode,
	parse,
	NODE_AT_RULE,
	NODE_STYLE_RULE,
	NODE_DECLARATION,
	NODE_SELECTOR_LIST,
	NODE_SELECTOR_COMBINATOR,
	NODE_SELECTOR_TYPE,
	NODE_SELECTOR_PSEUDO_ELEMENT,
	NODE_SELECTOR_PSEUDO_CLASS,
	NODE_SELECTOR_ATTRIBUTE,
	ATTR_OPERATOR_NONE,
	ATTR_OPERATOR_EQUAL,
	ATTR_OPERATOR_TILDE_EQUAL,
	ATTR_OPERATOR_PIPE_EQUAL,
	ATTR_OPERATOR_CARET_EQUAL,
	ATTR_OPERATOR_DOLLAR_EQUAL,
	ATTR_OPERATOR_STAR_EQUAL,
	NODE_SELECTOR_NTH,
	NODE_SELECTOR_NTH_OF,
	NODE_VALUE_FUNCTION,
	NODE_VALUE_OPERATOR,
	NODE_VALUE_DIMENSION,
	NODE_VALUE_STRING,
	NODE_SELECTOR_LANG,
	ATTR_FLAG_CASE_INSENSITIVE,
	ATTR_FLAG_CASE_SENSITIVE,
	NODE_VALUE_PARENTHESIS,
} from '@projectwallace/css-parser'

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
const COMMA = ','

export type FormatOptions = {
	/** Whether to minify the CSS or keep it formatted */
	minify?: boolean
	/** Tell the formatter to use N spaces instead of tabs  */
	tab_size?: number
}

/**
 * Format a string of CSS using some simple rules
 */
export function format(css: string, { minify = false, tab_size = undefined }: FormatOptions = Object.create(null)): string {
	if (tab_size !== undefined && Number(tab_size) < 1) {
		throw new TypeError('tab_size must be a number greater than 0')
	}

	const NEWLINE = minify ? EMPTY_STRING : '\n'
	const OPTIONAL_SPACE = minify ? EMPTY_STRING : SPACE
	const LAST_SEMICOLON = minify ? EMPTY_STRING : SEMICOLON

	let ast = parse(css, {
		skip_comments: minify,
	})

	let depth = 0

	function indent(size: number) {
		if (minify === true) return EMPTY_STRING

		if (tab_size !== undefined) {
			return SPACE.repeat(tab_size * size)
		}

		return '\t'.repeat(size)
	}

	function unquote(str: string): string {
		return str.replace(/(?:^['"])|(?:['"]$)/g, EMPTY_STRING)
	}

	function print_string(str: string | number | null): string {
		str = str?.toString() || ''
		return QUOTE + unquote(str) + QUOTE
	}

	function print_operator(node: CSSNode): string {
		let parts = []
		// https://developer.mozilla.org/en-US/docs/Web/CSS/calc#notes
		// The + and - operators must be surrounded by whitespace
		// Whitespace around other operators is optional

		let operator = node.text
		let code = operator.charCodeAt(0)

		if (code === 43 || code === 45) {
			// + or -
			// Add required space before + and - operators
			parts.push(SPACE)
		} else if (code !== 44) {
			// ,
			// Add optional space before operator
			parts.push(OPTIONAL_SPACE)
		}

		// FINALLY, render the operator
		parts.push(operator)

		if (code === 43 || code === 45) {
			// + or -
			// Add required space after + and - operators
			parts.push(SPACE)
		} else {
			// Add optional space after other operators (like *, /, and ,)
			parts.push(OPTIONAL_SPACE)
		}

		return parts.join(EMPTY_STRING)
	}

	function print_list(nodes: CSSNode[]): string {
		let parts = []
		for (let node of nodes) {
			if (node.type === NODE_VALUE_FUNCTION) {
				let fn = node.name.toLowerCase()
				parts.push(fn, OPEN_PARENTHESES)
				if (fn === 'url' || fn === 'src') {
					parts.push(print_string(node.value))
				} else {
					parts.push(print_list(node.children))
				}
				parts.push(CLOSE_PARENTHESES)
			} else if (node.type === NODE_VALUE_DIMENSION) {
				parts.push(node.value, node.unit?.toLowerCase())
			} else if (node.type === NODE_VALUE_STRING) {
				parts.push(print_string(node.text))
			} else if (node.type === NODE_VALUE_OPERATOR) {
				parts.push(print_operator(node))
			} else if (node.type === NODE_VALUE_PARENTHESIS) {
				parts.push(OPEN_PARENTHESES, print_list(node.children), CLOSE_PARENTHESES)
			} else {
				parts.push(node.text)
			}

			if (node.type !== NODE_VALUE_OPERATOR) {
				if (node.has_next) {
					if (node.next_sibling?.type !== NODE_VALUE_OPERATOR) {
						parts.push(SPACE)
					}
				}
			}
		}

		return parts.join(EMPTY_STRING)
	}

	function print_values(nodes: CSSNode[] | null): string {
		if (nodes === null) return EMPTY_STRING
		return print_list(nodes)
	}

	function print_declaration(node: CSSNode): string {
		let important = []
		if (node.is_important) {
			let text = node.text
			let has_semicolon = text.endsWith(SEMICOLON)
			let start = text.indexOf('!')
			let end = has_semicolon ? -1 : undefined
			important.push(OPTIONAL_SPACE, text.slice(start, end).toLowerCase())
		}
		let value = print_values(node.values)
		let property = node.property

		// Special case for `font` shorthand: remove whitespace around /
		if (property === 'font') {
			value = value.replace(/\s*\/\s*/, '/')
		}

		// Hacky: add a space in case of a `space toggle` during minification
		if (value === EMPTY_STRING && minify === true) {
			value += SPACE
		}

		if (!property.startsWith('--')) {
			property = property.toLowerCase()
		}
		return property + COLON + OPTIONAL_SPACE + value + important.join(EMPTY_STRING)
	}

	function print_attribute_selector_operator(operator: number) {
		switch (operator) {
			case ATTR_OPERATOR_NONE:
				return ''
			case ATTR_OPERATOR_EQUAL:
				return '='
			case ATTR_OPERATOR_TILDE_EQUAL:
				return '~='
			case ATTR_OPERATOR_PIPE_EQUAL:
				return '|='
			case ATTR_OPERATOR_CARET_EQUAL:
				return '^='
			case ATTR_OPERATOR_DOLLAR_EQUAL:
				return '$='
			case ATTR_OPERATOR_STAR_EQUAL:
				return '*='
			default:
				return ''
		}
	}

	function print_nth(node: CSSNode): string {
		let parts = []
		let a = node.nth_a
		let b = node.nth_b

		if (a !== null) {
			parts.push(a)
		}
		if (a !== null && b !== null) {
			parts.push(OPTIONAL_SPACE)
		}
		if (b !== null) {
			if (a !== null && !b.startsWith('-')) {
				parts.push('+', OPTIONAL_SPACE)
			}
			parts.push(b)
		}

		return parts.join(EMPTY_STRING)
	}

	function print_nth_of(node: CSSNode): string {
		let parts = []
		if (node.children[0]?.type === NODE_SELECTOR_NTH) {
			parts.push(print_nth(node.children[0]))
			parts.push(SPACE, 'of', SPACE)
		}
		if (node.children[1]?.type === NODE_SELECTOR_LIST) {
			parts.push(print_inline_selector_list(node.children[1]))
		}
		return parts.join(EMPTY_STRING)
	}

	function print_simple_selector(node: CSSNode, is_first: boolean = false): string {
		switch (node.type) {
			case NODE_SELECTOR_TYPE: {
				return node.name
			}

			case NODE_SELECTOR_COMBINATOR: {
				let text = node.text
				if (/^\s+$/.test(text)) {
					return SPACE
				}
				// Skip leading space if this is the first node in the selector
				let leading_space = is_first ? EMPTY_STRING : OPTIONAL_SPACE
				return leading_space + text + OPTIONAL_SPACE
			}

			case NODE_SELECTOR_PSEUDO_ELEMENT:
			case NODE_SELECTOR_PSEUDO_CLASS: {
				let parts = [COLON]
				let name = node.name.toLowerCase()

				// Legacy pseudo-elements or actual pseudo-elements use double colon
				if (name === 'before' || name === 'after' || node.type === NODE_SELECTOR_PSEUDO_ELEMENT) {
					parts.push(COLON)
				}

				parts.push(name)

				if (node.has_children) {
					parts.push(OPEN_PARENTHESES)
					if (node.children.length > 0) {
						parts.push(print_inline_selector_list(node))
					}
					parts.push(CLOSE_PARENTHESES)
				}

				return parts.join(EMPTY_STRING)
			}

			case NODE_SELECTOR_ATTRIBUTE: {
				let parts = [OPEN_BRACKET, node.name.toLowerCase()]

				if (node.attr_operator !== ATTR_OPERATOR_NONE) {
					parts.push(print_attribute_selector_operator(node.attr_operator))
					parts.push(print_string(node.value))

					if (node.attr_flags === ATTR_FLAG_CASE_INSENSITIVE) {
						parts.push(SPACE, 'i')
					} else if (node.attr_flags === ATTR_FLAG_CASE_SENSITIVE) {
						parts.push(SPACE, 's')
					}
				}

				parts.push(CLOSE_BRACKET)
				return parts.join(EMPTY_STRING)
			}

			default: {
				return node.text
			}
		}
	}

	function print_selector(node: CSSNode): string {
		// Handle special selector types
		if (node.type === NODE_SELECTOR_NTH) {
			return print_nth(node)
		}

		if (node.type === NODE_SELECTOR_NTH_OF) {
			return print_nth_of(node)
		}

		if (node.type === NODE_SELECTOR_LIST) {
			return print_inline_selector_list(node)
		}

		if (node.type === NODE_SELECTOR_LANG) {
			return print_string(node.text)
		}

		// Handle compound selector (combination of simple selectors)
		let parts = []
		let index = 0
		for (let child of node.children) {
			parts.push(print_simple_selector(child, index === 0))
			index++
		}

		return parts.join(EMPTY_STRING)
	}

	function print_inline_selector_list(node: CSSNode): string {
		let parts = []
		for (let selector of node) {
			parts.push(print_selector(selector))
			if (selector.has_next) {
				parts.push(COMMA, OPTIONAL_SPACE)
			}
		}
		return parts.join(EMPTY_STRING)
	}

	function print_selector_list(node: CSSNode): string {
		let lines = []
		for (let selector of node) {
			let printed = print_selector(selector)
			if (selector.has_next) {
				printed += COMMA
			}
			lines.push(indent(depth) + printed)
		}
		return lines.join(NEWLINE)
	}

	function print_block(node: CSSNode): string {
		let lines = []
		depth++

		for (let child of node.children) {
			let is_last = child.next_sibling?.type !== NODE_DECLARATION

			if (child.type === NODE_DECLARATION) {
				let declaration = print_declaration(child)
				let semi = is_last ? LAST_SEMICOLON : SEMICOLON
				lines.push(indent(depth) + declaration + semi)
			} else if (child.type === NODE_STYLE_RULE) {
				if (lines.length !== 0) {
					lines.push(EMPTY_STRING)
				}
				lines.push(print_rule(child))
			} else if (child.type === NODE_AT_RULE) {
				if (lines.length !== 0) {
					lines.push(EMPTY_STRING)
				}
				lines.push(indent(depth) + print_atrule(child))
			}
		}

		depth--
		lines.push(indent(depth) + CLOSE_BRACE)
		return lines.join(NEWLINE)
	}

	function print_rule(node: CSSNode): string {
		let lines = []

		if (node.first_child?.type === NODE_SELECTOR_LIST) {
			let list = print_selector_list(node.first_child) + OPTIONAL_SPACE + OPEN_BRACE
			if (!node.block?.has_children) {
				list += CLOSE_BRACE
			}
			lines.push(list)
		}

		if (node.block && !node.block.is_empty) {
			lines.push(print_block(node.block))
		}

		return lines.join(NEWLINE)
	}

	/**
	 * Pretty-printing atrule preludes takes an insane amount of rules,
	 * so we're opting for a couple of 'good-enough' string replacements
	 * here to force some nice formatting.
	 * Should be OK perf-wise, since the amount of atrules in most
	 * stylesheets are limited, so this won't be called too often.
	 */
	function print_atrule_prelude(prelude: string): string {
		return prelude
			.replace(/\s*([:,])/g, prelude.toLowerCase().includes('selector(') ? '$1' : '$1 ') // force whitespace after colon or comma, except inside `selector()`
			.replace(/\)([a-zA-Z])/g, ') $1') // force whitespace between closing parenthesis and following text (usually and|or)
			.replace(/\s*(=>|<=)\s*/g, ' $1 ') // force whitespace around => and <=
			.replace(/([^<>=\s])([<>])([^<>=\s])/g, `$1${OPTIONAL_SPACE}$2${OPTIONAL_SPACE}$3`) // add spacing around < or > except when it's part of <=, >=, =>
			.replace(/\s+/g, OPTIONAL_SPACE) // collapse multiple whitespaces into one
			.replace(/calc\(\s*([^()+\-*/]+)\s*([*/+-])\s*([^()+\-*/]+)\s*\)/g, (_, left, operator, right) => {
				// force required or optional whitespace around * and / in calc()
				let space = operator === '+' || operator === '-' ? SPACE : OPTIONAL_SPACE
				return `calc(${left.trim()}${space}${operator}${space}${right.trim()})`
			})
			.replace(/selector|url|supports|layer\(/gi, (match) => match.toLowerCase()) // lowercase function names
	}

	function print_atrule(node: CSSNode): string {
		let lines = []
		let name = [`@`, node.name.toLowerCase()]
		if (node.prelude !== null) {
			name.push(SPACE, print_atrule_prelude(node.prelude))
		}
		if (node.block === null) {
			name.push(SEMICOLON)
		} else {
			name.push(OPTIONAL_SPACE, OPEN_BRACE)
			if (node.block?.is_empty) {
				name.push(CLOSE_BRACE)
			}
		}
		lines.push(name.join(EMPTY_STRING))

		if (node.block !== null && !node.block.is_empty) {
			lines.push(print_block(node.block))
		}

		return lines.join(NEWLINE)
	}

	function print_stylesheet(node: CSSNode): string {
		let lines = []

		for (let child of node) {
			if (child.type === NODE_STYLE_RULE) {
				lines.push(print_rule(child))
			} else if (child.type === NODE_AT_RULE) {
				lines.push(print_atrule(child))
			}

			if (child.has_next) {
				lines.push(EMPTY_STRING)
			}
		}

		return lines.join(NEWLINE)
	}

	return print_stylesheet(ast).trimEnd()
}

/**
 * Minify a string of CSS
 * @param {string} css The original CSS
 * @returns {string} The minified CSS
 */
export function minify(css: string): string {
	return format(css, { minify: true })
}
