import type { D1Database, Env } from './d1';
import type {
  ContestRow,
  ContestTeamRow,
  PersonRow,
  SeasonRow,
  SubmissionRow,
  TeamMemberRow
} from './types';

export async function findContest(
  db: D1Database,
  contestId?: number | null
): Promise<ContestRow | null> {
  const sql = contestId
    ? 'SELECT * FROM contests WHERE id = ?'
    : 'SELECT * FROM contests ORDER BY scheduled_start_at DESC LIMIT 1';
  const stmt = db.prepare(sql);
  const row = contestId
    ? await stmt.bind(contestId).first<ContestRow>()
    : await stmt.first<ContestRow>();
  return row ?? null;
}

export async function listContests(db: D1Database, seasonId: number): Promise<ContestRow[]> {
  const { results } = await db
    .prepare('SELECT * FROM contests WHERE season_id = ? ORDER BY scheduled_start_at')
    .bind(seasonId)
    .all<ContestRow>();
  return results;
}

export async function loadSeason(db: D1Database, seasonId: number): Promise<SeasonRow | null> {
  return (
    (await db.prepare('SELECT * FROM seasons WHERE id = ?').bind(seasonId).first<SeasonRow>()) ?? null
  );
}

export async function loadTeams(
  db: D1Database,
  contestId: number
): Promise<ContestTeamRow[]> {
  const { results } = await db
    .prepare('SELECT * FROM contest_teams WHERE contest_id = ? ORDER BY id')
    .bind(contestId)
    .all<ContestTeamRow>();
  return results;
}

export async function loadMembers(
  db: D1Database,
  contestId: number
): Promise<TeamMemberRow[]> {
  const { results } = await db
    .prepare(
      `SELECT m.*, p.display_name, p.external_id, p.class_name, p.gender
       FROM contest_team_members m
       JOIN persons p ON p.id = m.person_id
       WHERE m.contest_id = ?
       ORDER BY m.contest_team_id, m.id`
    )
    .bind(contestId)
    .all<TeamMemberRow>();
  return results;
}

export async function loadSubmissions(
  db: D1Database,
  contestId: number
): Promise<SubmissionRow[]> {
  const { results } = await db
    .prepare('SELECT * FROM submissions WHERE contest_id = ? ORDER BY id')
    .bind(contestId)
    .all<SubmissionRow>();
  return results;
}

export async function loadPersons(db: D1Database): Promise<PersonRow[]> {
  const { results } = await db.prepare('SELECT * FROM persons ORDER BY display_name').all<PersonRow>();
  return results;
}

export async function writeAudit(
  db: D1Database,
  actor: string,
  action: string,
  target: string | null,
  body: unknown
): Promise<void> {
  await db
    .prepare('INSERT INTO audit_log (actor, action, target, body_json) VALUES (?, ?, ?, ?)')
    .bind(actor || 'unknown', action, target, JSON.stringify(body ?? null))
    .run();
}

export async function latestContestForSeason(db: D1Database, env: Env): Promise<ContestRow | null> {
  return findContest(db, null);
}

export function rowValue<T>(value: T | null | undefined): T | null {
  return value ?? null;
}
