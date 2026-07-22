import {
	tokenize,
	TOKEN_IDENT,
	TOKEN_FUNCTION,
	TOKEN_AT_KEYWORD,
	TOKEN_DELIM,
	TOKEN_WHITESPACE,
	TOKEN_COLON,
	TOKEN_SEMICOLON,
	TOKEN_COMMA,
	TOKEN_LEFT_BRACKET,
	TOKEN_RIGHT_BRACKET,
	TOKEN_LEFT_PAREN,
	TOKEN_RIGHT_PAREN,
	TOKEN_LEFT_BRACE,
	TOKEN_RIGHT_BRACE,
	TOKEN_COMMENT,
	TOKEN_CDO,
	TOKEN_CDC,
	type Token,
	type TokenType,
} from '@projectwallace/css-parser'

const SPACE = ' '
const EMPTY_STRING = ''

// Nth-child/nth-of-type and friends carry their own An+B micro-syntax whose
// `+`/`-` spacing is optional (unlike calc's, which is mandatory).
const NTH_FUNCTIONS = new Set(['nth-child', 'nth-last-child', 'nth-of-type', 'nth-last-of-type'])

const ATRULE_COLON_COMMA_RE = /\s*([:,])/g
const ATRULE_PAREN_TEXT_RE = /\)([a-zA-Z])/g
const ATRULE_KEYWORD_PAREN_RE = /\b(and|or|not|only)\(/gi
const ATRULE_ARROW_COMPARE_RE = /\s*(=>|>=|<=)\s*/g
const ATRULE_COMPARE_RE = /([^<>=\s])([<>])([^<>=\s])/g
const ATRULE_COMPARE_SPACED_RE = /([^<>=\s])\s+([<>])\s+([^<>=\s])/g
const ATRULE_COLON_COMMA_SPACE_RE = /([:,]) /g
const ATRULE_CALC_RE = /calc\(\s*([^()+\-*/]+)\s*([*/+-])\s*([^()+\-*/]+)\s*\)/g
const NTH_SIGN_RE = /\s*([+-])\s*/g
const WHITESPACE_RE = /\s+/g

type Tok = { type: TokenType; start: number; end: number; space_before: boolean }

function is_paren_open(t: TokenType): boolean {
	return t === TOKEN_LEFT_PAREN || t === TOKEN_FUNCTION
}
function is_paren_close(t: TokenType): boolean {
	return t === TOKEN_RIGHT_PAREN
}
function is_bracket_open(t: TokenType): boolean {
	return t === TOKEN_LEFT_BRACKET
}
function is_bracket_close(t: TokenType): boolean {
	return t === TOKEN_RIGHT_BRACKET
}
function is_brace_open(t: TokenType): boolean {
	return t === TOKEN_LEFT_BRACE
}
function is_brace_close(t: TokenType): boolean {
	return t === TOKEN_RIGHT_BRACE
}

/**
 * Adapted from the pretty-printer's at-rule prelude formatter, hardcoded to
 * always minify (at-rule preludes are matched as raw text, not tokenized
 * into a real value tree, so this text-based approach is reused as-is).
 */
function minify_atrule_prelude(prelude: string): string {
	return prelude
		.replaceAll(ATRULE_COLON_COMMA_RE, prelude.toLowerCase().includes('selector(') ? '$1' : '$1 ') // force whitespace after colon or comma, except inside `selector()`
		.replaceAll(ATRULE_PAREN_TEXT_RE, ') $1') // force whitespace between closing parenthesis and following text (usually and|or)
		.replaceAll(ATRULE_KEYWORD_PAREN_RE, '$1 (') // force whitespace between media/supports keywords and opening parenthesis
		.replaceAll(ATRULE_ARROW_COMPARE_RE, '$1') // remove optional spacing around =>, >= and <=
		.replaceAll(ATRULE_COMPARE_RE, '$1$2$3') // remove spacing around < or > except when it's part of <=, >=, =>
		.replaceAll(ATRULE_COMPARE_SPACED_RE, '$1$2$3') // remove spaces around < or > when they already have surrounding whitespace
		.replaceAll(WHITESPACE_RE, SPACE) // collapse multiple whitespaces into one
		.replaceAll(ATRULE_COLON_COMMA_SPACE_RE, '$1') // remove the optional space after : and , added above
		.replaceAll(ATRULE_CALC_RE, (_, left, operator, right) => {
			// force required whitespace around + and -, remove optional whitespace around * and /
			let space = operator === '+' || operator === '-' ? SPACE : EMPTY_STRING
			return `calc(${left.trim()}${space}${operator}${space}${right.trim()})`
		})
		.trim()
}

/** Collapses whitespace in an An+B expression and removes the optional space around its `+`/`-`. */
function minify_nth(text: string): string {
	return text.trim().replaceAll(WHITESPACE_RE, SPACE).replaceAll(NTH_SIGN_RE, '$1')
}

/**
 * Minify a string of CSS: print every node, drop every comment.
 *
 * Unlike `format()`, this never builds an AST - it walks the raw token
 * stream once and reconstructs the minimal valid text for it. Whitespace
 * and comment tokens are dropped up front; a `space_before` flag records
 * whether a kept token had any whitespace/comment immediately before it in
 * the source, which is what lets a couple of spots (the selector descendant
 * combinator, an attribute selector's flag) tell "meaningful gap" apart from
 * "nothing there at all" without needing a real parse tree.
 */
export function minify(css: string): string {
	let tokens: Tok[] = []
	let space_before = false
	for (let t of tokenize(css)) {
		if (
			t.type === TOKEN_WHITESPACE ||
			t.type === TOKEN_COMMENT ||
			t.type === TOKEN_CDO ||
			t.type === TOKEN_CDC
		) {
			space_before = true
			continue
		}
		tokens.push({ type: t.type, start: t.start, end: t.end, space_before })
		space_before = false
	}

	let n = tokens.length
	let pos = 0

	function text(t: Tok): string {
		return css.slice(t.start, t.end)
	}

	/** Indexes `tokens` without the `| undefined` noise - every call site here is already bounds-checked by its loop condition. */
	function at(i: number): Tok {
		return tokens[i] as Tok
	}

	/** Reconstructs text for a token span, collapsing any original gap to a single space, with comments already gone. */
	function raw_join(start: number, end: number): string {
		let out = EMPTY_STRING
		for (let i = start; i < end; i++) {
			if (i > start && at(i).space_before) out += SPACE
			out += text(at(i))
		}
		return out
	}

	/** Index of the token matching the opener just before `start`, using the given open/close predicates. `start` is already "one level deep". */
	function find_close(
		start: number,
		is_open: (t: TokenType) => boolean,
		is_close: (t: TokenType) => boolean,
	): number {
		let depth = 1
		for (let i = start; i < n; i++) {
			let ty = at(i).type
			if (is_open(ty)) depth++
			else if (is_close(ty)) {
				depth--
				if (depth === 0) return i
			}
		}
		return n
	}

	/** Index of the first depth-0 `;` or `{` at or after `pos`, within `limit_end` - the boundary between a declaration and a nested rule/at-rule. */
	function find_statement_terminator(limit_end: number): number {
		let depth = 0
		for (let i = pos; i < limit_end; i++) {
			let ty = at(i).type
			if (is_paren_open(ty) || ty === TOKEN_LEFT_BRACKET) depth++
			else if (is_paren_close(ty) || ty === TOKEN_RIGHT_BRACKET) depth--
			else if (depth === 0 && (ty === TOKEN_LEFT_BRACE || ty === TOKEN_SEMICOLON)) return i
		}
		return limit_end
	}

	function is_operator_delim(t: Tok): boolean {
		if (t.type !== TOKEN_DELIM) return false
		let ch = css.charCodeAt(t.start)
		return ch === 43 || ch === 45 || ch === 42 || ch === 47 // + - * /
	}

	/** Prints a declaration value or a function's argument list: comma/operator spacing, mandatory single space between plain siblings, everything else passed through verbatim. */
	function print_value(start: number, end: number): string {
		let out = EMPTY_STRING
		let boundary = false
		for (let i = start; i < end; i++) {
			let t = at(i)
			if (t.type === TOKEN_COMMA) {
				out += ','
				boundary = false
				continue
			}
			if (t.type === TOKEN_RIGHT_PAREN) {
				out += ')'
				boundary = true
				continue
			}
			if (is_operator_delim(t)) {
				let ch = css[t.start]
				let space = ch === '+' || ch === '-' ? SPACE : EMPTY_STRING
				out += space + ch + space
				boundary = false
				continue
			}
			if (boundary) out += SPACE
			out += text(t)
			boundary = !(t.type === TOKEN_LEFT_PAREN || t.type === TOKEN_FUNCTION)
		}
		return out
	}

	/** Detects a trailing `!important` (case preserved) and returns where the real value ends. */
	function extract_important(start: number, end: number): { value_end: number; important: string } {
		if (end - start >= 2) {
			let last = at(end - 1)
			let prev = at(end - 2)
			if (
				last.type === TOKEN_IDENT &&
				text(last).toLowerCase() === 'important' &&
				prev.type === TOKEN_DELIM &&
				css.charCodeAt(prev.start) === 33 // !
			) {
				return { value_end: end - 2, important: '!' + text(last) }
			}
		}
		return { value_end: end, important: EMPTY_STRING }
	}

	function print_declaration(end: number): string {
		let start = pos
		pos = end
		if (tokens[start]?.type !== TOKEN_IDENT || tokens[start + 1]?.type !== TOKEN_COLON) {
			// Not shaped like a declaration (malformed input) - pass it through.
			return raw_join(start, end)
		}
		let property = text(at(start))
		let { value_end, important } = extract_important(start + 2, end)
		let value = print_value(start + 2, value_end)
		// A custom property's value may be empty/whitespace-only on purpose (the
		// "space toggle" trick) - keep one space so it doesn't vanish entirely.
		if (value === EMPTY_STRING) value = SPACE
		return property + ':' + value + important
	}

	/** Prints an attribute selector, e.g. `[href^="https://" i]`. The flag (if any) is the only part with a mandatory space. */
	function print_attribute_selector(open_i: number, close_i: number): string {
		let out = '['
		for (let i = open_i + 1; i < close_i; i++) {
			let t = at(i)
			if (i === close_i - 1 && t.type === TOKEN_IDENT && t.space_before) {
				out += SPACE
			}
			out += text(t)
		}
		return out + ']'
	}

	/** Prints the An+B [of <selector-list>] argument of :nth-child() and friends. */
	function print_nth_arguments(start: number, end: number): string {
		let of_i = -1
		for (let i = start; i < end; i++) {
			if (at(i).type === TOKEN_IDENT && text(at(i)).toLowerCase() === 'of') {
				of_i = i
				break
			}
		}
		let nth_end = of_i === -1 ? end : of_i
		let nth_text = minify_nth(raw_join(start, nth_end))
		if (of_i === -1) return nth_text
		return nth_text + ' of ' + print_selector_list(of_i + 1, end)
	}

	/** Prints a functional pseudo-class/element's `(...)` argument, e.g. `:is(a, b)` or `:nth-child(2n+1 of .foo)`. */
	function print_pseudo_function(fn_tok: Tok, fn_i: number, close_i: number): string {
		let name = text(fn_tok)
		let lower = name.slice(0, -1).toLowerCase()
		let args_start = fn_i + 1
		let args = NTH_FUNCTIONS.has(lower)
			? print_nth_arguments(args_start, close_i)
			: print_selector_list(args_start, close_i)
		return name + args + ')'
	}

	/** Prints one complex selector, e.g. `div > .foo:hover`: compound-selector parts glue tight; a combinator (explicit or a lone descendant space) separates compounds. */
	function print_complex_selector(start: number, end: number): string {
		let out = EMPTY_STRING
		let i = start
		let is_first = true
		let after_combinator = false
		while (i < end) {
			let t = at(i)
			let ch = t.type === TOKEN_DELIM ? css[t.start] : EMPTY_STRING

			if (ch === '>' || ch === '~' || ch === '+') {
				out += ch
				i++
				is_first = false
				after_combinator = true
				continue
			}

			if (!is_first && !after_combinator && t.space_before) {
				out += SPACE
			}
			is_first = false
			after_combinator = false

			if (t.type === TOKEN_COLON) {
				let double = tokens[i + 1]?.type === TOKEN_COLON
				let name_i = double ? i + 2 : i + 1
				let name_tok = tokens[name_i]
				out += double ? '::' : ':'
				if (name_tok === undefined) {
					i = name_i
					continue
				}
				if (name_tok.type === TOKEN_FUNCTION) {
					let close = find_close(name_i + 1, is_paren_open, is_paren_close)
					out += print_pseudo_function(name_tok, name_i, close)
					i = close + 1
				} else {
					out += text(name_tok)
					i = name_i + 1
				}
				continue
			}

			if (t.type === TOKEN_LEFT_BRACKET) {
				let close = find_close(i + 1, is_bracket_open, is_bracket_close)
				out += print_attribute_selector(i, close)
				i = close + 1
				continue
			}

			out += text(t)
			i++
		}
		return out
	}

	/** Index of the first depth-0 comma in [start, end) - the split points of a selector list. */
	function find_top_level_comma(start: number, end: number): number {
		let depth = 0
		for (let i = start; i < end; i++) {
			let ty = at(i).type
			if (is_paren_open(ty) || ty === TOKEN_LEFT_BRACKET) depth++
			else if (is_paren_close(ty) || ty === TOKEN_RIGHT_BRACKET) depth--
			else if (depth === 0 && ty === TOKEN_COMMA) return i
		}
		return end
	}

	/** Prints a comma-separated list of complex selectors, e.g. `a, b` or the argument list of `:is(a, b)`. */
	function print_selector_list(start: number, end: number): string {
		let out = EMPTY_STRING
		let i = start
		while (i < end) {
			let piece_end = find_top_level_comma(i, end)
			out += print_complex_selector(i, piece_end)
			i = piece_end
			if (i < end && at(i).type === TOKEN_COMMA) {
				out += ','
				i++
			}
		}
		return out
	}

	function print_atrule(limit_end: number): string {
		let out = text(at(pos))
		pos++

		let depth = 0
		let term = pos
		for (; term < limit_end; term++) {
			let ty = at(term).type
			if (is_paren_open(ty) || ty === TOKEN_LEFT_BRACKET) depth++
			else if (is_paren_close(ty) || ty === TOKEN_RIGHT_BRACKET) depth--
			else if (depth === 0 && (ty === TOKEN_LEFT_BRACE || ty === TOKEN_SEMICOLON)) break
		}

		let prelude = raw_join(pos, term)
		if (prelude !== EMPTY_STRING) {
			out += SPACE + minify_atrule_prelude(prelude)
		}

		if (term < limit_end && at(term).type === TOKEN_LEFT_BRACE) {
			let close = find_close(term + 1, is_brace_open, is_brace_close)
			pos = term + 1
			out += '{' + print_block(close) + '}'
			pos = close + 1
		} else {
			pos = term < limit_end && at(term).type === TOKEN_SEMICOLON ? term + 1 : term
			out += ';'
		}

		return out
	}

	function print_rule(brace_i: number): string {
		let selector = print_selector_list(pos, brace_i)
		let close = find_close(brace_i + 1, is_brace_open, is_brace_close)
		pos = brace_i + 1
		let body = print_block(close)
		pos = close + 1
		return selector + '{' + body + '}'
	}

	/** Prints the children of a `{...}` block, or the whole stylesheet (with `close_i` as the token count). */
	function print_block(close_i: number): string {
		let out = EMPTY_STRING
		let pending_semi = false

		while (pos < close_i) {
			if (at(pos).type === TOKEN_SEMICOLON) {
				pos++
				continue
			}
			if (pending_semi) {
				out += ';'
				pending_semi = false
			}

			if (at(pos).type === TOKEN_AT_KEYWORD) {
				out += print_atrule(close_i)
				continue
			}

			let term = find_statement_terminator(close_i)
			if (term < close_i && at(term).type === TOKEN_LEFT_BRACE) {
				out += print_rule(term)
			} else {
				out += print_declaration(term)
				pos = term < close_i && at(term).type === TOKEN_SEMICOLON ? term + 1 : term
				pending_semi = true
			}
		}

		return out
	}

	return print_block(n)
}
