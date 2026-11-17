import { provideZonelessChangeDetection } from '@angular/core';

// Pages are tested without zone.js, the way the app runs them.
export default [provideZonelessChangeDetection()];
