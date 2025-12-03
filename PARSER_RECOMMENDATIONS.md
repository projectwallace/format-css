# CSS Parser Enhancement Recommendations

Based on implementing the formatter, here are recommendations for improving the CSS parser to better support formatting and other tooling use cases.

## 1. Parentheses in Value Expressions (CRITICAL)

**Current Issue:** Parentheses in value expressions (particularly in `calc()`, `clamp()`, `min()`, `max()`, etc.) are not preserved in the AST. The parser flattens expressions into a simple sequence of values and operators, losing all grouping information.

**Example:**
```css
/* Input */
calc(((100% - var(--x)) / 12 * 6) + (-1 * var(--y)))

/* Parser output (flat list) */
100% - var(--x) / 12 * 6 + -1 * var(--y)
```

**Impact:** **CRITICAL** - Without parentheses, the mathematical meaning changes completely due to operator precedence:
- `(100% - var(--x)) / 12` ≠ `100% - var(--x) / 12`
- Division happens before subtraction, producing incorrect results
- Browsers will compute different values, breaking layouts

**Comparison with csstree:** The csstree parser has a `Parentheses` node type that wraps grouped expressions:
```typescript
if (node.type === 'Parentheses') {
  buffer += '(' + print_list(node.children) + ')'
}
```

**Recommendation:** Add a new node type `NODE_VALUE_PARENTHESES` (or `NODE_VALUE_GROUP`) that represents parenthesized expressions:

```typescript
// New node type constant
export const NODE_VALUE_PARENTHESES = 17

// Example AST structure for: calc((100% - 50px) / 2)
{
  type: NODE_VALUE_FUNCTION,
  name: 'calc',
  children: [
    {
      type: NODE_VALUE_PARENTHESES,  // ✅ Parentheses preserved!
      children: [
        { type: NODE_VALUE_DIMENSION, value: '100', unit: '%' },
        { type: NODE_VALUE_OPERATOR, text: '-' },
        { type: NODE_VALUE_DIMENSION, value: '50', unit: 'px' }
      ]
    },
    { type: NODE_VALUE_OPERATOR, text: '/' },
    { type: NODE_VALUE_NUMBER, text: '2' }
  ]
}
```

**Workaround:** Currently impossible. The formatter cannot reconstruct parentheses because the information is lost during parsing. Falling back to raw text defeats the purpose of having a structured AST.

**Priority:** CRITICAL - This is blocking the migration from csstree to wallace-css-parser, as it causes semantic changes to CSS that break user styles.

---

## 2. Attribute Selector Flags

**Current Issue:** Attribute selector flags (case-insensitive `i` and case-sensitive `s`) are not exposed as a property on `CSSNode`.

**Workaround Required:** Extract flags from raw text using regex:
```typescript
let text = child.text  // e.g., "[title="foo" i]"
let flag_match = text.match(/(?:["']\s*|\s+)([is])\s*\]$/i)
```

**Recommendation:** Add `attr_flags` property to `CSSNode`:
```typescript
get attr_flags(): string | null  // Returns 'i', 's', or null
```

**Impact:** High - This is a standard CSS feature that formatters and linters need to preserve.

---

## 2. Pseudo-Element Content (e.g., `::highlight()`)

**Current Issue:** Content inside pseudo-elements like `::highlight(Name)` is not accessible as structured data.

**Workaround Required:** Extract content from raw text:
```typescript
let text = child.text  // e.g., "::highlight(Name)"
let content_match = text.match(/::[^(]+(\([^)]*\))/)
```

**Recommendation:** Either:
- Option A: Add `content` property that returns the raw string inside parentheses
- Option B: Parse the content as child nodes with appropriate types (identifiers, strings, etc.)

**Impact:** Medium - Affects modern CSS features like `::highlight()`, `::part()`, `::slotted()`

---

## 4. Pseudo-Class Content Type Indication

**Current Issue:** No way to distinguish what type of content a pseudo-class contains without hardcoding known pseudo-class names.

**Workaround Required:** Maintain a hardcoded list:
```typescript
let selector_containing_pseudos = ['is', 'where', 'not', 'has', 'nth-child', ...]
if (selector_containing_pseudos.includes(name)) {
  // Format as selector
} else {
  // Preserve raw content
}
```

**Recommendation:** Add metadata to indicate content type:
```typescript
enum PseudoContentType {
  NONE,           // :hover, :focus (no parentheses)
  SELECTOR,       // :is(), :where(), :not(), :has()
  NTH,            // :nth-child(), :nth-of-type()
  STRING_LIST,    // :lang("en", "fr")
  IDENTIFIER,     // ::highlight(name)
  RAW             // Unknown/custom pseudo-classes
}

get pseudo_content_type(): PseudoContentType
```

**Impact:** High - Essential for proper formatting of both known and unknown pseudo-classes

---

## 5. Empty Parentheses Detection

**Current Issue:** When a pseudo-class has empty parentheses (e.g., `:nth-child()`), there's no indication in the AST that parentheses exist at all. `first_child` is null, so formatters can't distinguish `:nth-child` from `:nth-child()`.

