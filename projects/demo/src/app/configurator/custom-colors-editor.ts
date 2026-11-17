import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import type { DiffwiseDiffColors } from 'ngx-diffwise';

import { ConfiguratorState } from './configurator-state';

/** The colors of one theme. */
type ThemeColors = NonNullable<DiffwiseDiffColors['light']>;

/** The name of a color of changes, such as `addedAccent`. */
type ColorName = keyof ThemeColors;

/** The name of a theme. */
type ThemeName = keyof DiffwiseDiffColors;

/** A row or a column of the table, with its name as people say it. */
interface Named<T> {
  readonly name: T;
  readonly label: string;
}

const COLORS: readonly Named<ColorName>[] = [
  { name: 'removedLine', label: 'Removed line' },
  { name: 'removedHighlight', label: 'Removed words' },
  { name: 'removedAccent', label: 'Removed accent' },
  { name: 'addedLine', label: 'Added line' },
  { name: 'addedHighlight', label: 'Added words' },
  { name: 'addedAccent', label: 'Added accent' },
];

const THEMES: readonly Named<ThemeName>[] = [
  { name: 'light', label: 'Light theme' },
  { name: 'dark', label: 'Dark theme' },
];

/** The colors a color starts with when it is ticked: magenta and teal, as in the documentation. */
const FIRST_COLORS: Required<DiffwiseDiffColors> = {
  light: {
    removedLine: '#fbeefe',
    removedHighlight: '#efc0f6',
    removedAccent: '#a21caf',
    addedLine: '#e6f7f5',
    addedHighlight: '#a5e2d9',
    addedAccent: '#0f766e',
  },
  dark: {
    removedLine: '#2a1730',
    removedHighlight: '#6b2a78',
    removedAccent: '#f0abfc',
    addedLine: '#10251f',
    addedHighlight: '#1f5f55',
    addedAccent: '#5eead4',
  },
};

/** Separates the name of a color and of its theme in the names of the fields. */
const LABEL_SEPARATOR = ', ';

/**
 * The colors of changes of an app, `diffColors`: six colors in the light and in the dark theme.
 * A color is in the configuration while it is ticked; the others come from the palette.
 */
@Component({
  selector: 'demo-custom-colors-editor',
  template: `
    <table class="colors">
      <thead>
        <tr>
          <td></td>
          @for (theme of themes; track theme.name) {
            <th scope="col">{{ theme.label }}</th>
          }
        </tr>
      </thead>
      <tbody>
        @for (color of colors; track color.name) {
          <tr>
            <th scope="row">{{ color.label }}</th>
            @for (theme of themes; track theme.name) {
              <td>
                <span class="color">
                  <input
                    type="checkbox"
                    [attr.aria-label]="labelOf(color, theme)"
                    [checked]="colorOf(theme.name, color.name) !== undefined"
                    (change)="tick(theme.name, color.name, $event)"
                  />
                  <input
                    type="color"
                    [attr.aria-label]="labelOf(color, theme)"
                    [value]="
                      colorOf(theme.name, color.name) ?? firstColorOf(theme.name, color.name)
                    "
                    [disabled]="colorOf(theme.name, color.name) === undefined"
                    (input)="pick(theme.name, color.name, $event)"
                  />
                </span>
              </td>
            }
          </tr>
        }
      </tbody>
    </table>
  `,
  styles: `
    .colors {
      border-collapse: collapse;
      font-size: 13.5px;
    }

    th,
    td {
      padding: 3px 10px 3px 0;
      text-align: start;
    }

    thead th {
      color: var(--site-muted);
      font-size: 12px;
      font-weight: 600;
    }

    tbody th {
      font-weight: 400;
    }

    .color {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    input[type='color'] {
      width: 34px;
      height: 24px;
      padding: 1px;
      border: 1px solid var(--site-border);
      border-radius: 4px;
      background: #fff;
      cursor: pointer;
    }

    input[type='color']:disabled {
      opacity: 0.35;
      cursor: default;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomColorsEditor {
  /** The rows of the table. */
  protected readonly colors = COLORS;

  /** The columns of the table. */
  protected readonly themes = THEMES;

  private readonly state = inject(ConfiguratorState);

  /** The color of the app in the theme; `undefined` when the palette gives it. */
  protected colorOf(theme: ThemeName, color: ColorName): string | undefined {
    return this.state.valueOf('diffColors')?.[theme]?.[color];
  }

  /** The color a color starts with when it is ticked. */
  protected firstColorOf(theme: ThemeName, color: ColorName): string {
    return FIRST_COLORS[theme][color] ?? '';
  }

  /** The name of the fields of a color in a theme, such as "Added accent, light theme". */
  protected labelOf(color: Named<ColorName>, theme: Named<ThemeName>): string {
    return color.label + LABEL_SEPARATOR + theme.label.toLowerCase();
  }

  /** Puts the color in the configuration with its first value, or takes it out. */
  protected tick(theme: ThemeName, color: ColorName, event: Event): void {
    const { checked } = event.target as HTMLInputElement;
    const value = checked ? this.firstColorOf(theme, color) : undefined;

    this.setColor(theme, color, value);
  }

  /** Puts the picked value of the color in the configuration. */
  protected pick(theme: ThemeName, color: ColorName, event: Event): void {
    const { value } = event.target as HTMLInputElement;

    this.setColor(theme, color, value);
  }

  /** Changes one color; a theme without any colors and colors without any theme are left out. */
  private setColor(theme: ThemeName, color: ColorName, value: string | undefined): void {
    const diffColors = this.state.valueOf('diffColors') ?? {};
    const themeColors: ThemeColors = { ...diffColors[theme], [color]: value };
    const setColors = Object.entries(themeColors).filter(([, setValue]) => setValue !== undefined);
    const changed = { ...diffColors, [theme]: Object.fromEntries(setColors) };
    const setThemes = Object.entries(changed).filter(
      ([, colors]) => Object.keys(colors ?? {}).length > 0,
    );

    const colorsOfThemes: DiffwiseDiffColors = Object.fromEntries(setThemes);

    this.state.setOption('diffColors', colorsOfThemes);
  }
}
