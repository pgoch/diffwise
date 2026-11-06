import { provideZonelessChangeDetection } from '@angular/core';

// Components are tested without zone.js, the way the demo app runs them.
export default [provideZonelessChangeDetection()];
