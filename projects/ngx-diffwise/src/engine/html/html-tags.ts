/** `h1` to `h6`. */
export const HEADING_TAGS: ReadonlySet<string> = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

/** Blocks whose inner blocks become separate lines, such as a quote with paragraphs. */
export const CONTAINER_TAGS: ReadonlySet<string> = new Set([
  'article',
  'aside',
  'blockquote',
  'center',
  'div',
  'footer',
  'header',
  'main',
  'nav',
  'section',
]);

/** Blocks read as one paragraph: `p`, or a container without blocks inside. */
export const PARAGRAPH_TAGS: ReadonlySet<string> = new Set(['p', ...CONTAINER_TAGS]);

/** Tags that start a block; all other tags are inline. */
export const BLOCK_TAGS: ReadonlySet<string> = new Set([
  ...HEADING_TAGS,
  ...PARAGRAPH_TAGS,
  'address',
  'caption',
  'dd',
  'details',
  'dl',
  'dt',
  'fieldset',
  'figcaption',
  'figure',
  'hgroup',
  'hr',
  'legend',
  'li',
  'menu',
  'ol',
  'pre',
  'summary',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'ul',
]);

/** Elements a reader sees even without text, such as an image. */
export const VISIBLE_WITHOUT_TEXT_TAGS: ReadonlySet<string> = new Set([
  'audio',
  'button',
  'canvas',
  'hr',
  'img',
  'input',
  'math',
  'meter',
  'picture',
  'progress',
  'select',
  'svg',
  'textarea',
  'video',
]);

/** Elements that separate the surrounding words, such as blocks and images. */
export const WORD_BREAK_TAGS: ReadonlySet<string> = new Set([
  ...BLOCK_TAGS,
  ...VISIBLE_WITHOUT_TEXT_TAGS,
  'br',
]);

/** Elements that show whitespace as typed. */
export const PRESERVE_WHITESPACE_TAGS: ReadonlySet<string> = new Set(['pre', 'textarea']);

/** Form controls; the sanitizer disables them. */
export const FORM_CONTROL_TAGS: ReadonlySet<string> = new Set([
  'button',
  'input',
  'select',
  'textarea',
]);
