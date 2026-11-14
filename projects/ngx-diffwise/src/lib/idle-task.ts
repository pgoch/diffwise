/** Delay of a task in browsers that cannot tell when they are idle, such as Safari, in ms. */
const FALLBACK_DELAY = 300;

const FUNCTION_TYPE = 'function';

/** Cancels a task that has not run yet; after the task has run, it does nothing. */
export type CancelTask = () => void;

/**
 * Runs the task once the browser has nothing else to do, or after a short delay in browsers
 * without `requestIdleCallback`. The task is cancelled the way it was scheduled.
 */
export function runWhenIdle(task: () => void): CancelTask {
  const { requestIdleCallback, cancelIdleCallback } = globalThis;

  if (typeof requestIdleCallback !== FUNCTION_TYPE) {
    const timeout = setTimeout(task, FALLBACK_DELAY);
    return () => clearTimeout(timeout);
  }

  const handle = requestIdleCallback(() => task());

  return () => cancelIdleCallback(handle);
}
