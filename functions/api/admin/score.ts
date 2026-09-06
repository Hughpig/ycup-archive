import { ApiError, handleApiError, jsonResponse, type ApiFunction, type Env } from '../../lib/d1';
import { findContest, writeAudit } from '../../lib/db';
import {
  effectiveMinute,
  isFinalThreeMinutes,
  isPostContestReviewWindow,
  writeWindowOpen
} from '../../lib/time';

type ScoreAction = 'correct' | 'wrong' | 'pending' | 'reset' | 'undo' | 'review' | 'clearSubmissions';

interface ScoreBody {
  action: ScoreAction;
  contestId: number;
  teamId?: number;
  problemIndex?: number;
  submissionId?: number;
  verdict?: 'correct' | 'wrong';
  idempotencyKey?: string;
}

export const onRequestPost: ApiFunction = async ({ env, request, data }) => {
  try {
    const body = (await request.json()) as ScoreBody;
    const contest = await findContest(env.DB, body.contestId);
    if (!contest) throw new ApiError(404, 'Contest not found');
    const now = Date.now();

  if (body.action === 'review') {
      await reviewPending(env, body, contest.scheduled_start_at, contest.scheduled_end_at, now);
    } else if (
      body.action === 'clearSubmissions' ||
      body.action === 'reset' ||
      body.action === 'undo'
    ) {
      await destructiveAction(env, body, contest.scheduled_start_at, contest.scheduled_end_at, now);
    } else {
      await addSubmission(
        env,
        body,
        contest.scheduled_start_at,
        contest.scheduled_end_at,
        now,
        String(data.admin || 'admin')
      );
    }

    await writeAudit(env.DB, String(data.admin || 'admin'), `score:${body.action}`, null, body);
    return jsonResponse({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
};

async function addSubmission(
  env: Env,
  body: ScoreBody,
  startAt: number,
  endAt: number,
  now: number,
  actor: string
): Promise<void> {
  if (!body.teamId || !body.problemIndex) throw new ApiError(400, 'teamId and problemIndex are required');
  if (!writeWindowOpen(startAt, endAt, now)) {
    throw new ApiError(423, 'Scoreboard is frozen');
  }
  if (body.problemIndex < 1 || body.problemIndex > 13) {
    throw new ApiError(400, 'problemIndex must be between 1 and 13');
  }

  const verdict = body.action;
  const isPending = verdict === 'pending';
  if (isPending) {
    if (!isFinalThreeMinutes(startAt, endAt, now)) {
      throw new ApiError(423, 'Pending submissions are only allowed in the final three minutes');
    }
  } else {
    if (isFinalThreeMinutes(startAt, endAt, now)) {
      throw new ApiError(423, 'No verdicts may be entered in the final three minutes');
    }
  }

  const minute = verdict === 'correct' || verdict === 'pending' ? effectiveMinute(now, startAt) : 0;
  const key = body.idempotencyKey || `${now}-${body.teamId}-${body.problemIndex}-${Math.random()}`;
  const existing = await env.DB
    .prepare('SELECT id FROM submissions WHERE idempotency_key = ?')
    .bind(key)
    .first();
  if (existing) return;

  const correctBlock =
    verdict === 'correct'
      ? `AND NOT EXISTS (
           SELECT 1 FROM submissions s2
           WHERE s2.contest_team_id = ? AND s2.problem_index = ? AND s2.verdict = 'correct' AND s2.voided = 0
         )`
      : '';
  const correctParams =
    verdict === 'correct' ? [body.teamId, body.problemIndex] : [];

  const result = await env.DB
    .prepare(
      `INSERT INTO submissions
        (contest_id, contest_team_id, problem_index, verdict, submitted_at, effective_minute, operator, idempotency_key, voided, created_at, updated_at)
       SELECT ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?
       WHERE
         (SELECT COUNT(*) FROM submissions s WHERE s.contest_team_id = ? AND s.problem_index = ? AND s.voided = 0) < 10
         AND (SELECT COUNT(*) FROM submissions s WHERE s.contest_team_id = ? AND s.voided = 0) < 50
         ${correctBlock}`
    )
    .bind(
      body.contestId,
      body.teamId,
      body.problemIndex,
      verdict,
      now,
      minute,
      actor,
      key,
      now,
      now,
      body.teamId,
      body.problemIndex,
      body.teamId,
      ...correctParams
    )
    .run();
  if (!result.success || result.meta.changes === 0) {
    throw new ApiError(409, 'Submission rejected: solved, over submission limit, or concurrent write');
  }
}

async function reviewPending(
  env: Env,
  body: ScoreBody,
  startAt: number,
  endAt: number,
  now: number
): Promise<void> {
  if (!body.submissionId || !body.verdict || !['correct', 'wrong'].includes(body.verdict)) {
    throw new ApiError(400, 'submissionId and verdict are required');
  }
  if (!isPostContestReviewWindow(startAt, endAt, now)) {
    throw new ApiError(423, 'Pending submissions can only be reviewed after the contest');
  }
  const row = await env.DB
    .prepare('SELECT id, verdict FROM submissions WHERE id = ? AND voided = 0')
    .bind(body.submissionId)
    .first<{ id: number; verdict: string }>();
  if (!row) throw new ApiError(404, 'Submission not found');
  if (row.verdict !== 'pending') throw new ApiError(409, 'Submission is not pending');

  const result = await env.DB
    .prepare(
      `UPDATE submissions
       SET verdict = ?, effective_minute = 40, updated_at = ?
       WHERE id = ? AND voided = 0 AND verdict = 'pending'`
    )
    .bind(body.verdict, now, body.submissionId)
    .run();
  if (result.meta.changes === 0) throw new ApiError(409, 'Submission could not be reviewed');
}

async function destructiveAction(
  env: Env,
  body: ScoreBody,
  startAt: number,
  endAt: number,
  now: number
): Promise<void> {
  if (!writeWindowOpen(startAt, endAt, now)) {
    throw new ApiError(423, 'Scoreboard is frozen');
  }

  if (body.action === 'clearSubmissions') {
    await env.DB
      .prepare('UPDATE submissions SET voided = 1, updated_at = ? WHERE contest_id = ? AND voided = 0')
      .bind(now, body.contestId)
      .run();
    return;
  }

  if (!body.teamId) throw new ApiError(400, 'teamId is required');
  if (body.action === 'reset') {
    if (!body.problemIndex) throw new ApiError(400, 'problemIndex is required');
    await env.DB
      .prepare(
        `UPDATE submissions SET voided = 1, updated_at = ?
         WHERE contest_team_id = ? AND problem_index = ? AND voided = 0`
      )
      .bind(now, body.teamId, body.problemIndex)
      .run();
    return;
  }

  const sql = body.problemIndex
    ? `SELECT id FROM submissions
       WHERE contest_team_id = ? AND problem_index = ? AND voided = 0
       ORDER BY created_at DESC, id DESC LIMIT 1`
    : `SELECT id FROM submissions
       WHERE contest_team_id = ? AND voided = 0
       ORDER BY created_at DESC, id DESC LIMIT 1`;
  const stmt = body.problemIndex
    ? env.DB.prepare(sql).bind(body.teamId, body.problemIndex)
    : env.DB.prepare(sql).bind(body.teamId);
  const latest = await stmt.first<{ id: number }>();
  if (!latest) throw new ApiError(404, 'No submission to undo');
  await env.DB
    .prepare('UPDATE submissions SET voided = 1, updated_at = ? WHERE id = ?')
    .bind(now, latest.id)
    .run();
}
