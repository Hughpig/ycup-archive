import { parseArgs } from 'node:util';

interface Options {
  date?: string;
  time?: string;
  id?: number;
  new?: boolean;
  problems?: number;
  title?: string;
  dryRun?: boolean;
}

const { values } = parseArgs({
  options: {
    date: { type: 'string' },
    time: { type: 'string' },
    id: { type: 'string' },
    new: { type: 'boolean', default: false },
    problems: { type: 'string' },
    title: { type: 'string' },
    dryRun: { type: 'boolean', default: false }
  }
});

const options: Options = {
  date: values.date,
  time: values.time,
  id: values.id ? Number(values.id) : undefined,
  new: Boolean(values.new),
  problems: values.problems ? Number(values.problems) : undefined,
  title: values.title,
  dryRun: Boolean(values.dryRun)
};

if (!options.date || !options.time) {
  console.error(
    'Usage: pnpm time:update -- --new --date 2026-09-10 --time 11:55 [--problems 10] [--title "Stage 1"]'
  );
  console.error('Or:   pnpm time:update -- --date 2026-09-10 --time 11:55 [--id 3]');
  process.exit(1);
}

const required = [
  process.env.CLOUDFLARE_API_TOKEN,
  process.env.CLOUDFLARE_ACCOUNT_ID,
  process.env.CLOUDFLARE_D1_DATABASE_ID
];
if (required.some((value) => !value)) {
  console.error('Missing CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, or CLOUDFLARE_D1_DATABASE_ID');
  process.exit(1);
}

const startMs = parseShanghai(options.date, options.time!);
const endMs = startMs + 40 * 60_000;

async function main(): Promise<void> {
  if (options.id && options.new) {
    throw new Error('Cannot pass both --id and --new');
  }
  if (options.problems !== undefined && (options.problems < 9 || options.problems > 13)) {
    throw new Error('Problem count must be between 9 and 13');
  }

  if (options.new) {
    const existing = await query<{ id: number }>(
      'SELECT id FROM contests WHERE scheduled_start_at > ? ORDER BY scheduled_start_at LIMIT 1',
      [Date.now()]
    );
    if (existing[0]) {
      throw new Error(
        'A future contest already exists. Update it without --new, or pass --id to update another contest.'
      );
    }
    if (options.dryRun) {
      console.log(
        `[dry-run] contest would be created with start ${options.date} ${options.time} UTC+8 and end ${formatShanghai(endMs)}`
      );
      return;
    }
    await createContest();
    return;
  }

  let contestId = options.id;
  if (!contestId) {
    const next = await query<{ id: number }>(
      `SELECT id FROM contests WHERE scheduled_start_at > ? ORDER BY scheduled_start_at LIMIT 1`,
      [Date.now()]
    );
    contestId = next[0]?.id;
  }
  if (!contestId) {
    throw new Error(
      'No future contest exists. Use --new to create one before adding teams in the web page.'
    );
  }

  const current = await query<{
    id: number;
    season_id: number;
    scheduled_start_at: number;
    scheduled_end_at: number;
    problem_count: number;
  }>('SELECT * FROM contests WHERE id = ?', [contestId]);
  if (!current[0]) throw new Error(`Contest ${contestId} not found`);

  if (options.dryRun) {
    console.log(
      `[dry-run] contest ${contestId} would start ${options.date} ${options.time} UTC+8 and end ${formatShanghai(endMs)}`
    );
    return;
  }

  const sets: string[] = [];
  const params: Array<number | string> = [];
  if (options.date || options.time) {
    sets.push('scheduled_start_at = ?', 'scheduled_end_at = ?');
    params.push(startMs, endMs);
  }
  if (options.problems !== undefined) {
    sets.push('problem_count = ?');
    params.push(options.problems);
  }
  if (options.title !== undefined) {
    sets.push('title = ?');
    params.push(options.title);
  }
  params.push(Date.now(), contestId);

  await runSql(
    `UPDATE contests SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`,
    params
  );

  const updated = await query<{
    id: number;
    title: string | null;
    scheduled_start_at: number;
    scheduled_end_at: number;
    problem_count: number;
  }>('SELECT * FROM contests WHERE id = ?', [contestId]);
  const row = updated[0];
  if (!row) throw new Error('Update succeeded but contest could not be read back');
  console.log(
    `Updated contest ${row.id} ${row.title ?? ''}: start ${formatShanghai(row.scheduled_start_at)}, ` +
      `end ${formatShanghai(row.scheduled_end_at)}, problems ${row.problem_count}`
  );
}

async function createContest(): Promise<void> {
  const stageRows = await query<{ next_stage: number }>(
    'SELECT COALESCE(MAX(stage_no), 0) + 1 AS next_stage FROM contests',
    []
  );
  const stageNo = stageRows[0]?.next_stage ?? 1;
  const problemCount = options.problems ?? 10;
  const title = options.title ?? `Stage ${stageNo}`;

  await runSql(
    `INSERT INTO contests
      (season_id, stage_no, title, scheduled_start_at, scheduled_end_at, problem_count, updated_at)
     VALUES (1, ?, ?, ?, ?, ?, ?)`,
    [stageNo, title, startMs, endMs, problemCount, Date.now()]
  );
  const created = await query<{
    id: number;
    title: string | null;
    scheduled_start_at: number;
    scheduled_end_at: number;
    problem_count: number;
  }>('SELECT * FROM contests WHERE scheduled_start_at = ?', [startMs]);
  const row = created[0];
  if (!row) throw new Error('Contest created but could not be read back');
  console.log(
    `Created contest ${row.id} ${row.title ?? ''}: start ${formatShanghai(row.scheduled_start_at)}, ` +
      `end ${formatShanghai(row.scheduled_end_at)}, problems ${row.problem_count}`
  );
}

function parseShanghai(date: string, time: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) {
    throw new Error(`Invalid Shanghai time: ${date} ${time}`);
  }
  return Date.parse(`${date}T${time}:00+08:00`);
}

function formatShanghai(epochMs: number): string {
  return new Date(epochMs + 8 * 60 * 60 * 1000).toISOString().slice(0, 16).replace('T', ' ');
}

interface QueryResult<T> {
  success: boolean;
  results: T[];
  errors: Array<{ message?: string }>;
  result?: Array<{ results: T[]; success: boolean }>;
}

async function query<T>(sql: string, params: Array<number | string>): Promise<T[]> {
  const body = await runCloudflareQuery(sql, params);
  const payload = body as QueryResult<T>;
  if (!payload.success) {
    throw new Error(payload.errors?.[0]?.message ?? 'Cloudflare query failed');
  }
  return payload.results ?? payload.result?.[0]?.results ?? [];
}

async function runSql(sql: string, params: Array<number | string>): Promise<void> {
  await runCloudflareQuery(sql, params);
}

async function runCloudflareQuery(sql: string, params: Array<number | string>): Promise<unknown> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/d1/database/${process.env.CLOUDFLARE_D1_DATABASE_ID}/query`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ sql, params })
    }
  );
  const body = (await response.json()) as unknown;
  if (!response.ok) {
    throw new Error(`Cloudflare request failed: ${JSON.stringify(body)}`);
  }
  return body;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
