import type { TableCell } from '../model';

/** The columns that a cell spans. */
export function columnsOf({ column, columnSpan }: TableCell): number[] {
  return Array.from({ length: columnSpan }, (_, offset) => column + offset);
}

/** True when the cell spans the column. */
export function takesColumn({ column, columnSpan }: TableCell, wanted: number): boolean {
  return wanted >= column && wanted < column + columnSpan;
}
