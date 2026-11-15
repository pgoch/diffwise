import { runWhenIdle } from './idle-task';

const REQUEST_IDLE_CALLBACK = 'requestIdleCallback';
const CANCEL_IDLE_CALLBACK = 'cancelIdleCallback';
const IDLE_HANDLE = 7;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('runWhenIdle', () => {
  it('runs the task when the browser is idle, and cancels it by its handle', () => {
    const idleTasks: (() => void)[] = [];
    const cancel = vi.fn();
    const task = vi.fn();

    vi.stubGlobal(REQUEST_IDLE_CALLBACK, (callback: () => void) => {
      idleTasks.push(callback);
      return IDLE_HANDLE;
    });
    vi.stubGlobal(CANCEL_IDLE_CALLBACK, cancel);

    const cancelTask = runWhenIdle(task);

    expect(task).not.toHaveBeenCalled();

    idleTasks.forEach((idleTask) => idleTask());
    cancelTask();

    expect(task).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledWith(IDLE_HANDLE);
  });

  it('runs the task after a short delay where the browser cannot tell when it is idle', () => {
    const task = vi.fn();

    vi.useFakeTimers();
    vi.stubGlobal(REQUEST_IDLE_CALLBACK, undefined);
    runWhenIdle(task);
    vi.advanceTimersByTime(299);

    expect(task).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(task).toHaveBeenCalledOnce();
  });

  it('runs no task cancelled before its delay', () => {
    const task = vi.fn();

    vi.useFakeTimers();
    vi.stubGlobal(REQUEST_IDLE_CALLBACK, undefined);
    runWhenIdle(task)();
    vi.runAllTimers();

    expect(task).not.toHaveBeenCalled();
  });
});
