import { parseResponse } from './parse';
import { prepareRequest } from './prepare';
import { sendRequest } from './transport';
import type { RequestSpec, SuccessPayload } from './types';

export type ClientHooks = {
  readToken: () => string | undefined;
};

export function createClient(hooks: ClientHooks) {
  return {
    async execute<T>(spec: RequestSpec): Promise<SuccessPayload<T>> {
      const prepared = prepareRequest(spec, spec.auth === false ? undefined : hooks.readToken());
      const response = await sendRequest(prepared.url, prepared.init);
      return parseResponse<T>(response);
    },
  };
}
