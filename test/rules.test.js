import { suite } from "uvu";
import * as assert from "uvu/assert";
import { format } from "../index.js";

let test = suite("Rules");

test("AtRules and Rules start on a new line", () => {
	let actual = format(`
		selector { property: value; }
		@media (min-width: 1000px) {
			selector { property: value; }
		}
		selector { property: value; }
		@layer test {
			selector { property: value; }
		}
	`);
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
}`;

	assert.equal(actual, expected);
});

test("An empty line is rendered in between Rules", () => {
	let actual = format(`
		rule1 { property: value }
		rule2 { property: value }
	`);
	let expected = `rule1 {
	property: value;
}

rule2 {
	property: value;
}`;
	assert.equal(actual, expected);
});

test("single empty line after a rule, before atrule", () => {
	let actual = format(`
		rule1 { property: value }
		@media (min-width: 1000px) {
			rule2 { property: value }
		}
	`);
	let expected = `rule1 {
	property: value;
}

@media (min-width: 1000px) {
	rule2 {
		property: value;
	}
}`;
	assert.equal(actual, expected);
});

test("newline between last declaration and nested ruleset", () => {
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
	`);
	let expected = `test {
	property1: value1;

	& > item {
		property2: value2;

		& + another {
			property3: value3;
		}
	}
}`;
	assert.equal(actual, expected);
});

test("newline between last declaration and nested atrule", () => {
	let actual = format(`
		test {
			property1: value1;
			@media all {
				property2: value2;
			}
		}
	`);
	let expected = `test {
	property1: value1;

	@media all {
		property2: value2;
	}
}`;
	assert.equal(actual, expected);
});

test("no trailing newline on empty nested rule", () => {
	let actual = format(`
		@layer test {
			empty {}
		}
	`);
	let expected = `@layer test {
	empty {}
}`;
	assert.equal(actual, expected);
});

test("formats Raw rule prelude", () => {
	let actual = format(`:lang("nl","de"),li:nth-child() {}`);
	let expected = `:lang("nl","de"),li:nth-child() {}`; // no formatting applied
	assert.equal(actual, expected);
});

test('formats nested rules with selectors starting with', () => {
	let actual = format(`
		selector {
			& > item {
				property: value;
			}
		}
	`);
	let expected = `selector {
	& > item {
		property: value;
	}
}`;
	assert.equal(actual, expected);
})

test("formats nested rules with a selector starting with &", () => {
	let actual = format(`
		selector {
			& a { color: red; }
		}
	`)
	let expected = `selector {
	& a {
		color: red;
	}
}`;
	assert.equal(actual, expected);
})

test.skip("Relaxed nesting: formats nested rules with a selector with a &", () => {
	let actual = format(`
		selector {
			a & { color:red }
		}
	`)
	let expected = `selector {
	a & {
		color: red;
	}
}`;
	assert.equal(actual, expected);
})

test.skip("Relaxed nesting: formats nested rules with a selector without a &", () => {
	let actual = format(`
		selector {
			a { color:red }
		}
	`)
	let expected = `selector {
	a {
		color: red;
	}
}`;
	assert.equal(actual, expected);
})

test.skip("Relaxed nesting: formats nested rules with a selector starting with a selector combinator", () => {
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
}`;
	assert.equal(actual, expected);
})

test.run();
