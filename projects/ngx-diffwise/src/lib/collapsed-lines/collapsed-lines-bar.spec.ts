import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { CollapsedLinesBar } from './collapsed-lines-bar';

const COUNT_INPUT = 'count';
const TEXT_INPUT = 'text';
const BAR_SELECTOR = '.diffwise-html-diff__collapsed-lines';
const SHOW_HIDDEN_LINES_TEXT = 'Show hidden lines: {count}';

/** Renders a bar for the number of hidden lines, with the text of the interface. */
function render(count: number): ComponentFixture<CollapsedLinesBar> {
  const fixture = TestBed.createComponent(CollapsedLinesBar);

  fixture.componentRef.setInput(COUNT_INPUT, count);
  fixture.componentRef.setInput(TEXT_INPUT, SHOW_HIDDEN_LINES_TEXT);
  fixture.detectChanges();

  return fixture;
}

function buttonOf(fixture: ComponentFixture<CollapsedLinesBar>): HTMLButtonElement {
  return (fixture.nativeElement as HTMLElement).querySelector(BAR_SELECTOR) as HTMLButtonElement;
}

describe('CollapsedLinesBar', () => {
  it('shows its text with the number of hidden lines', () => {
    const fixture = render(25);

    expect(buttonOf(fixture).textContent?.trim()).toBe('Show hidden lines: 25');

    fixture.componentRef.setInput(COUNT_INPUT, 3);
    fixture.detectChanges();

    expect(buttonOf(fixture).textContent?.trim()).toBe('Show hidden lines: 3');
  });

  it('asks to show the hidden lines on a click', () => {
    const fixture = render(3);
    const showLines = vi.fn();

    fixture.componentInstance.showLines.subscribe(showLines);
    buttonOf(fixture).click();

    expect(showLines).toHaveBeenCalledOnce();
  });
});
