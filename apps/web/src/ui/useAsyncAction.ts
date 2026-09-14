import { useEffect, useRef, useState } from 'react';
import { isAbortError, toAppError, type AppError } from '../http';

export function useAsyncAction() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const generation = useRef(0);
  const busy = useRef(false);

  useEffect(
    () => () => {
      generation.current += 1;
      busy.current = false;
    },
    [],
  );

  return {
    pending,
    error,
    setError,
    async run<T>(action: () => Promise<T>): Promise<T | undefined> {
      if (busy.current) return undefined;
      busy.current = true;
      const current = (generation.current += 1);
      setPending(true);
      setError(null);
      try {
        const result = await action();
        if (current !== generation.current) return undefined;
        return result;
      } catch (value) {
        if (current !== generation.current || isAbortError(value)) return undefined;
        setError(toAppError(value));
        return undefined;
      } finally {
        if (current === generation.current) {
          busy.current = false;
          setPending(false);
        }
      }
    },
  };
}