**Workaround Required:** Check raw text for parentheses:
```typescript
let text = child.text
let content_match = text.match(/:[^(]+(\([^)]*\))/)
if (content_match) {
  // Has parentheses (possibly empty)
}
```

**Recommendation:** Add boolean property:
```typescript
get has_parentheses(): boolean  // True even if content is empty
```

**Impact:** Medium - Important for preserving invalid/incomplete CSS during formatting

---

## 6. Legacy Pseudo-Element Detection

**Current Issue:** Legacy pseudo-elements (`:before`, `:after`, `:first-letter`, `:first-line`) can be written with single colons but should be normalized to double colons. Parser treats them as `NODE_SELECTOR_PSEUDO_CLASS` rather than `NODE_SELECTOR_PSEUDO_ELEMENT`.

**Workaround Required:** Manually check names and convert:
```typescript
if (name === 'before' || name === 'after' || name === 'first-letter' || name === 'first-line') {
  parts.push(COLON, COLON, name)  // Force double colon
}
```

**Recommendation:** Either:
- Option A: Add boolean property `is_legacy_pseudo_element` to `NODE_SELECTOR_PSEUDO_CLASS`
- Option B: Always parse these as `NODE_SELECTOR_PSEUDO_ELEMENT` regardless of input syntax
- Option C: Add `original_colon_count` property (1 or 2)

**Impact:** Low - Only affects 4 legacy pseudo-elements, but improves CSS normalization

---

## 7. Nth Expression Coefficient Normalization

**Current Issue:** Nth expressions like `-n` need to be normalized to `-1n` for consistency, but parser returns raw text.

**Workaround Required:** Manual normalization:
```typescript
let a = node.nth_a
if (a === 'n') a = '1n'
else if (a === '-n') a = '-1n'
else if (a === '+n') a = '+1n'
```

**Recommendation:** Either:
- Option A: Add `nth_a_normalized` property that always includes coefficient
- Option B: Make `nth_a` always return normalized form
- Option C: Add separate `nth_coefficient` (number) and `nth_has_n` (boolean) properties

**Impact:** Low - Nice to have for consistent formatting, but workaround is simple

---

## 8. Pseudo-Class/Element Content as Structured Data

**Current Issue:** Content inside pseudo-classes like `:lang("en", "fr")` is not parsed into structured data. Must preserve as raw text.

**Workaround Required:** Extract and preserve entire parentheses content:
```typescript
parts.push(content_match[1])  // "(\"en\", \"fr\")"
```

**Recommendation:** Add specialized node types:
- `NODE_SELECTOR_LANG` with `languages: string[]` property
- Parse strings, identifiers, and other content as proper child nodes
- Add content type hints so formatters know whether to process or preserve

**Impact:** Medium - Would enable better validation and tooling for these features

---

## 9. Unknown/Custom Pseudo-Class Handling

**Current Issue:** For unknown or custom pseudo-classes, there's no way to know if they should be formatted or preserved as-is.

**Workaround Required:** Assume unknown = preserve raw content

**Recommendation:** Add a flag or property:
```typescript
get is_standard_pseudo(): boolean  // True for CSS-standard pseudo-classes
get is_vendor_prefixed(): boolean  // Already exists for properties
```

This would allow formatters to make informed decisions about processing unknown content.

**Impact:** Low - Most tools will default to preserving unknown content anyway

---

## Priority Summary

**CRITICAL Priority:**
1. **Parentheses in value expressions** - Blocks migration, causes semantic CSS changes

**High Priority:**
2. Attribute selector flags (`attr_flags` property)
3. Pseudo-class content type indication
4. Empty parentheses detection

**Medium Priority:**
5. Pseudo-element content access
6. Pseudo-class/element content as structured data

**Low Priority:**
7. Legacy pseudo-element detection
8. Nth coefficient normalization
9. Unknown pseudo-class handling

---

## Example: Ideal API

With these recommendations, formatting code could look like:

```typescript
case NODE_SELECTOR_ATTRIBUTE: {
  parts.push('[', child.name.toLowerCase())
  if (child.attr_operator !== ATTR_OPERATOR_NONE) {
    parts.push(print_operator(child.attr_operator))
    parts.push(print_string(child.value))
  }
  if (child.attr_flags) {  // ✅ No regex needed
    parts.push(' ', child.attr_flags)
  }
  parts.push(']')
}

case NODE_SELECTOR_PSEUDO_CLASS: {
  parts.push(':', child.name)
  if (child.has_parentheses) {  // ✅ Clear indication
    parts.push('(')
    if (child.pseudo_content_type === PseudoContentType.SELECTOR) {
      parts.push(print_selector(child.first_child))  // ✅ Safe to format
    } else {
      parts.push(child.raw_content)  // ✅ Preserve as-is
    }
    parts.push(')')
  }
}
```

This would eliminate all regex-based workarounds and make the formatter more maintainable and reliable.
