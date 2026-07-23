import {
	tokenize,
	TOKEN_FUNCTION,
	TOKEN_WHITESPACE,
	TOKEN_COMMENT,
	TOKEN_CDO,
	TOKEN_CDC,
} from '@projectwallace/css-parser'

/**
 * Characters where the space on one particular side is always safe to
 * drop, in every CSS context: separators/operators that are unambiguous
 * wherever they appear, plus grouping punctuation.
 *
 * `+`, `-` and `*` are deliberately left out of both sets: they're also
 * used where whitespace IS significant (calc's mandatory `+`/`-`, the
 * universal selector `*` right before a descendant combinator), and
 * telling those uses apart from "just an operator" would mean knowing
 * what kind of CSS construct is currently being printed - the whole point
 * here is to not track that. A few spots (`calc(1px * 2)`,
 * `:nth-child(-n + 3)`, `a + b`) keep an optional space a fussier
 * minifier would strip - a good trade for never needing a parser.
 *
 * `(` and `[` only drop their trailing space: an ident directly before
 * either (`and(` vs `and (`, `a[href]` vs `a [href]`) can change meaning,
 * so the space before them is left to the default rule below instead.
 */
const TIGHT_BEFORE = new Set([',', ':', ';', '!', '>', '<', '=', '~', '/', ')', ']', '}', '{'])
const TIGHT_AFTER = new Set([',', ':', ';', '!', '>', '<', '=', '~', '/', '(', '[', '{', '}'])

/**
 * Minify a string of CSS: print every token, drop every comment, and drop
 * whitespace except the one space needed to keep meaning intact.
 *
 * Unlike `format()`, this never builds a syntax tree - it walks the raw
 * token stream once, tracking only the previous token's last character,
 * and reconstructs the minimal text for it.
 */
export function minify(css: string): string {
	let out = ''
	let had_space = false
	let prev_char = ''
	let prev_was_function = false

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

		let text = css.slice(start, end)
		let char = text.length === 1 ? text : ''

		// A redundant `;` right before the block closes can just go.
		if (char === '}' && prev_char === ';') {
			out = out.slice(0, -1)
		}

		if (prev_char === ':' && (char === ';' || char === '}')) {
			// An empty declaration value (the `--foo: ;` "space toggle" trick)
			// must keep at least one space, or it silently becomes invalid.
			out += ' '
		} else if (
			out !== '' &&
			had_space &&
			!TIGHT_BEFORE.has(char) &&
			!TIGHT_AFTER.has(prev_char) &&
			!prev_was_function
		) {
			out += ' '
		}

		out += text
		prev_char = char
		prev_was_function = type === TOKEN_FUNCTION
		had_space = false
	}

	return out
}
