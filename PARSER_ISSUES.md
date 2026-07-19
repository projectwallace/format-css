# `@projectwallace/css-parser` at-rule prelude parser — issues found

Found while rewriting `format_atrule_prelude`'s internals in this repo to use
`parse_atrule_prelude`/`parse_atrule_preludes: true` instead of regexes.
format-css works around all of these already (see the comments on
`print_atrule_prelude_node` and friends in `src/lib/index.ts`), but they're
worth fixing upstream since the workarounds mean format-css can't fully
trust the structured prelude parser yet.

Entries are removed from this list once confirmed fixed upstream (and the
corresponding workaround removed from `src/lib/index.ts`) — check git
history for this file if you're looking for something that used to be here.
Fixed so far:

- dotted `@layer` names being split at the dot — `0.17.0`
- function calls dropped from media-feature/`@supports`/`style()` values,
  and the off-by-one end offsets that came with it (deep-parsing at-rule
  prelude values) — `0.18.0`
- `@supports selector(...)` returning nothing at all (now deep-parsed into a
  real selector list); the leading `only`/`not` media-query prefix being
  silently dropped from a query's children; the `.d.ts` child-union
  mismatches on `AtrulePrelude`/`ContainerQuery`/`FeatureRange` — `0.18.1`

Currently verified against `@projectwallace/css-parser@0.18.1`.

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

## 2. No comment-preservation hook for prelude parsing (low/medium severity, may be intentional)

The main `parse()` function accepts an `on_comment` callback so callers can
recover comments that appear between top-level constructs. The at-rule
prelude parser (`AtRulePreludeParser`/`parse_atrule_prelude`) has no
equivalent — comments inside a prelude (e.g. `@media /* comment */ (min-
width: 100px) {}`) are silently discarded while tokenizing, with no way for
a caller to know they were ever there. If prelude-level comment preservation
is in scope for this package, an `on_comment`-style hook mirroring the main
parser's would let consumers reconstruct them the same way they already can
for the rest of a stylesheet.
