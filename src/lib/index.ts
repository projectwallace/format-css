import {
	parse,
	is_function,
	is_dimension,
	is_parenthesis,
	is_url,
	is_string,
	is_operator,
	is_raw,
	is_selector_list,
	is_type_selector,
	is_universal_selector,
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
	type Operator,
	type Value,
	type Declaration,
	type Raw,
	type NthSelector,
	type NthOfSelector,
	type PseudoClassSelector,
	type PseudoElementSelector,
	type Combinator,
	type AttributeSelector,
	type Selector,
	type SelectorList,
	type Block,
	type Rule,
	type Atrule,
	type StyleSheet,
	type CSSNode,
	type Url,
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

// Printing is recursive (nested values, selectors, rules and atrules all
// call back into each other). Pathological input - e.g. thousands of
// nested rules or parentheses - can exceed the JS call stack, which
// otherwise surfaces as an opaque "Maximum call stack size exceeded"
// RangeError. Guard against that with an explicit, well below the real
// stack limit, depth so callers get a clear error instead.
const MAX_NESTING_DEPTH = 250
let recursion_depth = 0

function enter_recursion() {
	if (++recursion_depth > MAX_NESTING_DEPTH) {
		throw new RangeError(`format-css: input exceeds maximum nesting depth of ${MAX_NESTING_DEPTH}`)
	}
}

export type FormatOptions = {
	/** Whether to minify the CSS or keep it formatted */
	minify?: boolean
	/** Tell the formatter to use N spaces instead of tabs  */
	tab_size?: number
}

const UNQUOTE_RE = /(?:^['"])|(?:['"]$)/g
const DATA_URL_RE = /^['"]?data:/i
const FONT_SLASH_RE = /\s*\/\s*/
const ATRULE_COLON_COMMA_RE = /\s*([:,])/g
const ATRULE_PAREN_TEXT_RE = /\)([a-zA-Z])/g
const ATRULE_KEYWORD_PAREN_RE = /\b(and|or|not|only)\(/gi
const ATRULE_ARROW_COMPARE_RE = /\s*(=>|>=|<=)\s*/g
const ATRULE_COMPARE_RE = /([^<>=\s])([<>])([^<>=\s])/g
const ATRULE_COMPARE_SPACED_RE = /([^<>=\s])\s+([<>])\s+([^<>=\s])/g
const ATRULE_WHITESPACE_RE = /\s+/g
const ATRULE_COLON_COMMA_SPACE_RE = /([:,]) /g
const ATRULE_CALC_RE = /calc\(\s*([^()+\-*/]+)\s*([*/+-])\s*([^()+\-*/]+)\s*\)/g
const ATRULE_FN_NAME_RE = /selector|url|supports|layer\(/gi

export function unquote(str: string): string {
	return str.replaceAll(UNQUOTE_RE, EMPTY_STRING)
}

function print_string(str: string | number | null, quote?: '"' | "'"): string {
	str = str?.toString() || ''
	let inner = unquote(str)
	if (quote === undefined) {
		quote = inner.includes('"') ? "'" : '"'
	}
	return quote + inner + quote
}

function print_url(node: Url): string {
	let value = node.value ?? ''
	let unquoted = unquote(value)

	let inner: string
	if (DATA_URL_RE.test(value)) {
		let has_double = unquoted.includes('"')
		let has_single = unquoted.includes("'")
		if (has_double && has_single) {
			inner = print_string(unquoted.replaceAll('"', '%22'), '"')
		} else if (has_double || has_single) {
			inner = print_string(unquoted)
		} else {
			inner = unquoted
		}
	} else {
		inner = print_string(value)
	}

	return 'url(' + inner + CLOSE_PARENTHESES
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
	enter_recursion()
	try {
		let parts = []
		for (let node of nodes) {
			if (is_function(node)) {
				let fn = node.name.toLowerCase()
				parts.push(
					fn,
					OPEN_PARENTHESES,
					print_list(node.children, optional_space),
					CLOSE_PARENTHESES,
				)
			} else if (is_dimension(node)) {
				parts.push(node.value, node.unit?.toLowerCase())
			} else if (is_string(node)) {
				parts.push(print_string(node.text))
			} else if (is_operator(node)) {
				parts.push(print_operator(node, optional_space))
			} else if (is_parenthesis(node)) {
				parts.push(OPEN_PARENTHESES, print_list(node.children, optional_space), CLOSE_PARENTHESES)
			} else if (is_url(node) && node.value) {
				parts.push(print_url(node))
			} else {
				parts.push(node.text)
			}

			if (!is_operator(node) && node.has_next && !is_operator(node.next_sibling)) {
				parts.push(SPACE)
			}
		}

		return parts.join(EMPTY_STRING)
	} finally {
		recursion_depth--
	}
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
		value = value.replace(FONT_SLASH_RE, '/')
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

/** Prints the An+B microsyntax used by `:nth-child()` and friends, e.g. `2n+1`. */
function print_an_plus_b(node: NthSelector, optional_space = SPACE): string {
	let a = node.nth_a
	let b = node.nth_b
	let result = a ? a : EMPTY_STRING
	if (b) {
		if (a) {
			result += optional_space
			if (!b.startsWith('-')) result += '+' + optional_space
		}
		// parseFloat tolerates trailing non-numeric characters that Number() would reject as NaN
		// oxlint-disable-next-line unicorn/prefer-number-coercion
		result += parseFloat(b)
	}
	return result
}

/** Prints the `An+B [of <selector-list>]` argument of `:nth-child(2n+1 of .foo)`. */
function print_nth_of(node: NthOfSelector, optional_space = SPACE): string {
	let result = EMPTY_STRING
	if (node.nth) {
		result = print_an_plus_b(node.nth, optional_space) + SPACE + 'of' + SPACE
	}
	if (node.selector) {
		result += print_selector_list(node.selector, optional_space)
	}
	return result
}

/** Prints a combinator (` `, `>`, `+`, `~`, `||`) between two compound selectors. */
function print_combinator(node: Combinator, optional_space: string, is_first: boolean): string {
	let text = node.text
	// A lone whitespace combinator (descendant combinator) always prints as one
	// space, even when minifying: dropping it would merge two selectors into one.
	if (/^\s+$/.test(text)) {
		return SPACE
	}
	// Skip leading space if this is the first node in the selector
	let leading_space = is_first ? EMPTY_STRING : optional_space
	return leading_space + text + optional_space
}

/** Prints an attribute selector, e.g. `[href^="https://" i]`. */
function print_attribute_selector(node: AttributeSelector): string {
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

/** Prints a pseudo-class or pseudo-element, e.g. `:hover` or `::before` or `:is(a, b)`. */
function print_pseudo_selector(
	node: PseudoClassSelector | PseudoElementSelector,
	optional_space = SPACE,
): string {
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
			// `::highlight()` takes a custom-ident, not a selector list
			parts.push(print_list(node.children, optional_space))
		} else {
			parts.push(print_selector_list(node, optional_space))
		}
		parts.push(CLOSE_PARENTHESES)
	}

	return parts.join(EMPTY_STRING)
}

/**
 * Prints one member of a compound selector chain: either a combinator or a
 * compound-selector part (type, universal, class, id, attribute, pseudo).
 */
function print_selector_component(
	node: CSSNode,
	optional_space: string,
	is_first: boolean,
): string {
	if (is_combinator(node)) {
		return print_combinator(node, optional_space, is_first)
	}

	if (is_type_selector(node)) {
		let prefix = node.namespace === null ? '' : node.namespace.toLowerCase() + '|'
		return prefix + node.name.toLowerCase()
	}

	if (is_universal_selector(node)) {
		let prefix = node.namespace === null ? '' : node.namespace.toLowerCase() + '|'
		return prefix + '*'
	}

	if (is_pseudo_class_selector(node) || is_pseudo_element_selector(node)) {
		return print_pseudo_selector(node, optional_space)
	}

	if (is_attribute_selector(node)) {
		return print_attribute_selector(node)
	}

	// Class, id and nesting selectors print verbatim (`.foo`, `#bar`, `&`)
	return node.text
}

/** Prints a single complex selector, e.g. `div > .foo:hover`. */
function print_selector(node: Selector, optional_space = SPACE): string {
	return node.children
		.map((child, i) => print_selector_component(child, optional_space, i === 0))
		.join(EMPTY_STRING)
}

/**
 * Prints one item in a comma-separated selector position: a full complex
 * selector, or one of the special forms only valid there — the An+B (`of`
 * <selector-list>) argument of `:nth-child()`, or a `:lang()` argument.
 */
function print_selector_argument(node: CSSNode, optional_space = SPACE): string {
	if (is_nth_selector(node)) {
		return print_an_plus_b(node, optional_space)
	}

	if (is_nth_of_selector(node)) {
		return print_nth_of(node, optional_space)
	}

	if (is_lang_selector(node)) {
		return print_string(node.name)
	}

	return print_selector(node as Selector, optional_space)
}

/**
 * Prints a comma-separated list of selectors on a single line, e.g. `a, b`.
 * Used both for a top-level selector list and for the argument list of a
 * functional pseudo-class/element like `:is(a, b)`.
 */
function print_selector_list(
	node: SelectorList | PseudoClassSelector | PseudoElementSelector,
	optional_space = SPACE,
): string {
	enter_recursion()
	try {
		let parts = []
		for (let child of node) {
			if (is_selector_list(child)) {
				parts.push(print_selector_list(child, optional_space))
			} else {
				parts.push(print_selector_argument(child, optional_space))
				if (child.has_next) {
					parts.push(COMMA, optional_space)
				}
			}
		}
		return parts.join(EMPTY_STRING)
	} finally {
		recursion_depth--
	}
}

export function format_selector(
	node: CSSNode,
	{ minify = false }: Pick<FormatOptions, 'minify'> = {},
): string {
	let optional_space = minify ? EMPTY_STRING : SPACE
	return print_selector_argument(node, optional_space)
}

export function format_selector_list(
	node: SelectorList,
	{ minify = false }: Pick<FormatOptions, 'minify'> = {},
): string {
	let optional_space = minify ? EMPTY_STRING : SPACE
	return print_selector_list(node, optional_space)
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
		.replaceAll(ATRULE_COLON_COMMA_RE, prelude.toLowerCase().includes('selector(') ? '$1' : '$1 ') // force whitespace after colon or comma, except inside `selector()`
		.replaceAll(ATRULE_PAREN_TEXT_RE, ') $1') // force whitespace between closing parenthesis and following text (usually and|or)
		.replaceAll(ATRULE_KEYWORD_PAREN_RE, '$1 (') // force whitespace between media/supports keywords and opening parenthesis
		.replaceAll(ATRULE_ARROW_COMPARE_RE, `${optional_space}$1${optional_space}`) // add optional spacing around =>, >= and <=
		.replaceAll(ATRULE_COMPARE_RE, `$1${optional_space}$2${optional_space}$3`) // add spacing around < or > except when it's part of <=, >=, =>
		.replaceAll(ATRULE_COMPARE_SPACED_RE, `$1${optional_space}$2${optional_space}$3`) // handle spaces around < or > when they already have surrounding whitespace
		.replaceAll(ATRULE_WHITESPACE_RE, SPACE) // collapse multiple whitespaces into one
		.replaceAll(ATRULE_COLON_COMMA_SPACE_RE, minify ? '$1' : '$1 ') // in minify mode, remove optional spaces after : and ,
		.replaceAll(ATRULE_CALC_RE, (_, left, operator, right) => {
			// force required or optional whitespace around * and / in calc()
			let space = operator === '+' || operator === '-' ? SPACE : optional_space
			return `calc(${left.trim()}${space}${operator}${space}${right.trim()})`
		})
		.replaceAll(ATRULE_FN_NAME_RE, (match) => match.toLowerCase()) // lowercase function names
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
	let ast: StyleSheet
	try {
		ast = parse(css, {
			parse_atrule_preludes: false,
			on_comment: minify
				? undefined
				: ({ start, end }) => {
						comments.push(start, end)
					},
		})
	} catch (error) {
		// Deeply nested input can exceed the JS call stack inside the parser
		// itself, before our own recursion guard ever runs. Surface a clear,
		// documented error instead of an opaque native RangeError.
		if (error instanceof RangeError) {
			throw new RangeError('format-css: input is too deeply nested to parse')
		}
		throw error
	}

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

	/** Prints a rule's selector list one selector per line, e.g. `.a,\n.b {`. */
	function print_rule_selectors(node: SelectorList): string {
		let lines = []
		let prev_end: number | undefined
		for (let selector of node) {
			if (prev_end !== undefined) {
				let comment = get_comment(prev_end, selector.start)
				if (comment) {
					lines.push(indent(depth) + comment)
				}
			}

			let printed = print_selector(selector, OPTIONAL_SPACE)
			if (selector.has_next) {
				printed += COMMA
			}
			lines.push(indent(depth) + printed)
			prev_end = selector.end
		}
		return lines.join(NEWLINE)
	}

	function print_block(node: Block): string {
		enter_recursion()
		try {
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
					if (prev_end !== undefined && lines.length > 0) {
						lines.push(EMPTY_STRING)
					}
					lines.push(print_rule(child))
				} else if (is_atrule(child)) {
					if (prev_end !== undefined && lines.length > 0) {
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
		} finally {
			recursion_depth--
		}
	}

	function print_rule(node: Rule): string {
		enter_recursion()
		try {
			let block_has_content =
				node.block && (node.block.has_children || get_comment(node.block.start, node.block.end))
			let lines = []

			if (node.has_prelude && is_selector_list(node.prelude)) {
				let list = print_rule_selectors(node.prelude)

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
		} finally {
			recursion_depth--
		}
	}

	function print_atrule(node: Atrule): string {
		enter_recursion()
		try {
			let name = '@' + node.name!.toLowerCase()
			if (node.prelude) {
				name += SPACE + format_atrule_prelude(node.prelude.text, { minify })
			}

			let block_has_content =
				node.has_block && (!node.block.is_empty || !!get_comment(node.block.start, node.block.end))
			if (node.has_block) {
				name += OPTIONAL_SPACE + OPEN_BRACE
				if (!block_has_content) {
					name += CLOSE_BRACE
				}
			} else {
				name += SEMICOLON
			}

			if (block_has_content) {
				return name + NEWLINE + print_block(node.block!)
			}
			return name
		} finally {
			recursion_depth--
		}
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
