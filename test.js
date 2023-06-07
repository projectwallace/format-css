import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { format } from './index.js'

test('format.rule', () => {
	let actual = format(`
/**
 * Comment!
 */
no-layer-1, no-layer-2 { color: red; font-size: 1rem; COLOR: green; }
@layer components, deep;
@layer base { layer-base { color: green; } }
@layer { @layer named { anon-named { test: 1 } }}
@media (min-width: 1000px) {
  @layer desktop { layer-desktop { color: blue; } }
  @layer { layer-anon, no-2 { anonymous: 1; } }
  @layer test {}
  @supports (min-width: 1px) {
    @layer deep { layer-deep {} }
  }
}
test { a: 1}
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
`)
	let expected = `
no-layer-1,
no-layer-2 {
	color: red;
	font-size: 1rem;
	COLOR: green;
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
			test: 1;
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
			anonymous: 1;
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
	a: 1;
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

;;;;;;;;;;;;;;;;;;;


`.trimStart()
	assert.equal(actual, expected);
});

test.run();