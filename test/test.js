import { suite } from "uvu";
import * as assert from "uvu/assert";
import { format } from "../index.js";

let Stylesheet = suite("Stylesheet");

Stylesheet("empty input", () => {
	let actual = format(``);
	let expected = ``;
	assert.equal(actual, expected);
});

Stylesheet('handles invalid input', () => {
	let actual = format(`;`)
	let expected = `;`

	assert.equal(actual, expected)
})

Stylesheet("handles comments", () => {
	let actual = format(`
.async-hide {
	opacity: 0;
}

/*!
 * Library vx.x.x (http://css-lib.com)
 * Copyright 1970-1800 CSS Inc.
 * Licensed under MIT (https://example.com)
 */

/*! normalize.css v3.0.3 | MIT License | github.com/necolas/normalize.css */

html /* comment */ {
	font-family /* comment */ : /* comment */ sans-serif;
	-webkit-text-size-adjust: 100%;
	-ms-text-size-adjust: 100%;
}
	`);
	let expected = `.async-hide {
	opacity: 0;
}

/*!
 * Library vx.x.x (http://css-lib.com)
 * Copyright 1970-1800 CSS Inc.
 * Licensed under MIT (https://example.com)
 */

/*! normalize.css v3.0.3 | MIT License | github.com/necolas/normalize.css */

html {
	font-family: sans-serif;
	-webkit-text-size-adjust: 100%;
	-ms-text-size-adjust: 100%;
}`;

	assert.equal(actual, expected);
});

Stylesheet("css nesting chaos", () => {
	let actual = format(`
/**
 * Comment!
 */
no-layer-1, no-layer-2 { color: red; font-size: 1rem; COLOR: green; }
@layer components, deep;
@layer base { layer-base { color: green; } }
@layer { @layer named { anon-named { line-height: 1 } }}
@media (min-width: 1000px) {
  @layer desktop { layer-desktop { color: blue; } }
  @layer { layer-anon, no-2 { line-height: 1; } }
  @layer test {}
  @supports (min-width: 1px) {
    @layer deep { layer-deep {} }
  }
}
test { line-height: 1}
@layer components {
  @layer alert {}
  @layer table {
    @layer tbody, thead;
    layer-components-table { color: yellow; }
    @layer tbody { tbody { border: 1px solid; background: red; } }
    @media (min-width: 30em) {
      @supports (display: grid) {
        @layer thead { thead { border: 1px solid; } }
      }
    }
  }
}
@layer components.breadcrumb { layer-components-breadcrumb { } }

@font-face {
  font-family: "Test";
  src: url(some-url.woff2);
}

;;;;;;;;;;;;;;;;;;;
`);
	let expected = `no-layer-1,
no-layer-2 {
	color: red;
	font-size: 1rem;
	color: green;
}

@layer components, deep;

@layer base {
	layer-base {
		color: green;
	}
}

@layer {
	@layer named {
		anon-named {
			line-height: 1;
		}
	}
}

@media (min-width: 1000px) {
	@layer desktop {
		layer-desktop {
			color: blue;
		}
	}

	@layer {
		layer-anon,
		no-2 {
			line-height: 1;
		}
	}

	@layer test {}

	@supports (min-width: 1px) {
		@layer deep {
			layer-deep {}
		}
	}
}

test {
	line-height: 1;
}

@layer components {
	@layer alert {}

	@layer table {
		@layer tbody, thead;

		layer-components-table {
			color: yellow;
		}

		@layer tbody {
			tbody {
				border: 1px solid;
				background: red;
			}
		}

		@media (min-width: 30em) {
			@supports (display: grid) {
				@layer thead {
					thead {
						border: 1px solid;
					}
				}
			}
		}
	}
}

@layer components.breadcrumb {
	layer-components-breadcrumb {}
}

@font-face {
	font-family: "Test";
	src: url(some-url.woff2);
}

;;;;;;;;;;;;;;;;;;;`;
	assert.equal(actual, expected);
});

Stylesheet.run();
