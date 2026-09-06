import { jsonResponse, type ApiFunction } from '../../lib/d1';

export const onRequestGet: ApiFunction = async () => {
  return jsonResponse({ ok: true });
};
