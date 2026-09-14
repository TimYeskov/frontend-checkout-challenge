import { AppError } from './errors';

export async function sendRequest(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new AppError({
      kind: 'network',
      message: 'Нет соединения с сервером. Проверьте сеть и повторите.',
    });
  }
}
