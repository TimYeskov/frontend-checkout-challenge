import { useEffect, useRef, useState } from 'react';
import { isAbortError, toAppError, type AppError } from '../http';

export function useAsyncAction() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const generation = useRef(0);

  useEffect(
    () => () => {
      generation.current += 1;
    },
    [],
  );

  return {
    pending,
    error,
    setError,
    async run<T>(action: () => Promise<T>): Promise<T | undefined> {
      const current = (generation.current += 1);
      setPending(true);
      setError(null);
      try {
        const result = await action();
        if (current !== generation.current) return undefined;
        setPending(false);
        return result;
      } catch (value) {
        if (current !== generation.current || isAbortError(value)) return undefined;
        const next = toAppError(value);
        setError(next);
        setPending(false);
        return undefined;
      }
    },
  };
}
