import { AppError } from './errors';
import type { FieldError, SuccessPayload } from './types';

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds) * 1000;
  const date = Date.parse(header);
  if (!Number.isFinite(date)) return undefined;
  return Math.max(0, date - Date.now());
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function readFields(value: unknown): FieldError[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const fields: FieldError[] = [];
  for (let i = 0; i < value.length; i++) {
    const item = asRecord(value[i]);
    if (!item || typeof item.path !== 'string' || typeof item.message !== 'string') continue;
    fields.push({ path: item.path, message: item.message });
  }
  return fields.length ? fields : undefined;
}

export async function parseResponse<T>(response: Response): Promise<SuccessPayload<T>> {
  const requestId = response.headers.get('X-Request-Id') ?? undefined;
  const location = response.headers.get('Location') ?? undefined;
  const retryAfterMs = parseRetryAfter(response.headers.get('Retry-After'));
  const status = response.status;

  if (status === 204 || status === 304) {
    return { status, data: undefined as T, requestId, location, retryAfterMs };
  }

  let text: string;
  try {
    text = await response.text();
  } catch {
    throw new AppError({
      kind: 'parse',
      status,
      requestId,
      message: 'Не удалось прочитать ответ сервера.',
    });
  }

  if (!text) {
    if (status >= 200 && status < 300) {
      return { status, data: undefined as T, requestId, location, retryAfterMs };
    }
    throw new AppError({
      kind: 'http',
      status,
      requestId,
      message: 'Сервер вернул ошибку без описания.',
    });
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new AppError({
      kind: 'parse',
      status,
      requestId,
      message: 'Ответ сервера имеет неверный формат.',
    });
  }

  const envelope = asRecord(json);
  if (status >= 200 && status < 300) {
    if (!envelope || !('data' in envelope)) {
      throw new AppError({
        kind: 'parse',
        status,
        requestId,
        message: 'Ответ сервера не содержит данных.',
      });
    }
    return {
      status,
      data: envelope.data as T,
      requestId: (asRecord(envelope.meta)?.requestId as string | undefined) ?? requestId,
      location,
      retryAfterMs,
      links: envelope.links as SuccessPayload<T>['links'],
    };
  }

  const errorBody = asRecord(asRecord(json)?.error);
  throw new AppError({
    kind: 'http',
    status,
    requestId: (asRecord(asRecord(json)?.meta)?.requestId as string | undefined) ?? requestId,
    code: typeof errorBody?.code === 'string' ? errorBody.code : undefined,
    message:
      typeof errorBody?.message === 'string'
        ? errorBody.message
        : 'Не удалось выполнить запрос. Повторите попытку.',
    fields: readFields(errorBody?.fields),
  });
}
