import {
	parse,
	traverse,
	SKIP,
	is_stylesheet,
	is_block,
	str_equals,
	str_index_of,
	is_custom,
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
	is_if_branch,
	is_if_condition,
	type Operator,
	type Value,
	type Declaration,
	type IfBranch,
	type IfCondition,
	type Function,
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
} from '@projectwallace/css-parser'

const SPACE = ' '
const EMPTY_STRING = ''

export type FormatOptions = {
	/** Whether to minify the CSS or keep it formatted */
	minify?: boolean
	/** Tell the formatter to use N spaces instead of tabs  */
	tab_size?: number
}

const UNQUOTE_RE = /(?:^['"])|(?:['"]$)/g
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

/** Lowercases a CSS identifier, except a custom-ident starting with `--`,
 * which must keep its case as written. */
function print_identifier(name: string): string {
	return is_custom(name) ? name : name.toLowerCase()
}

function print_string(str: string): string {
	let inner = unquote(str)
	let quote = inner.includes('"') ? "'" : '"'
	return quote + inner + quote
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

/** Indentation string for a given nesting depth, honoring `tab_size`. Undefined
 * `tab_size` means real tab characters — there's no numeric size to default to. */
function print_indent(size: number, tab_size?: number): string {
	if (tab_size !== undefined) {
		return SPACE.repeat(tab_size * size)
	}
	return '\t'.repeat(size)
}

/**
 * Prints an `if()` branch condition: `style()`/`supports()`/`media()`, the
 * `else` keyword, or a compound `not`/`and`/`or` condition combining several
 * of those. The function's argument list is the same grammar as a
 * `@supports`/`@media` prelude, so it's normalized through that same
 * string-based prelude formatter; only the function name itself is lowercased
 * separately, since `format_atrule_prelude` doesn't know to touch it.
 */
function print_if_condition(
	condition: IfBranch['condition'] | IfCondition['children'][number],
	minify: boolean,
): string {
	if (is_function(condition)) {
		let name = print_identifier(condition.name)
		let inner = condition.value ?? ''
		return name + '(' + format_atrule_prelude(inner, { minify }) + ')'
	}
	if (is_if_condition(condition)) {
		let parts = condition.children.map((child) => print_if_condition(child, minify))
		return parts.join(SPACE)
	}
	return print_identifier(condition.text)
}

/** Prints one `<condition>: <value>` branch of an `if()` value, e.g. `media(print): black`. */
function print_if_branch(
	node: IfBranch,
	optional_space: string,
	minify: boolean,
	tab_size?: number,
): string {
	let condition = print_if_condition(node.condition, minify)
	let node_value = node.value
	let value = node_value ? format_value(node_value, { minify, tab_size }) : EMPTY_STRING
	if (value === EMPTY_STRING) {
		return condition + ':'
	}

	return condition + ':' + optional_space + value
}

/** Prints an `if(...)` value function, one condition/value branch per line.
 * Indentation is relative to the start of the declaration; callers re-indent continuation lines. */
function print_if(node: Function, minify: boolean, tab_size?: number): string {
	let branches = node.children as IfBranch[]

	if (minify) {
		let parts = branches.map((branch) => print_if_branch(branch, EMPTY_STRING, true, tab_size))
		return 'if(' + parts.join(';') + ')'
	}

	let inner_indent = print_indent(1, tab_size)
	let lines = branches.map((branch) => {
		let printed = print_if_branch(branch, SPACE, minify, tab_size).replaceAll(
			'\n',
			'\n' + inner_indent,
		)
		return inner_indent + printed + ';'
	})
	return 'if(\n' + lines.join('\n') + '\n)'
}

function print_list(
	nodes: CSSNode[],
	optional_space = SPACE,
	minify = false,
	tab_size?: number,
): string {
	let parts = []
	for (let node of nodes) {
		if (is_function(node)) {
			// An `if(...)` value function has `IfBranch` children instead of ordinary value nodes
			if (str_equals('if', node.name) && node.first_child && is_if_branch(node.first_child)) {
				parts.push(print_if(node, minify, tab_size))
			} else {
				let fn = print_identifier(node.name)
				parts.push(fn, '(', print_list(node.children, optional_space, minify, tab_size), ')')
			}
		} else if (is_dimension(node)) {
			parts.push(node.value, node.unit?.toLowerCase())
		} else if (is_string(node)) {
			parts.push(print_string(node.text))
		} else if (is_operator(node)) {
			parts.push(print_operator(node, optional_space))
		} else if (is_parenthesis(node)) {
			parts.push('(', print_list(node.children, optional_space, minify, tab_size), ')')
		} else if (is_url(node) && node.value) {
			// Lowercase the `url(` keyword but leave quote style untouched. A Url node's text
			// always starts with `url(` (any casing), that's how the parser identifies it.
			parts.push('url(' + node.text.slice(4))
		} else {
			parts.push(node.text)
		}

		if (!is_operator(node) && node.has_next && !is_operator(node.next_sibling)) {
			parts.push(SPACE)
		}
	}

	return parts.join(EMPTY_STRING)
}

export function format_value(
	value: Value | Raw | null,
	{ minify = false, tab_size = undefined }: Pick<FormatOptions, 'minify' | 'tab_size'> = {},
): string {
	if (value === null || is_raw(value)) return EMPTY_STRING
	let optional_space = minify ? EMPTY_STRING : SPACE
	return print_list(value.children, optional_space, minify, tab_size)
}

export function format_declaration(
	node: Declaration,
	{ minify = false, tab_size = undefined }: Pick<FormatOptions, 'minify' | 'tab_size'> = {},
): string {
	let optional_space = minify ? EMPTY_STRING : SPACE

	let important = EMPTY_STRING
	if (node.is_important) {
		let text = node.text
		let start = text.lastIndexOf('!')
		important =
			optional_space + text.slice(start, text.endsWith(';') ? -1 : undefined).toLowerCase()
	}
	let value = format_value(node.value, { minify, tab_size })
	let property = node.property!

	// Special case for `font` shorthand: remove whitespace around /
	if (str_equals('font', property)) {
		value = value.replace(FONT_SLASH_RE, '/')
	}

	// Hacky: add a space in case of a `space toggle` during minification
	if (value === EMPTY_STRING && optional_space === EMPTY_STRING) {
		value += SPACE
	}

	property = print_identifier(property)
	return property + ':' + optional_space + value + important
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
	let parts = ['[', print_identifier(node.name)]

	if (node.attr_operator) {
		parts.push(node.attr_operator)
		if (node.value !== null) {
			parts.push(print_string(node.value))
		}

		if (node.attr_flags !== null) {
			parts.push(SPACE, node.attr_flags.toLowerCase())
		}
	}

	parts.push(']')
	return parts.join(EMPTY_STRING)
}

/** Prints a pseudo-class or pseudo-element, e.g. `:hover` or `::before` or `:is(a, b)`. */
function print_pseudo_selector(
	node: PseudoClassSelector | PseudoElementSelector,
	optional_space = SPACE,
): string {
	let parts = [':']
	let name = print_identifier(node.name)

	// Legacy pseudo-elements or actual pseudo-elements use double colon
	if (name === 'before' || name === 'after' || is_pseudo_element_selector(node)) {
		parts.push(':')
	}

	parts.push(name)

	if (node.has_children) {
		parts.push('(')
		if (name === 'highlight') {
			// `::highlight()` takes a custom-ident, not a selector list
			parts.push(print_list(node.children, optional_space))
		} else {
			parts.push(print_selector_list(node, optional_space))
		}
		parts.push(')')
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
		let prefix = node.namespace === null ? '' : print_identifier(node.namespace) + '|'
		return prefix + print_identifier(node.name)
	}

	if (is_universal_selector(node)) {
		let prefix = node.namespace === null ? '' : print_identifier(node.namespace) + '|'
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
		return print_string(node.name ?? EMPTY_STRING)
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
	let parts = []
	for (let child of node) {
		if (is_selector_list(child)) {
			parts.push(print_selector_list(child, optional_space))
		} else {
			parts.push(print_selector_argument(child, optional_space))
			if (child.has_next) {
				parts.push(',', optional_space)
			}
		}
	}
	return parts.join(EMPTY_STRING)
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
		.replaceAll(ATRULE_COLON_COMMA_RE, str_index_of('selector(', prelude) === -1 ? '$1 ' : '$1') // force whitespace after colon or comma, except inside `selector()`
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
	if (tab_size !== undefined) {
		let normalized = Number(tab_size)
		// An invalid tab_size (non-numeric, fractional, NaN, Infinity, < 1) falls
		// back to the default tab indentation instead of throwing.
		tab_size = Number.isInteger(normalized) && normalized >= 1 ? normalized : undefined
	}

	const NEWLINE = minify ? EMPTY_STRING : '\n'
	const OPTIONAL_SPACE = minify ? EMPTY_STRING : SPACE
	const LAST_SEMICOLON = minify ? EMPTY_STRING : ';'

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

	function indent(size: number) {
		return minify ? EMPTY_STRING : print_indent(size, tab_size)
	}

	/**
	 * Get and format comments from the CSS string within a range
	 * @param after After which offset to look for comments
	 * @param before Before which offset to look for comments
	 * @param level Indentation level for continuation lines
	 * @returns The formatted comment string, or empty string if no comment found
	 */
	function get_comment(after: number, before: number, level: number): string {
		if (minify) {
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
	function print_rule_selectors(node: SelectorList, depth: number): string {
		let lines = []
		let prev_end: number | undefined
		for (let selector of node) {
			if (prev_end !== undefined) {
				let comment = get_comment(prev_end, selector.start, depth)
				if (comment) {
					lines.push(indent(depth) + comment)
				}
			}

			let printed = print_selector(selector, OPTIONAL_SPACE)
			if (selector.has_next) {
				printed += ','
			}
			lines.push(indent(depth) + printed)
			prev_end = selector.end
		}
		return lines.join(NEWLINE)
	}

	let lines: string[] = []
	// Per open rule/at-rule: whether its block is printed (so `leave` knows to close it)
	let open_blocks: boolean[] = []

	// Per open container (stylesheet, rule or at-rule): where the previous child ended
	let prev_ends: (number | undefined)[] = []

	/** Pushes the comment (if any) between the previous sibling and this node. */
	function push_comment_before(node: CSSNode, level: number): boolean {
		let prev_end = prev_ends.at(-1)
		prev_ends[prev_ends.length - 1] = node.end
		if (prev_end === undefined) return false
		let comment = get_comment(prev_end, node.start, level)
		if (comment) lines.push(indent(level) + comment)
		return comment !== EMPTY_STRING
	}

	/** Opens a rule/at-rule block: prints comments leading up to the first child. */
	function enter_block(block: Block, depth: number) {
		let comment = get_comment(block.start, block.first_child?.start ?? block.end, depth + 1)
		if (comment) lines.push(indent(depth + 1) + comment)
	}

	traverse(ast, {
		enter(node, depth) {
			if (is_stylesheet(node)) {
				prev_ends.push(undefined)
				if (node.child_count === 0) {
					lines.push(get_comment(0, node.end, 0))
					return SKIP
				}
				let comment = get_comment(0, node.first_child!.start, 0)
				if (comment) lines.push(comment)
				return
			}

			if (is_declaration(node)) {
				let is_last = !node.has_next || !is_declaration(node.next_sibling)
				push_comment_before(node, depth)
				// Multi-line values (`if()`) are printed relative to column 0; indent continuation lines
				let declaration = format_declaration(node, { minify, tab_size }).replaceAll(
					'\n',
					'\n' + indent(depth),
				)
				lines.push(indent(depth) + declaration + (is_last ? LAST_SEMICOLON : ';'))
				return SKIP
			}

			if (is_rule(node) || is_atrule(node)) {
				// Comments between siblings; top-level nodes are separated by a blank line
				// unless a comment already sits between them.
				let has_prev = prev_ends.at(-1) !== undefined
				let had_comment = push_comment_before(node, depth)
				if (has_prev && (depth > 0 || !had_comment)) {
					lines.push(EMPTY_STRING)
				}

				let block = node.block
				let block_has_content = is_rule(node)
					? !!block && (block.has_children || !!get_comment(block.start, block.end, depth + 1))
					: node.has_block &&
						(!node.block.is_empty || !!get_comment(node.block.start, node.block.end, depth + 1))
				open_blocks.push(block_has_content)
				prev_ends.push(undefined)

				if (is_rule(node)) {
					if (node.has_prelude && is_selector_list(node.prelude)) {
						let list = print_rule_selectors(node.prelude, depth)
						// An empty selector list (malformed/unknown block) prints no selector
						// lines, so the indentation has to be added here instead.
						if (list === EMPTY_STRING) list = indent(depth)

						let comment = get_comment(node.first_child?.end ?? 0, block?.start ?? 0, depth)
						if (node.first_child && block && comment) {
							list += NEWLINE + indent(depth) + comment
						}

						list += OPTIONAL_SPACE + '{'
						if (!block_has_content) list += '}'
						lines.push(list)
					}
				} else {
					let header = '@' + print_identifier(node.name!)
					if (node.prelude) {
						header += SPACE + format_atrule_prelude(node.prelude.text, { minify })
					}
					if (node.has_block) {
						header += OPTIONAL_SPACE + '{'
						if (!block_has_content) header += '}'
					} else {
						header += ';'
					}
					lines.push(indent(depth) + header)
				}

				if (!block_has_content) return SKIP
				enter_block(block!, depth)
				return
			}

			// Blocks are traversed for their children; everything else (selectors, preludes) is printed above
			if (!is_block(node)) return SKIP
		},
		leave(node, depth) {
			if (is_rule(node) || is_atrule(node)) {
				let prev_end = prev_ends.pop()
				if (!open_blocks.pop()) return
				if (prev_end !== undefined) {
					let comment = get_comment(prev_end, node.block!.end, depth + 1)
					if (comment) lines.push(indent(depth + 1) + comment)
				}
				lines.push(indent(depth) + '}')
			} else if (is_stylesheet(node)) {
				let prev_end = prev_ends.pop()
				if (prev_end !== undefined) {
					let comment = get_comment(prev_end, node.end, 0)
					if (comment) lines.push(comment)
				}
			}
		},
	})

	return lines.join(NEWLINE).trimEnd()
}

/**
 * Minify a string of CSS
 * @param {string} css The original CSS
 * @returns {string} The minified CSS
 */
export function minify(css: string): string {
	return format(css, { minify: true })
}
