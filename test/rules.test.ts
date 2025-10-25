import { test, expect } from 'vitest'
import { format } from '../index.js'

test('AtRules and Rules start on a new line', () => {
	let actual = format(`
		selector { property: value; }
		@media (min-width: 1000px) {
			selector { property: value; }
		}
		selector { property: value; }
		@layer test {
			selector { property: value; }
		}
	`)
	let expected = `selector {
	property: value;
}

@media (min-width: 1000px) {
	selector {
		property: value;
	}
}

selector {
	property: value;
}

@layer test {
	selector {
		property: value;
	}
}`

	expect(actual).toEqual(expected)
})

test('An empty line is rendered in between Rules', () => {
	let actual = format(`
		rule1 { property: value }
		rule2 { property: value }
	`)
	let expected = `rule1 {
	property: value;
}

rule2 {
	property: value;
}`
	expect(actual).toEqual(expected)
})

test('single empty line after a rule, before atrule', () => {
	let actual = format(`
		rule1 { property: value }
		@media (min-width: 1000px) {
			rule2 { property: value }
		}
	`)
	let expected = `rule1 {
	property: value;
}

@media (min-width: 1000px) {
	rule2 {
		property: value;
	}
}`
	expect(actual).toEqual(expected)
})

test('newline between last declaration and nested ruleset', () => {
	let actual = format(`
		test {
			property1: value1;
			& > item {
				property2: value2;
				& + another {
					property3: value3;
				}
			}
		}
	`)
	let expected = `test {
	property1: value1;

	& > item {
		property2: value2;

		& + another {
			property3: value3;
		}
	}
}`
	expect(actual).toEqual(expected)
})

test('newline between last declaration and nested atrule', () => {
	let actual = format(`
		test {
			property1: value1;
			@media all {
				property2: value2;
			}
		}
	`)
	let expected = `test {
	property1: value1;

	@media all {
		property2: value2;
	}
}`
	expect(actual).toEqual(expected)
})

test('no trailing newline on empty nested rule', () => {
	let actual = format(`
		@layer test {
			empty {}
		}
	`)
	let expected = `@layer test {
	empty {}
}`
	expect(actual).toEqual(expected)
})

test('formats nested rules with selectors starting with', () => {
	let actual = format(`
		selector {
			& > item {
				property: value;
			}
		}
	`)
	let expected = `selector {
	& > item {
		property: value;
	}
}`
	expect(actual).toEqual(expected)
})

test('newlines between declarations, nested rules and more declarations', () => {
	let actual = format(`a { font: 0/0; & b { color: red; } color: green;}`)
	let expected = `a {
	font: 0/0;

	& b {
		color: red;
	}

	color: green;
}`
	expect(actual).toEqual(expected)
})

test('formats nested rules with a selector starting with &', () => {
	let actual = format(`
		selector {
			& a { color: red; }
		}
	`)
	let expected = `selector {
	& a {
		color: red;
	}
}`
	expect(actual).toEqual(expected)
})

test('formats unknown stuff in curly braces', () => {
	let actual = format(`
		selector {
			{ color: red; }
		}
	`)
	let expected = `selector {
	{ color: red; }
}`
	expect(actual).toEqual(expected)
})

test('Relaxed nesting: formats nested rules with a selector with a &', () => {
	let actual = format(`
		selector {
			a & { color:red }
		}
	`)
	let expected = `selector {
	a & {
		color: red;
	}
}`
	expect(actual).toEqual(expected)
})

test('Relaxed nesting: formats nested rules with a selector with a &', () => {
	let actual = format(`
		selector {
			a & { color:red }
		}
	`)
	let expected = `selector {
	a & {
		color: red;
	}
}`
	expect(actual).toEqual(expected)
})

test('Relaxed nesting: formats nested rules with a selector without a &', () => {
	let actual = format(`
		selector {
			a { color:red }
		}
	`)
	let expected = `selector {
	a {
		color: red;
	}
}`
	expect(actual).toEqual(expected)
})

test('Relaxed nesting: formats nested rules with a selector without a &', () => {
	let actual = format(`
		selector {
			a { color:red }
		}
	`)
	let expected = `selector {
	a {
		color: red;
	}
}`
	expect(actual).toEqual(expected)
})

test('Relaxed nesting: formats nested rules with a selector starting with a selector combinator', () => {
	let actual = format(`
		selector {
			> a { color:red }
			~ a { color:red }
			+ a { color:red }
		}
	`)
	let expected = `selector {
	> a {
		color: red;
	}

	~ a {
		color: red;
	}

	+ a {
		color: red;
	}
}`
	expect(actual).toEqual(expected)
})

test('handles syntax errors: unclosed block', () => {
	let actual = format(`a { mumblejumble`)
	let expected = 'a {\n\tmumblejumble\n}'
	expect(actual).toEqual(expected)
})

test('handles syntax errors: premature closed block', () => {
	let actual = format(`a { mumblejumble: }`)
	let expected = 'a {\n\tmumblejumble: ;\n}'
	expect(actual).toEqual(expected)
})
test('Relaxed nesting: formats nested rules with a selector starting with a selector combinator and &', () => {
	let actual = format(`
		selector {
			& > a { color:red }
			& ~ a { color:red }
			& + a { color:red }
		}
	`)
	let expected = `selector {
	& > a {
		color: red;
	}

	& ~ a {
		color: red;
	}

	& + a {
		color: red;
	}
}`
	expect(actual).toEqual(expected)
})
