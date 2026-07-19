# `@projectwallace/css-parser` at-rule prelude parser — issues found

Found while rewriting `format_atrule_prelude`'s internals in this repo to use
`parse_atrule_prelude`/`parse_atrule_preludes: true` instead of regexes.
format-css works around all of these already (see the comments on
`print_atrule_prelude_node` and friends in `src/lib/index.ts`), but they're
worth fixing upstream since the workarounds mean format-css can't fully
trust the structured prelude parser yet.

Entries are removed from this list once confirmed fixed upstream (and the
corresponding workaround removed from `src/lib/index.ts`) — check git
history for this file if you're looking for something that used to be here
(e.g. dotted `@layer` names being split at the dot, fixed in `0.17.0`;
function calls being dropped from media-feature/`@supports`/`style()`
values, and the off-by-one end offsets that came with it, fixed in `0.18.0`
by deep-parsing at-rule prelude values).

Currently verified against `@projectwallace/css-parser@0.18.0`.

Repro snippets below assume:

```js
import { parse_atrule_prelude } from '@projectwallace/css-parser'
```

## 1. `=>` tokenizes as two separate operators instead of one (low severity)

```js
parse_atrule_prelude('media', '(width=>1000px)')
// children: [Dimension? no — ] PreludeOperator("="), PreludeOperator(">"), Dimension("1000px")
// (as two adjacent single-character operators, not one "=>" token)
```

The comparator scanner in `parse_feature_range` (`parse-atrule-prelude.js`)
extends a `<`/`>`/`=` into a two-character token only when the _second_
character is also `=` — correctly handling `>=`/`<=`, but not the reverse
order, so `=>` comes through split. (It's unclear `=>` is meaningful CSS
media-feature syntax at all, but the tokenizer should presumably be
consistent regardless of operand order.)

## 2. `@supports selector(...)` (or any function-token condition) returns nothing (medium severity)

```js
parse_atrule_prelude('supports', 'selector([popover]:open)')
// → [] (completely empty — not even a Raw fallback)
```

`parse_supports_query`'s dispatch loop only handles a `LEFT_PAREN` token
(start of a parenthesized condition) or an `IDENT` token (checking for
`and`/`or`/`not`); a `FUNCTION` token like `selector(` matches neither
branch and is silently skipped, so the entire prelude parses to an empty
array — total content loss, with no way to recover even the raw text
structurally. This is the CSS Selectors-in-`@supports` feature, in active
use (`:has()`-style progressive enhancement checks).

## 3. Leading `only`/`not` media-query prefix is consumed but never emitted as a node (medium severity)

```js
parse_atrule_prelude('media', 'only screen')
// → [MediaQuery] where MediaQuery.text === "only screen" (correct)
//   but MediaQuery.children === [MediaType("screen")] — "only" is gone
```

`parse_single_media_query` peeks the first token, and if it's `only`/`not`,
advances past it without creating any node — so it's present in the
enclosing `MediaQuery`'s own `.text` span but absent from its children. Any
consumer reconstructing a query purely from its children (rather than
falling back to the parent's raw `.text`) silently drops a very common
real-world prefix (`@media only screen ...`).

## 4. A few `.d.ts` declared child unions don't match runtime output (low severity, TS-only)

- `FeatureRange`'s children are typed `Dimension | Operator`, but comparison
  operators inside a range are actually `PreludeOperator` (type 38) at
  runtime, not the generic `Operator` (type 16) the type implies.
- `ContainerQuery`'s children are typed `Identifier | MediaFeature |
Function`, but the parser also pushes `PreludeOperator` nodes for
  `and`/`or`/`not` between conditions — not part of the declared union.
- `AtrulePrelude`'s (and other container nodes') declared child unions don't
  include `Identifier` or `String`, even though `parse_identifier()` (used
  for `@page`/`@keyframes`/`@property`/etc.) and `parse_charset_prelude()`
  produce exactly those types as top-level prelude children.

Doesn't affect JS behavior, but misleads TypeScript consumers who pattern-
match/exhaustively-check against the declared unions.

## 5. No comment-preservation hook for prelude parsing (low/medium severity, may be intentional)

The main `parse()` function accepts an `on_comment` callback so callers can
recover comments that appear between top-level constructs. The at-rule
prelude parser (`AtRulePreludeParser`/`parse_atrule_prelude`) has no
equivalent — comments inside a prelude (e.g. `@media /* comment */ (min-
width: 100px) {}`) are silently discarded while tokenizing, with no way for
a caller to know they were ever there. If prelude-level comment preservation
is in scope for this package, an `on_comment`-style hook mirroring the main
parser's would let consumers reconstruct them the same way they already can
for the rest of a stylesheet.
