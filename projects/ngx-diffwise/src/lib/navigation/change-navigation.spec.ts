import { scrollRowsIntoView } from './change-navigation';

const DIV_TAG = 'div';
const STICKY_POSITION = 'sticky';
const STATIC_POSITION = 'static';
const WIDTH = 600;
const TOOLBAR_HEIGHT = 40;
const ROW_TOP = 300;
const ROW_HEIGHT = 20;

/** An element with the given box, in the page; jsdom lays out nothing. */
function elementAt(top: number, height: number): HTMLElement {
  const element = document.createElement(DIV_TAG);

  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({ x: 0, y: top, width: WIDTH, height }),
  );
  document.body.append(element);

  return element;
}

/** The scroll margin above a row while it scrolls into view, with the toolbar in the position. */
function marginWhileScrolling(position: string): string {
  const toolbar = elementAt(0, TOOLBAR_HEIGHT);
  const row = elementAt(ROW_TOP, ROW_HEIGHT);
  const margins: string[] = [];

  toolbar.style.position = position;

  row.scrollIntoView = (): void => {
    margins.push(row.style.scrollMarginTop);
  };

  scrollRowsIntoView(row, row, toolbar);

  return margins[0];
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe('scrollRowsIntoView', () => {
  it('keeps the rows below a sticky toolbar, and leaves no room for one that scrolls away', () => {
    expect(marginWhileScrolling(STICKY_POSITION)).toBe(`${TOOLBAR_HEIGHT}px`);
    expect(marginWhileScrolling(STATIC_POSITION)).toBe('0px');
  });
});
