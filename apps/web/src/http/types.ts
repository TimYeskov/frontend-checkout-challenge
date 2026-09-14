export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type RequestSpec = {
  method: HttpMethod;
  path: string;
  body?: unknown;
  auth?: boolean;
  idempotencyKey?: string;
  signal?: AbortSignal;
};

export type PreparedRequest = {
  url: string;
  init: RequestInit;
};

export type FieldError = { path: string; message: string };

export type ApiFailure = {
  kind: 'network' | 'http' | 'parse';
  message: string;
  status?: number;
  code?: string;
  fields?: FieldError[];
  requestId?: string;
};

export type SuccessPayload<T> = {
  status: number;
  data: T;
  requestId?: string;
  location?: string;
  retryAfterMs?: number;
  links?: Record<string, { href: string; method: string }>;
};
