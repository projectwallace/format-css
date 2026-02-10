import {
	CSSNode,
	parse,
	ATTR_OPERATOR_EQUAL,
	ATTR_OPERATOR_TILDE_EQUAL,
	ATTR_OPERATOR_PIPE_EQUAL,
	ATTR_OPERATOR_CARET_EQUAL,
	ATTR_OPERATOR_DOLLAR_EQUAL,
	ATTR_OPERATOR_STAR_EQUAL,
	ATTR_FLAG_CASE_INSENSITIVE,
	ATTR_FLAG_CASE_SENSITIVE,
	NODE_TYPES as NODE,
	DIMENSION,
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

	// First pass: collect all comments
	let comments: number[] = []
	let ast = parse(css, {
		on_comment: ({ start, end }) => {
			comments.push(start, end)
		},
	})

	let depth = 0

	function indent(size: number) {
		if (minify === true) return EMPTY_STRING

		if (tab_size !== undefined) {
			return SPACE.repeat(tab_size * size)
		}

		return '\t'.repeat(size)
	}

	/**
	 * Get and format comments from the CSS string within a range
	 * @param after After which offset to look for comments
	 * @param before Before which offset to look for comments
	 * @param level Indentation level (uses current depth if not specified)
	 * @returns The formatted comment string, or empty string if no comment found
	 */
	function get_comment(after?: number, before?: number, level: number = depth): string {
		if (minify || after === undefined || before === undefined) {
			return EMPTY_STRING
		}

		let buffer = EMPTY_STRING
		for (let i = 0; i < comments.length; i += 2) {
			let start = comments[i]
			if (start === undefined || start < after) continue
			let end = comments[i + 1]
			if (end === undefined || end > before) break

			if (buffer.length > 0) {
				buffer += NEWLINE + indent(level)
			}
			buffer += css.slice(start, end)
		}
		return buffer
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
			if (node.type === NODE.FUNCTION) {
				let fn = node.name?.toLowerCase()
				parts.push(fn, OPEN_PARENTHESES)
				parts.push(print_list(node.children))
				parts.push(CLOSE_PARENTHESES)
			} else if (node.type === NODE.DIMENSION) {
				parts.push(node.value, node.unit?.toLowerCase())
			} else if (node.type === NODE.STRING) {
				parts.push(print_string(node.text))
			} else if (node.type === NODE.OPERATOR) {
				parts.push(print_operator(node))
			} else if (node.type === NODE.PARENTHESIS) {
				parts.push(OPEN_PARENTHESES, print_list(node.children), CLOSE_PARENTHESES)
			} else if (node.type === NODE.URL && typeof node.value === 'string') {
				parts.push('url(')
				let { value } = node
				// if the value starts with data:, 'data:, "data:
				if (/^['"]?data:/i.test(value)) {
					parts.push(unquote(value))
				} else {
					parts.push(print_string(value))
				}
				parts.push(CLOSE_PARENTHESES)
			} else {
				parts.push(node.text)
			}

			if (node.type !== NODE.OPERATOR) {
				if (node.has_next) {
					if (node.next_sibling?.type !== NODE.OPERATOR) {
						parts.push(SPACE)
					}
				}
			}
		}

		return parts.join(EMPTY_STRING)
	}

	function print_value(nodes: CSSNode[] | null): string {
		if (nodes === null) return EMPTY_STRING
		return print_list(nodes)
	}

	function print_declaration(node: CSSNode): string {
		let important = []
		if (node.is_important) {
			let text = node.text
			let has_semicolon = text.endsWith(SEMICOLON)
			let start = text.lastIndexOf('!')
			let end = has_semicolon ? -1 : undefined
			important.push(OPTIONAL_SPACE, text.slice(start, end).toLowerCase())
		}
		let value = print_value(node.value as CSSNode[] | null)
		let property = node.property!

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
			case ATTR_OPERATOR_EQUAL:
			default:
				return '='
		}
	}

	function print_nth(node: CSSNode): string {
		let parts = []
		let a = node.nth_a
		let b = node.nth_b

		if (a) {
			parts.push(a)
		}
		if (a && b) {
			parts.push(OPTIONAL_SPACE)
		}
		if (b) {
			if (a && !b.startsWith('-')) {
				parts.push('+', OPTIONAL_SPACE)
			}
			parts.push(parseFloat(b))
		}

		return parts.join(EMPTY_STRING)
	}

	function print_nth_of(node: CSSNode): string {
		let parts = []
		if (node.children[0]?.type === NODE.NTH_SELECTOR) {
			parts.push(print_nth(node.children[0]))
			parts.push(SPACE, 'of', SPACE)
		}
		if (node.children[1]?.type === NODE.SELECTOR_LIST) {
			parts.push(print_inline_selector_list(node.children[1]))
		}
		return parts.join(EMPTY_STRING)
	}

	function print_simple_selector(node: CSSNode, is_first: boolean = false): string {
		let name = node.name ?? ''

		switch (node.type) {
			case NODE.TYPE_SELECTOR: {
				return name.toLowerCase() ?? ''
			}

			case NODE.COMBINATOR: {
				let text = node.text
				if (/^\s+$/.test(text)) {
					return SPACE
				}
				// Skip leading space if this is the first node in the selector
				let leading_space = is_first ? EMPTY_STRING : OPTIONAL_SPACE
				return leading_space + text + OPTIONAL_SPACE
			}

			case NODE.PSEUDO_ELEMENT_SELECTOR:
			case NODE.PSEUDO_CLASS_SELECTOR: {
				let parts = [COLON]
				name = name.toLowerCase()

				// Legacy pseudo-elements or actual pseudo-elements use double colon
				if (name === 'before' || name === 'after' || node.type === NODE.PSEUDO_ELEMENT_SELECTOR) {
					parts.push(COLON)
				}

				parts.push(name)

				if (node.has_children) {
					parts.push(OPEN_PARENTHESES)
					if (node.children.length > 0) {
						if (name === 'highlight') {
							parts.push(print_list(node.children))
						} else {
							parts.push(print_inline_selector_list(node))
						}
					}
					parts.push(CLOSE_PARENTHESES)
				}

				return parts.join(EMPTY_STRING)
			}

			case NODE.ATTRIBUTE_SELECTOR: {
				let parts = [OPEN_BRACKET, name.toLowerCase()]

				if (node.attr_operator) {
					parts.push(print_attribute_selector_operator(node.attr_operator))
					if (typeof node.value === 'string') {
						parts.push(print_string(node.value))
					}

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
		if (node.type === NODE.NTH_SELECTOR) {
			return print_nth(node)
		}

		if (node.type === NODE.NTH_OF_SELECTOR) {
			return print_nth_of(node)
		}

		if (node.type === NODE.SELECTOR_LIST) {
			return print_inline_selector_list(node)
		}

		if (node.type === NODE.LANG_SELECTOR) {
			return print_string(node.text)
		}

		// Handle compound selector (combination of simple selectors)
		let parts: string[] = []
		node.children.forEach((child, index) => {
			const part = print_simple_selector(child, index === 0)
			parts.push(part)
		})
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
		let prev_end: number | undefined
		let count = 0
		for (let selector of node) {
			count++
			if (prev_end !== undefined) {
				let comment = get_comment(prev_end, selector.start)
				if (comment) {
					lines.push(indent(depth) + comment)
				}
			}

			let printed = print_selector(selector)
			if (selector.has_next) {
				printed += COMMA
			}
			lines.push(indent(depth) + printed)
			prev_end = selector.end
		}
		return lines.join(NEWLINE)
	}

	function print_block(node: CSSNode): string {
		let lines = []
		depth++

		let children = node.children
		if (children.length === 0) {
			let comment = get_comment(node.start, node.end)
			if (comment) {
				lines.push(indent(depth) + comment)
				depth--
				lines.push(indent(depth) + CLOSE_BRACE)
				return lines.join(NEWLINE)
			}
		}

		let first_child = children[0]
		let comment_before_first = get_comment(node.start, first_child?.start)
		if (comment_before_first) {
			lines.push(indent(depth) + comment_before_first)
		}

		let prev_end: number | undefined

		for (let child of children) {
			if (prev_end !== undefined) {
				let comment = get_comment(prev_end, child.start)
				if (comment) {
					lines.push(indent(depth) + comment)
				}
			}

			let is_last = child.next_sibling?.type !== NODE.DECLARATION

			if (child.type === NODE.DECLARATION) {
				let declaration = print_declaration(child)
				let semi = is_last ? LAST_SEMICOLON : SEMICOLON
				lines.push(indent(depth) + declaration + semi)
			} else if (child.type === NODE.STYLE_RULE) {
				if (prev_end !== undefined && lines.length !== 0) {
					lines.push(EMPTY_STRING)
				}
				lines.push(print_rule(child))
			} else if (child.type === NODE.AT_RULE) {
				if (prev_end !== undefined && lines.length !== 0) {
					lines.push(EMPTY_STRING)
				}
				lines.push(indent(depth) + print_atrule(child))
			}

			prev_end = child.end
		}

		let comment_after_last = get_comment(prev_end, node.end)
		if (comment_after_last) {
			lines.push(indent(depth) + comment_after_last)
		}

		depth--
		lines.push(indent(depth) + CLOSE_BRACE)
		return lines.join(NEWLINE)
	}

	function print_rule(node: CSSNode): string {
		let lines = []

		if (node.first_child?.type === NODE.SELECTOR_LIST) {
			let list = print_selector_list(node.first_child)

			let comment = get_comment(node.first_child.end, node.block?.start)
			if (comment) {
				list += NEWLINE + indent(depth) + comment
			}

			list += OPTIONAL_SPACE + OPEN_BRACE

			let block_has_content = node.block && (node.block.has_children || get_comment(node.block.start, node.block.end))
			if (!block_has_content) {
				list += CLOSE_BRACE
			}
			lines.push(list)
		}

		if (node.block) {
			let block_has_content = node.block.has_children || get_comment(node.block.start, node.block.end)
			if (block_has_content) {
				lines.push(print_block(node.block))
			}
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
		let name = [`@`, node.name!.toLowerCase()]
		if (node.prelude) {
			name.push(SPACE, print_atrule_prelude(node.prelude.text))
		}
		if (node.block === null) {
			name.push(SEMICOLON)
		} else {
			name.push(OPTIONAL_SPACE, OPEN_BRACE)
			let block_has_content = !node.block.is_empty || get_comment(node.block.start, node.block.end)
			if (!block_has_content) {
				name.push(CLOSE_BRACE)
			}
		}
		lines.push(name.join(EMPTY_STRING))

		if (node.block !== null) {
			let block_has_content = !node.block.is_empty || get_comment(node.block.start, node.block.end)
			if (block_has_content) {
				lines.push(print_block(node.block))
			}
		}

		return lines.join(NEWLINE)
	}

	function print_stylesheet(node: CSSNode): string {
		let lines = []
		let children = node.children

		if (children.length === 0) {
			return get_comment(0, node.end, 0)
		}

		let first_child = children[0]
		if (first_child) {
			let comment_before_first = get_comment(0, first_child.start, 0)
			if (comment_before_first) {
				lines.push(comment_before_first)
			}
		}

		let prev_end: number | undefined

		for (let child of node) {
			if (prev_end !== undefined) {
				let comment = get_comment(prev_end, child.start, 0)
				if (comment) {
					lines.push(comment)
				}
			}

			if (child.type === NODE.STYLE_RULE) {
				lines.push(print_rule(child))
			} else if (child.type === NODE.AT_RULE) {
				lines.push(print_atrule(child))
			}

			prev_end = child.end

			if (child.has_next) {
				let next_has_comment = child.next_sibling && get_comment(child.end, child.next_sibling.start, 0)
				if (!next_has_comment) {
					lines.push(EMPTY_STRING)
				}
			}
		}

		let comment_after_last = get_comment(prev_end, node.end, 0)
		if (comment_after_last) {
			lines.push(comment_after_last)
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
