import {
	tokenize,
	TOKEN_DELIM,
	TOKEN_FUNCTION,
	TOKEN_COMMA,
	TOKEN_COLON,
	TOKEN_SEMICOLON,
	TOKEN_LEFT_PAREN,
	TOKEN_RIGHT_PAREN,
	TOKEN_LEFT_BRACKET,
	TOKEN_RIGHT_BRACKET,
	TOKEN_LEFT_BRACE,
	TOKEN_RIGHT_BRACE,
	TOKEN_WHITESPACE,
	TOKEN_COMMENT,
	TOKEN_CDO,
	TOKEN_CDC,
	type TokenType,
} from '@projectwallace/css-parser'

// Char codes for the DELIM characters that are unambiguous in every CSS
// context: ! / < = > ~
function is_unambiguous_delim(code: number): boolean {
	return code === 33 || code === 47 || code === 60 || code === 61 || code === 62 || code === 126
}

/**
 * True if a token of this `type` (and, for a DELIM, this char `code`) never
 * needs a space immediately BEFORE it, in any CSS context.
 *
 * `,` `:` and the unambiguous delimiters above are always tight on both
 * sides. `)` `]` only drop their leading space here; their trailing space
 * is left to the default rule (see `no_trailing_space`), since e.g. the gap
 * between `)` and a following `and` in a media query must survive. `;`
 * doesn't need an entry here - see `minify()`, it's never written eagerly.
 */
function no_leading_space(type: TokenType, code: number): boolean {
	switch (type) {
		case TOKEN_COMMA:
		case TOKEN_COLON:
		case TOKEN_LEFT_BRACE:
		case TOKEN_RIGHT_BRACE:
		case TOKEN_RIGHT_PAREN:
		case TOKEN_RIGHT_BRACKET:
			return true
		case TOKEN_DELIM:
			return is_unambiguous_delim(code)
		default:
			return false
	}
}

/**
 * True if a token of this `type` (and, for a DELIM, this char `code`) never
 * needs a space immediately AFTER it, in any CSS context.
 *
 * `(` `[` only drop their trailing space here: an ident directly before
 * either (`and(` vs `and (`, `a[href]` vs `a [href]`) can change meaning, so
 * their leading space is left to the default rule instead. A FUNCTION token
 * already has its own `(` fused into it (`rgb(`), so it's tight the same way.
 *
 * `+`, `-` and `*` are deliberately unhandled by either function: they're
 * also used where whitespace IS significant (calc's mandatory `+`/`-`, the
 * universal selector `*` right before a descendant combinator), and telling
 * those uses apart from "just an operator" would mean knowing what kind of
 * CSS construct is currently being printed - the whole point here is to not
 * track that. A few spots (`calc(1px * 2)`, `:nth-child(-n + 3)`, `a + b`)
 * keep an optional space a fussier minifier would strip - a good trade for
 * never needing a parser.
 */
function no_trailing_space(type: TokenType | -1, code: number): boolean {
	switch (type) {
		case TOKEN_COMMA:
		case TOKEN_COLON:
		case TOKEN_SEMICOLON:
		case TOKEN_LEFT_BRACE:
		case TOKEN_RIGHT_BRACE:
		case TOKEN_LEFT_PAREN:
		case TOKEN_LEFT_BRACKET:
		case TOKEN_FUNCTION:
			return true
		case TOKEN_DELIM:
			return is_unambiguous_delim(code)
		default:
			return false
	}
}

/**
 * Minify a string of CSS: print every token, drop every comment, and drop
 * whitespace except the one space needed to keep meaning intact.
 *
 * Unlike `format()`, this never builds a syntax tree - it walks the raw
 * token stream once, tracking only the previous token's type and (for a
 * DELIM) char code, and reconstructs the minimal text for it.
 */
export function minify(css: string): string {
	let out = ''
	let had_space = false
	let prev_type: TokenType | -1 = -1
	let prev_code = 0
	// A `;` is never written right away - only once we see what follows it.
	// A redundant one right before a block closes then simply never gets
	// written at all, instead of being appended and sliced back off (which,
	// on a large accumulated `out`, would copy the whole string every time).
	let pending_semicolon = false

	for (let { type, start, end } of tokenize(css)) {
		if (
			type === TOKEN_WHITESPACE ||
			type === TOKEN_COMMENT ||
			type === TOKEN_CDO ||
			type === TOKEN_CDC
		) {
			had_space = true
			continue
		}

		if (prev_type === TOKEN_COLON && (type === TOKEN_SEMICOLON || type === TOKEN_RIGHT_BRACE)) {
			// An empty declaration value (the `--foo: ;` "space toggle" trick)
			// must keep at least one space, or it silently becomes invalid.
			out += ' '
		}

		if (type === TOKEN_SEMICOLON) {
			pending_semicolon = true
			prev_type = type
			prev_code = 0
			had_space = false
			continue
		}

		if (pending_semicolon) {
			pending_semicolon = false
			if (type !== TOKEN_RIGHT_BRACE) out += ';'
		}

		let code = type === TOKEN_DELIM ? css.charCodeAt(start) : 0

		if (
			out !== '' &&
			had_space &&
			!no_leading_space(type, code) &&
			!no_trailing_space(prev_type, prev_code)
		) {
			out += ' '
		}

		out += css.slice(start, end)
		prev_type = type
		prev_code = code
		had_space = false
	}

	// A `;` at the very end of the input (e.g. `@layer test;` with nothing
	// after it) never reached a following token to flush it against.
	if (pending_semicolon) out += ';'

	return out
}
