import { jsonResponse, type ApiFunction } from '../../lib/d1';
import { readBearerToken, tokenMatches } from '../../lib/auth';

export const onRequest: ApiFunction = async ({ request, env, next, data }) => {
  if (request.method === 'OPTIONS') {
    return jsonResponse({ ok: true }, { status: 204 });
  }

  const token = readBearerToken(request);
  if (!tokenMatches(env.ADMIN_WRITE_TOKEN, token)) {
    return jsonResponse({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  data.admin = true;
  return next();
};
