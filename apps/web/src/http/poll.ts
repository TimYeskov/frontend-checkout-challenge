import { isAbortError } from './errors';

export type PollOptions<T> = {
  load: (signal: AbortSignal) => Promise<{ value: T; retryAfterMs?: number }>;
  isDone: (value: T) => boolean;
  onValue: (value: T) => void;
  signal?: AbortSignal;
  intervalMs?: number;
  initialDelayMs?: number;
};

function wait(ms: number, signal: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
    };
    if (signal.aborted) {
      window.clearTimeout(timer);
      onAbort();
      return;
    }
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

export async function pollUntil<T>(options: PollOptions<T>): Promise<T | undefined> {
  const controller = new AbortController();
  const onParentAbort = () => controller.abort();
  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort();
      return undefined;
    }
    options.signal.addEventListener('abort', onParentAbort, { once: true });
  }

  try {
    if (options.initialDelayMs) await wait(options.initialDelayMs, controller.signal);
    while (!controller.signal.aborted) {
      const result = await options.load(controller.signal);
      if (controller.signal.aborted) return undefined;
      options.onValue(result.value);
      if (options.isDone(result.value)) return result.value;
      await wait(result.retryAfterMs ?? options.intervalMs ?? 800, controller.signal);
    }
  } catch (error) {
    if (isAbortError(error) || controller.signal.aborted) return undefined;
    throw error;
  } finally {
    options.signal?.removeEventListener('abort', onParentAbort);
    if (!controller.signal.aborted) controller.abort();
  }
  return undefined;
}
