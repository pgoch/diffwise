import { defineConfig } from 'vitest/config';

// Tests of the diff engine: plain TypeScript, no Angular.
// Angular parts of the library run through `ng test` (see angular.json).
export default defineConfig({
  test: {
    include: ['projects/ngx-diffwise/src/engine/**/*.spec.ts'],
    environment: 'jsdom',
    globals: true,
  },
});
