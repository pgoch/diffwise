import { TextStyle } from '../model';

/** `h1` to `h6`. */
export const HEADING_TAGS: ReadonlySet<string> = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

/** A paragraph. */
export const PARAGRAPH_TAG = 'p';

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
export const PARAGRAPH_TAGS: ReadonlySet<string> = new Set([PARAGRAPH_TAG, ...CONTAINER_TAGS]);

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

/** An image; it is one character of the reader text, so it is compared like a word. */
export const IMAGE_TAG = 'img';

/** Holds the sources of an image together with the image itself. */
export const PICTURE_TAG = 'picture';

/** Elements a reader sees even without text, such as an image. */
export const VISIBLE_WITHOUT_TEXT_TAGS: ReadonlySet<string> = new Set([
  'audio',
  'button',
  'canvas',
  'hr',
  IMAGE_TAG,
  'input',
  'math',
  'meter',
  PICTURE_TAG,
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

/** Elements where a change marker would move out, vanish or show as text when parsed again. */
export const NO_MARKER_TAGS: ReadonlySet<string> = new Set([
  'colgroup',
  'optgroup',
  'option',
  'select',
  'table',
  'tbody',
  'textarea',
  'tfoot',
  'thead',
  'tr',
]);

/** Form controls; the sanitizer disables them. */
export const FORM_CONTROL_TAGS: ReadonlySet<string> = new Set([
  'button',
  'input',
  'select',
  'textarea',
]);

/** Tags that format text, and the style each gives; tags of the same look give the same style. */
export const STYLE_TAGS: ReadonlyMap<string, TextStyle> = new Map([
  ['b', TextStyle.Bold],
  ['strong', TextStyle.Bold],
  ['i', TextStyle.Italic],
  ['em', TextStyle.Italic],
  ['u', TextStyle.Underline],
  ['ins', TextStyle.Underline],
  ['s', TextStyle.Strikethrough],
  ['strike', TextStyle.Strikethrough],
  ['del', TextStyle.Strikethrough],
  ['sup', TextStyle.Superscript],
  ['sub', TextStyle.Subscript],
  ['code', TextStyle.Code],
  ['kbd', TextStyle.Code],
  ['samp', TextStyle.Code],
  ['tt', TextStyle.Code],
  ['pre', TextStyle.Code],
  ['mark', TextStyle.TextHighlight],
  ['small', TextStyle.SmallText],
]);

/** Blocks whose `align` attribute aligns their text; on a table it places the table instead. */
export const ALIGN_ATTRIBUTE_TAGS: ReadonlySet<string> = new Set([
  ...HEADING_TAGS,
  PARAGRAPH_TAG,
  'div',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
]);
