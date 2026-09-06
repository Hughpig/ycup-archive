import { jsonResponse } from './d1';

export function tokenMatches(expected: string | undefined, actual: string | null | undefined): boolean {
  if (!expected || !actual) return false;
  const a = new Uint8Array(expected.length);
  const b = new Uint8Array(actual.length);
  for (let i = 0; i < a.length; i += 1) a[i] = expected.charCodeAt(i);
  for (let i = 0; i < b.length; i += 1) b[i] = actual.charCodeAt(i);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

export function readBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization') ?? '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() || null : null;
}

export function unauthorizedResponse(): Response {
  return jsonResponse({ ok: false, error: 'Unauthorized' }, { status: 401 });
}
