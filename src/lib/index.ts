import {
	parse,
	is_function,
	is_dimension,
	is_parenthesis,
	is_url,
	is_string,
	is_operator,
	type Operator,
	type Value,
	type Declaration,
	type Raw,
	is_raw,
	type NthSelector,
	type NthOfSelector,
	type PseudoClassSelector,
	type PseudoElementSelector,
	type Selector,
	type SelectorList,
	type Block,
	type Rule,
	is_selector_list,
	type Atrule,
	type StyleSheet,
	type CSSNode,
	is_type_selector,
	is_combinator,
	is_pseudo_class_selector,
	is_pseudo_element_selector,
	is_attribute_selector,
	is_nth_selector,
	is_nth_of_selector,
	is_lang_selector,
	is_declaration,
	is_rule,
	is_atrule,
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

export function unquote(str: string): string {
	return str.replace(/(?:^['"])|(?:['"]$)/g, EMPTY_STRING)
}

function print_string(str: string | number | null): string {
	str = str?.toString() || ''
	return QUOTE + unquote(str) + QUOTE
}

function print_operator(node: Operator, optional_space = SPACE): string {
	// https://developer.mozilla.org/en-US/docs/Web/CSS/calc#notes
	// The + and - operators must be surrounded by whitespace
	// Whitespace around other operators is optional
	let operator = node.text
	let code = operator.charCodeAt(0)
	// + or - require spaces; comma has no leading space; others use optional space
	let space = code === 43 || code === 45 ? SPACE : optional_space
	return (code === 44 ? EMPTY_STRING : space) + operator + space
}

function print_list(nodes: CSSNode[], optional_space = SPACE): string {
	let parts = []
	for (let node of nodes) {
		if (is_function(node)) {
			let fn = node.name.toLowerCase()
			parts.push(fn, OPEN_PARENTHESES)
			parts.push(print_list(node.children, optional_space))
			parts.push(CLOSE_PARENTHESES)
		} else if (is_dimension(node)) {
			parts.push(node.value, node.unit?.toLowerCase())
		} else if (is_string(node)) {
			parts.push(print_string(node.text))
		} else if (is_operator(node)) {
			parts.push(print_operator(node, optional_space))
		} else if (is_parenthesis(node)) {
			parts.push(OPEN_PARENTHESES, print_list(node.children, optional_space), CLOSE_PARENTHESES)
		} else if (is_url(node) && node.value) {
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

		if (!is_operator(node)) {
			if (node.has_next) {
				if (!is_operator(node.next_sibling)) {
					parts.push(SPACE)
				}
			}
		}
	}

	return parts.join(EMPTY_STRING)
}

export function format_value(
	value: Value | Raw | null,
	{ minify = false }: Pick<FormatOptions, 'minify'> = {},
): string {
	if (value === null || is_raw(value)) return EMPTY_STRING
	let optional_space = minify ? EMPTY_STRING : SPACE
	return print_list(value.children, optional_space)
}

export function format_declaration(
	node: Declaration,
	{ minify = false }: Pick<FormatOptions, 'minify'> = {},
): string {
	let optional_space = minify ? EMPTY_STRING : SPACE

	let important = EMPTY_STRING
	if (node.is_important) {
		let text = node.text
		let start = text.lastIndexOf('!')
		important =
			optional_space + text.slice(start, text.endsWith(SEMICOLON) ? -1 : undefined).toLowerCase()
	}
	let value = format_value(node.value, { minify })
	let property = node.property!

	// Special case for `font` shorthand: remove whitespace around /
	if (property === 'font') {
		value = value.replace(/\s*\/\s*/, '/')
	}

	// Hacky: add a space in case of a `space toggle` during minification
	if (value === EMPTY_STRING && optional_space === EMPTY_STRING) {
		value += SPACE
	}

	if (!property.startsWith('--')) {
		property = property.toLowerCase()
	}
	return property + COLON + optional_space + value + important
}

function print_nth(node: NthSelector, optional_space = SPACE): string {
	let a = node.nth_a
	let b = node.nth_b
	let result = a ? a : EMPTY_STRING
	if (b) {
		if (a) {
			result += optional_space
			if (!b.startsWith('-')) result += '+' + optional_space
		}
		// the parseFloat removes the leading '+', if present
		result += parseFloat(b)
	}
	return result
}

function print_nth_of(node: NthOfSelector, optional_space = SPACE): string {
	let result = EMPTY_STRING
	if (node.nth) {
		result = print_nth(node.nth, optional_space) + SPACE + 'of' + SPACE
	}
	if (node.selector) {
		result += print_inline_selector_list(node.selector, optional_space)
	}
	return result
}

function print_simple_selector(
	node: CSSNode,
	optional_space = SPACE,
	is_first: boolean = false,
): string {
	if (is_type_selector(node)) {
		return node.name.toLowerCase()
	}

	if (is_combinator(node)) {
		let text = node.text
		// if only whitespace, return a single space
		if (/^\s+$/.test(text)) {
			return SPACE
		}
		// Skip leading space if this is the first node in the selector
		let leading_space = is_first ? EMPTY_STRING : optional_space
		return leading_space + text + optional_space
	}

	if (is_pseudo_class_selector(node) || is_pseudo_element_selector(node)) {
		let parts = [COLON]
		let name = node.name.toLowerCase()

		// Legacy pseudo-elements or actual pseudo-elements use double colon
		if (name === 'before' || name === 'after' || is_pseudo_element_selector(node)) {
			parts.push(COLON)
		}

		parts.push(name)

		if (node.has_children) {
			parts.push(OPEN_PARENTHESES)
			if (name === 'highlight') {
				parts.push(print_list(node.children, optional_space))
			} else {
				parts.push(print_inline_selector_list(node, optional_space))
			}
			parts.push(CLOSE_PARENTHESES)
		}

		return parts.join(EMPTY_STRING)
	}

	if (is_attribute_selector(node)) {
		let parts = [OPEN_BRACKET, node.name.toLowerCase()]

		if (node.attr_operator) {
			parts.push(node.attr_operator)
			if (node.value !== null) {
				parts.push(print_string(node.value))
			}

			if (node.attr_flags !== null) {
				parts.push(SPACE, node.attr_flags.toLowerCase())
			}
		}

		parts.push(CLOSE_BRACKET)
		return parts.join(EMPTY_STRING)
	}

	return node.text
}

function print_inline_selector_list(
	node: SelectorList | PseudoClassSelector | PseudoElementSelector,
	optional_space = SPACE,
): string {
	let parts = []
	for (let selector of node) {
		parts.push(format_selector(selector, { minify: optional_space === EMPTY_STRING }))
		if (selector.has_next) {
			parts.push(COMMA, optional_space)
		}
	}
	return parts.join(EMPTY_STRING)
}

export function format_selector(
	node: CSSNode,
	{ minify = false }: Pick<FormatOptions, 'minify'> = {},
): string {
	let optional_space = minify ? EMPTY_STRING : SPACE

	if (is_nth_selector(node)) {
		return print_nth(node, optional_space)
	}

	if (is_nth_of_selector(node)) {
		return print_nth_of(node, optional_space)
	}

	if (is_selector_list(node)) {
		return print_inline_selector_list(node, optional_space)
	}

	if (is_lang_selector(node)) {
		return print_string(node.name)
	}

	// Handle compound selector (combination of simple selectors)
	return (node as Selector).children
		.map((child, i) => print_simple_selector(child, optional_space, i === 0))
		.join(EMPTY_STRING)
}

/**
 * Pretty-printing atrule preludes takes an insane amount of rules,
 * so we're opting for a couple of 'good-enough' string replacements
 * here to force some nice formatting.
 * Should be OK perf-wise, since the amount of atrules in most
 * stylesheets are limited, so this won't be called too often.
 */
export function format_atrule_prelude(
	prelude: string,
	{ minify = false }: Pick<FormatOptions, 'minify'> = {},
): string {
	let optional_space = minify ? EMPTY_STRING : SPACE
	return prelude
		.replace(/\s*([:,])/g, prelude.toLowerCase().includes('selector(') ? '$1' : '$1 ') // force whitespace after colon or comma, except inside `selector()`
		.replace(/\)([a-zA-Z])/g, ') $1') // force whitespace between closing parenthesis and following text (usually and|or)
		.replace(/\s*(=>|>=|<=)\s*/g, `${optional_space}$1${optional_space}`) // add optional spacing around =>, >= and <=
		.replace(/([^<>=\s])([<>])([^<>=\s])/g, `$1${optional_space}$2${optional_space}$3`) // add spacing around < or > except when it's part of <=, >=, =>
		.replace(/([^<>=\s])\s+([<>])\s+([^<>=\s])/g, `$1${optional_space}$2${optional_space}$3`) // handle spaces around < or > when they already have surrounding whitespace
		.replace(/\s+/g, SPACE) // collapse multiple whitespaces into one
		.replace(/([:,]) /g, minify ? '$1' : '$1 ') // in minify mode, remove optional spaces after : and ,
		.replace(
			/calc\(\s*([^()+\-*/]+)\s*([*/+-])\s*([^()+\-*/]+)\s*\)/g,
			(_, left, operator, right) => {
				// force required or optional whitespace around * and / in calc()
				let space = operator === '+' || operator === '-' ? SPACE : optional_space
				return `calc(${left.trim()}${space}${operator}${space}${right.trim()})`
			},
		)
		.replace(/selector|url|supports|layer\(/gi, (match) => match.toLowerCase()) // lowercase function names
}

/**
 * Format a string of CSS using some simple rules
 */
export function format(
	css: string,
	{ minify = false, tab_size = undefined }: FormatOptions = Object.create(null),
): string {
	if (tab_size !== undefined && Number(tab_size) < 1) {
		throw new TypeError('tab_size must be a number greater than 0')
	}

	const NEWLINE = minify ? EMPTY_STRING : '\n'
	const OPTIONAL_SPACE = minify ? EMPTY_STRING : SPACE
	const LAST_SEMICOLON = minify ? EMPTY_STRING : SEMICOLON

	// First pass: collect all comments
	let comments: number[] = []
	let ast = parse(css, {
		parse_atrule_preludes: false,
		on_comment: minify
			? undefined
			: ({ start, end }) => {
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

	function print_selector_list(node: SelectorList): string {
		let lines = []
		let prev_end: number | undefined
		for (let selector of node) {
			if (prev_end !== undefined) {
				let comment = get_comment(prev_end, selector.start)
				if (comment) {
					lines.push(indent(depth) + comment)
				}
			}

			let printed = format_selector(selector, { minify })
			if (selector.has_next) {
				printed += COMMA
			}
			lines.push(indent(depth) + printed)
			prev_end = selector.end
		}
		return lines.join(NEWLINE)
	}

	function print_block(node: Block): string {
		let lines = []
		depth++

		if (!node.has_children) {
			let comment = get_comment(node.start, node.end)
			if (comment) {
				lines.push(indent(depth) + comment)
				depth--
				lines.push(indent(depth) + CLOSE_BRACE)
				return lines.join(NEWLINE)
			}
		}

		let first_child = node.first_child
		let comment_before_first = get_comment(node.start, first_child?.start)
		if (comment_before_first) {
			lines.push(indent(depth) + comment_before_first)
		}

		let prev_end: number | undefined

		for (let child of node) {
			if (prev_end !== undefined) {
				let comment = get_comment(prev_end, child.start)
				if (comment) {
					lines.push(indent(depth) + comment)
				}
			}

			if (is_declaration(child)) {
				let is_last = !child.has_next || !is_declaration(child.next_sibling)
				let declaration = format_declaration(child, { minify })
				let semi = is_last ? LAST_SEMICOLON : SEMICOLON
				lines.push(indent(depth) + declaration + semi)
			} else if (is_rule(child)) {
				if (prev_end !== undefined && lines.length !== 0) {
					lines.push(EMPTY_STRING)
				}
				lines.push(print_rule(child))
			} else if (is_atrule(child)) {
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

	function print_rule(node: Rule): string {
		let block_has_content =
			node.block && (node.block.has_children || get_comment(node.block.start, node.block.end))
		let lines = []

		if (node.has_prelude && is_selector_list(node.prelude)) {
			let list = print_selector_list(node.prelude)

			let comment = get_comment(node.first_child?.end, node.block?.start)
			if (comment) {
				list += NEWLINE + indent(depth) + comment
			}

			list += OPTIONAL_SPACE + OPEN_BRACE
			if (!block_has_content) {
				list += CLOSE_BRACE
			}
			lines.push(list)
		}

		if (block_has_content) {
			lines.push(print_block(node.block!))
		}

		return lines.join(NEWLINE)
	}

	function print_atrule(node: Atrule): string {
		let name = '@' + node.name!.toLowerCase()
		if (node.prelude) {
			name += SPACE + format_atrule_prelude(node.prelude.text, { minify })
		}

		let block_has_content =
			node.has_block && (!node.block.is_empty || !!get_comment(node.block.start, node.block.end))
		if (!node.has_block) {
			name += SEMICOLON
		} else {
			name += OPTIONAL_SPACE + OPEN_BRACE
			if (!block_has_content) {
				name += CLOSE_BRACE
			}
		}

		if (block_has_content) {
			return name + NEWLINE + print_block(node.block!)
		}
		return name
	}

	function print_stylesheet(node: StyleSheet): string {
		let lines = []

		if (node.child_count === 0) {
			return get_comment(0, node.end, 0)
		}

		if (node.has_children) {
			let comment_before_first = get_comment(0, node.first_child!.start, 0)
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

			if (is_rule(child)) {
				lines.push(print_rule(child))
			} else if (is_atrule(child)) {
				lines.push(print_atrule(child))
			}

			prev_end = child.end

			if (child.has_next) {
				let next_has_comment =
					child.next_sibling && get_comment(child.end, child.next_sibling.start, 0)
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
