import { TestBed } from '@angular/core/testing';

import { DiffwiseHtmlDiff } from './diffwise-html-diff';

describe('DiffwiseHtmlDiff', () => {
  it('creates the component', () => {
    const fixture = TestBed.createComponent(DiffwiseHtmlDiff);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
