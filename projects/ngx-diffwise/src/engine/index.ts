export { diffHtml } from './diff-html';
export { diffText } from './diff-text';
export {
  CHANGE_DETAILS_ATTRIBUTE,
  type ChangeDetail,
  ChangeDetailKind,
  type Comparison,
  type ComparisonSettings,
  DEFAULT_DIFF_OPTIONS,
  DETAIL_INDEX_SEPARATOR,
  type DiffOptions,
  type DiffStats,
  DocumentVersion,
  type FormattingChangeDetail,
  FormattingValue,
  type FormattingValueChange,
  type ImageChangeDetail,
  type ImageProperties,
  ImageProperty,
  LineChangeKind,
  type LinkChangeDetail,
  type SingleColumnRow,
  type SingleColumnSettings,
  type SingleColumnTablePlace,
  TextStyle,
  type ViewLine,
  type ViewRow,
} from './model';
export { type ChangeBlock, areChangeBlocksEqual, changeBlocks } from './view/change-blocks';
export {
  type CollapseSettings,
  type CollapsibleRow,
  HiddenLines,
  collapseRows,
} from './view/collapse-rows';
export { singleColumnRows } from './view/single-column-rows';
