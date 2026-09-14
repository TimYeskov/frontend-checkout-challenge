import { apiBaseUrl } from './config';
import type { PreparedRequest, RequestSpec } from './types';

export type TokenReader = () => string | undefined;

export function prepareRequest(spec: RequestSpec, token: string | undefined): PreparedRequest {
  const headers = new Headers();
  if (spec.body !== undefined) headers.set('Content-Type', 'application/json');
  if (spec.auth !== false && token) headers.set('Authorization', `Bearer ${token}`);
  if (spec.idempotencyKey) headers.set('Idempotency-Key', spec.idempotencyKey);

  return {
    url: `${apiBaseUrl}${spec.path}`,
    init: {
      method: spec.method,
      headers,
      body: spec.body === undefined ? undefined : JSON.stringify(spec.body),
      signal: spec.signal,
      cache: 'no-store',
      credentials: 'omit',
    },
  };
}
