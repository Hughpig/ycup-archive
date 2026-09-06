import type { D1Database } from '../../functions/lib/d1';
import { finalizeContestIfReady } from '../../functions/lib/rating';
import type { ContestRow } from '../../functions/lib/types';
import { CONTEST_DURATION_MINUTES, POST_END_WRITE_MINUTES } from '../../functions/lib/time';

interface SchedulerEnv {
  DB: D1Database;
  CRON_TOKEN?: string;
}

export default {
  async scheduled(_event: unknown, env: SchedulerEnv): Promise<void> {
    await runMaintenance(env.DB, Date.now());
  },

  async fetch(request: Request, env: SchedulerEnv): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== '/__maintenance') {
      return new Response('Not found', { status: 404 });
    }
    if (env.CRON_TOKEN && request.headers.get('x-maintenance-token') !== env.CRON_TOKEN) {
      return new Response('Unauthorized', { status: 401 });
    }
    await runMaintenance(env.DB, Date.now());
    return Response.json({ ok: true });
  }
};

async function runMaintenance(db: D1Database, now: number): Promise<void> {
  const dueAt = now - POST_END_WRITE_MINUTES * 60_000;
  const dueContests = await db
    .prepare(
      `SELECT * FROM contests
       WHERE ratings_finalized_at IS NULL AND scheduled_end_at <= ?
       ORDER BY scheduled_end_at
       LIMIT 20`
    )
    .bind(dueAt)
    .all<ContestRow>();

  for (const contest of dueContests.results) {
    await finalizeContestIfReady(db, contest, now);
  }

  await ensureNextDefaultContest(db, now);
}

async function ensureNextDefaultContest(db: D1Database, now: number): Promise<void> {
  const future = await db
    .prepare('SELECT id FROM contests WHERE scheduled_start_at > ? ORDER BY scheduled_start_at LIMIT 1')
    .bind(now)
    .first();
  if (future) return;

  const lastEnded = await db
    .prepare(
      `SELECT * FROM contests
       WHERE scheduled_end_at + ${POST_END_WRITE_MINUTES * 60_000} <= ?
       ORDER BY scheduled_end_at DESC
       LIMIT 1`
    )
    .bind(now)
    .first<ContestRow>();
  if (!lastEnded) return;

  const anchor = Math.max(now, lastEnded.scheduled_end_at + POST_END_WRITE_MINUTES * 60_000);
  const startAt = nextThursdayShanghai(anchor);
  const endAt = startAt + CONTEST_DURATION_MINUTES * 60_000;
  const stage = await db
    .prepare('SELECT COALESCE(MAX(stage_no), 0) + 1 AS next_stage FROM contests WHERE season_id = ?')
    .bind(lastEnded.season_id)
    .first<{ next_stage: number }>();

  try {
    await db
      .prepare(
        `INSERT INTO contests
          (season_id, stage_no, title, scheduled_start_at, scheduled_end_at, problem_count, updated_at)
         VALUES (?, ?, ?, ?, ?, 10, ?)
         ON CONFLICT(season_id, scheduled_start_at) DO NOTHING`
      )
      .bind(
        lastEnded.season_id,
        stage?.next_stage ?? 1,
        `Stage ${stage?.next_stage ?? 1}`,
        startAt,
        endAt,
        now
      )
      .run();
  } catch {
    // A manually created future contest can win a race; that is intentional.
  }
}

export function nextThursdayShanghai(fromEpochMs: number): number {
  const chinaMs = fromEpochMs + 8 * 60 * 60 * 1000;
  const shifted = new Date(chinaMs);
  let daysUntilThursday = (4 - shifted.getUTCDay() + 7) % 7;
  if (daysUntilThursday === 0) daysUntilThursday = 7;
  return Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate() + daysUntilThursday,
    3,
    55,
    0,
    0
  );
}
