/** A choice of a group of buttons or of a list, such as a value of an option. */
export interface Choice<T> {
  readonly value: T;
  readonly label: string;
}
