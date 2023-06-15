import parse from 'css-tree/parser'

/**
 * Indent a string
 * @param {number} size
 * @returns A string with {size} tabs
 */
function indent(size) {
	return '\t'.repeat(size)
}

/**
 * @param {import('css-tree').CssNode} node
 * @param {string} css
 * @returns A portion of the CSS
 */
function substr(node, css) {
	if (node.loc) {
		return css.substring(node.loc.start.offset, node.loc.end.offset)
	}
	return ''
}

/**
 *
 * @param {import('css-tree').Rule} node
 * @param {number} indent_level
 * @param {string} css
 * @returns {string} A formatted Rule
 */
function print_rule(node, indent_level, css) {
	let buffer = ''

	if (node.prelude !== null && node.prelude.type === 'SelectorList') {
		buffer += print_selectorlist(node.prelude, indent_level, css)
	}

	if (node.block !== null && node.block.type === 'Block') {
		buffer += print_block(node.block, indent_level, css)
	}

	return buffer
}

/**
 * @param {import('css-tree').SelectorList} node
 * @param {number} indent_level
 * @param {string} css
 * @returns {string} A formatted SelectorList
 */
function print_selectorlist(node, indent_level, css) {
	let buffer = ''

	for (let selector of node.children) {
		if (selector !== node.children.first) {
			buffer += '\n'
		}

		if (selector.type === 'Selector') {
			buffer += print_selector(selector, indent_level, css)
		} else {
			buffer += print_unknown(selector, indent_level, css)
		}

		if (selector !== node.children.last) {
			buffer += ','
		}
	}
	return buffer
}

/**
 *
 * @param {import('css-tree').Selector} node
 * @param {number} indent_level
 * @param {string} css
 * @returns {string} A formatted Selector
 */
function print_selector(node, indent_level, css) {
	return indent(indent_level) + substr(node, css)
}

/**
 * @param {import('css-tree').Block} node
 * @param {number} indent_level
 * @param {string} css
 * @returns {string} A formatted Block
 */
function print_block(node, indent_level, css) {
	let children = node.children

	if (children.isEmpty) {
		return ' {}'
	}

	let buffer = ' {\n'

	indent_level++

	let prev_type

	for (let child of children) {
		if (child.type === 'Declaration') {
			buffer += print_declaration(child, indent_level, css)
		} else if (child.type === 'Rule') {
			if (prev_type !== undefined && prev_type === 'Declaration') {
				buffer += '\n'
			}
			buffer += print_rule(child, indent_level, css)
		} else if (child.type === 'Atrule') {
			if (prev_type !== undefined && prev_type === 'Declaration') {
				buffer += '\n'
			}
			buffer += print_atrule(child, indent_level, css)
		} else {
			buffer += print_unknown(child, indent_level, css)
		}

		if (child !== children.last) {
			if (child.type === 'Declaration') {
				buffer += '\n'
			} else {
				buffer += '\n\n'
			}
		}

		prev_type = child.type
	}

	indent_level--

	buffer += '\n'
	buffer += indent(indent_level)
	buffer += '}'

	return buffer
}

/**
 * @param {import('css-tree').Atrule} node
 * @param {number} indent_level
 * @param {string} css
 * @returns {string} A formatted Atrule
 */
function print_atrule(node, indent_level, css) {
	let buffer = indent(indent_level)
	buffer += '@' + node.name

	// @font-face has no prelude
	if (node.prelude) {
		buffer += ' ' + substr(node.prelude, css)
	}

	if (node.block && node.block.type === 'Block') {
		buffer += print_block(node.block, indent_level, css)
	} else {
		// `@import url(style.css);` has no block, neither does `@layer layer1;`
		buffer += ';'
	}

	return buffer
}

/**
 * @param {import('css-tree').Declation} node
 * @param {number} indent_level
 * @param {string} css
 * @returns {string} A formatted Declaration
 */
function print_declaration(node, indent_level, css) {
	return indent(indent_level) + node.property + ': ' + substr(node.value, css) + ';'
}

/**
 * @param {import('css-tree').CssNode} node
 * @param {number} indent_level
 * @param {string} css
 * @returns {string} A formatted unknown CSS string
 */
function print_unknown(node, indent_level, css) {
	return indent(indent_level) + substr(node, css).trim()
}

/**
 * @param {import('css-tree').Stylesheet} node
 * @param {number} indent_level
 * @param {string} css
 * @returns {string} A formatted Stylesheet
 */
function print(node, indent_level = 0, css) {
	let buffer = ''
	let children = node.children

	for (let child of children) {
		if (child.type === 'Rule') {
			buffer += print_rule(child, indent_level, css)
		} else if (child.type === 'Atrule') {
			buffer += print_atrule(child, indent_level, css)
		} else {
			buffer += print_unknown(child, indent_level, css)
		}

		if (child !== children.last) {
			buffer += '\n\n'
		}
	}

	return buffer
}

/**
 * Take a string of CSS (minified or not) and format it with some simple rules
 * @param {string} css The original CSS
 * @returns {string} The newly formatted CSS
 */
export function format(css) {
	let ast = parse(css, {
		positions: true,
		parseAtrulePrelude: false,
		parseCustomProperty: false,
		parseValue: false,
	})
	return print(ast, 0, css)
}
