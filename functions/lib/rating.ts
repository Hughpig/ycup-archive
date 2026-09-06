import type { D1Database } from './d1';
import type { ContestRow, ContestTeamRow, TeamMemberRow, SubmissionRow } from './types';
import { computeBoard, seasonRating } from './scoring';
import { writeAudit } from './db';

export async function finalizeContestIfReady(
  db: D1Database,
  contest: ContestRow,
  now: number
): Promise<{ contestId: number; finalized: boolean; persons: number }> {
  const dueAt = contest.scheduled_end_at + 15 * 60_000;
  if (contest.ratings_finalized_at || now < dueAt) {
    return { contestId: contest.id, finalized: false, persons: 0 };
  }

  const teams = await db
    .prepare('SELECT * FROM contest_teams WHERE contest_id = ?')
    .bind(contest.id)
    .all<ContestTeamRow>();
  const members = await db
    .prepare(
      `SELECT m.*, p.display_name, p.external_id, p.class_name, p.gender
       FROM contest_team_members m
       JOIN persons p ON p.id = m.person_id
       WHERE m.contest_id = ?`
    )
    .bind(contest.id)
    .all<TeamMemberRow>();
  const submissions = await db
    .prepare('SELECT * FROM submissions WHERE contest_id = ?')
    .bind(contest.id)
    .all<SubmissionRow>();
  const board = computeBoard(contest, teams.results, members.results, submissions.results);

  const perfEntries = new Map<number, { perf: number; source: string }>();
  for (const team of board.teams) {
    if (team.solved === 0) continue;
    for (const member of team.members) {
      if (member.role !== 'player' || !member.attendance_valid) continue;
      perfEntries.set(member.person_id, { perf: team.teamPerf, source: 'team_rank' });
    }
  }

  const setters = await db
    .prepare('SELECT person_id, leaked, negotiated_perf FROM contest_setters WHERE contest_id = ?')
    .bind(contest.id)
    .all<{ person_id: number; leaked: 0 | 1; negotiated_perf: number | null }>();
  for (const setter of setters.results) {
    if (setter.leaked) {
      perfEntries.set(setter.person_id, { perf: 0, source: 'leak_penalty' });
    } else if (setter.negotiated_perf !== null && setter.negotiated_perf !== undefined) {
      perfEntries.set(setter.person_id, {
        perf: Number(setter.negotiated_perf),
        source: 'setter_negotiated'
      });
    }
  }

  if (perfEntries.size > 0) {
    const perfInsert = db.prepare(
      `INSERT INTO person_contest_perfs (person_id, contest_id, perf, source, finalized_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(person_id, contest_id) DO UPDATE SET perf = excluded.perf, source = excluded.source, finalized_at = excluded.finalized_at`
    );
    await db.batch(
      [...perfEntries].map(([personId, entry]) =>
        perfInsert.bind(personId, contest.id, entry.perf, entry.source, now)
      )
    );

    const allPerfs = await db
      .prepare(
        `SELECT p.person_id, p.perf
         FROM person_contest_perfs p
         JOIN contests c ON c.id = p.contest_id
         WHERE c.season_id = ?`
      )
      .bind(contest.season_id)
      .all<{ person_id: number; perf: number }>();
    const byPerson = new Map<number, number[]>();
    for (const row of allPerfs.results) {
      const values = byPerson.get(row.person_id) ?? [];
      values.push(row.perf);
      byPerson.set(row.person_id, values);
    }

    const season = await db
      .prepare('SELECT k FROM seasons WHERE id = ?')
      .bind(contest.season_id)
      .first<{ k: number }>();
    const k = season?.k ?? 1 / 6;
    const ratingUpsert = db.prepare(
      `INSERT INTO person_ratings (season_id, person_id, rating, contest_count, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(season_id, person_id) DO UPDATE SET
         rating = excluded.rating,
         contest_count = excluded.contest_count,
         updated_at = excluded.updated_at`
    );
    const ratings = [...byPerson].map(([personId, perfs]) =>
      ratingUpsert.bind(contest.season_id, personId, seasonRating(perfs, k), perfs.length, now)
    );
    await db.batch(ratings);
  }

  await db
    .prepare('UPDATE contests SET ratings_finalized_at = ?, updated_at = ? WHERE id = ?')
    .bind(now, now, contest.id)
    .run();
  await writeAudit(db, 'scheduler', 'finalize_contest_rating', `contest:${contest.id}`, {
    persons: perfEntries.size
  });

  return { contestId: contest.id, finalized: true, persons: perfEntries.size };
}
