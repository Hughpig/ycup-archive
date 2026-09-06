export type D1Value = string | number | boolean | null;

export interface D1Prepared {
  bind(...values: D1Value[]): D1Prepared;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[]; success: boolean }>;
  run(): Promise<{
    success: boolean;
    meta: { last_row_id: number; changes: number };
  }>;
}

export interface D1BatchResult<T = Record<string, unknown>> {
  success: boolean;
  results: T[];
  meta: { last_row_id: number; changes: number };
}

export interface D1Database {
  prepare(sql: string): D1Prepared;
  batch<T = Record<string, unknown>>(statements: D1Prepared[]): Promise<D1BatchResult<T>[]>;
}

export interface Env {
  DB: D1Database;
  ADMIN_WRITE_TOKEN: string;
}

export interface ApiContext<EnvT extends Env = Env> {
  request: Request;
  env: EnvT;
  data: Record<string, unknown>;
  next: () => Promise<Response>;
  params: Record<string, string | string[]>;
}

export type ApiFunction<EnvT extends Env = Env> = (
  context: ApiContext<EnvT>
) => Response | Promise<Response>;

export function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...(init?.headers ?? {})
    }
  });
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function handleApiError(error: unknown): Response {
  if (error instanceof ApiError) {
    return jsonResponse({ ok: false, error: error.message }, { status: error.status });
  }
  return jsonResponse(
    { ok: false, error: error instanceof Error ? error.message : 'Internal error' },
    { status: 500 }
  );
}
