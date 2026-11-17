import { COLUMN_GROUP_TAG, TABLE_CELL_TAGS, TABLE_ROW_GROUP_TAGS } from './html-tags';

/** True when the element is a table cell. */
export function isCell(element: Element): element is HTMLTableCellElement {
  return TABLE_CELL_TAGS.has(element.localName);
}

/** True when the element is the head, a body or the foot of a table. */
export function isRowGroup(element: Element): boolean {
  return TABLE_ROW_GROUP_TAGS.has(element.localName);
}

/** True when the element is a group of columns. */
export function isColumnGroup(element: Element): boolean {
  return element.localName === COLUMN_GROUP_TAG;
}
