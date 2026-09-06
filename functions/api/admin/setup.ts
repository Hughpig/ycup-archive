import { ApiError, handleApiError, jsonResponse, type ApiFunction, type Env } from '../../lib/d1';
import { findContest, writeAudit } from '../../lib/db';
import { writeWindowOpen } from '../../lib/time';

interface MemberInput {
  externalId?: string;
  displayName: string;
  gender?: 'male' | 'female';
  className?: string;
}

type SetupBody =
  | { action: 'updateContestProblemCount'; contestId: number; problemCount: number }
  | {
      action: 'addContestTeam';
      contestId: number;
      name: string;
      seasonTeamId?: number;
      members?: MemberInput[];
    }
  | {
      action: 'updateContestTeam';
      contestTeamId: number;
      name?: string;
      members?: MemberInput[];
    }
  | { action: 'removeContestTeam'; contestTeamId: number }
  | {
      action: 'setMemberAttendance';
      contestTeamMemberId: number;
      valid: boolean;
    };

export const onRequestPost: ApiFunction = async ({ env, request, data }) => {
  try {
    const body = (await request.json()) as SetupBody;
    if (body.action === 'updateContestProblemCount') {
      await updateProblemCount(env, body);
    } else if (body.action === 'addContestTeam') {
      await addTeam(env, body);
    } else if (body.action === 'updateContestTeam') {
      await updateTeam(env, body);
    } else if (body.action === 'removeContestTeam') {
      await removeTeam(env, body);
    } else if (body.action === 'setMemberAttendance') {
      await setAttendance(env, body);
    } else {
      throw new ApiError(400, 'Unknown setup action');
    }
    await writeAudit(env.DB, String(data.admin || 'admin'), `setup:${body.action}`, null, body);
    return jsonResponse({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
};

async function updateProblemCount(
  env: Env,
  body: Extract<SetupBody, { action: 'updateContestProblemCount' }>
): Promise<void> {
  if (!Number.isInteger(body.problemCount) || body.problemCount < 9 || body.problemCount > 13) {
    throw new ApiError(400, 'Problem count must be between 9 and 13');
  }
  const contest = await requireContest(env, body.contestId);
  requireWriteWindow(contest);
  await env.DB
    .prepare('UPDATE contests SET problem_count = ?, updated_at = ? WHERE id = ?')
    .bind(body.problemCount, Date.now(), contest.id)
    .run();
}

async function addTeam(
  env: Env,
  body: Extract<SetupBody, { action: 'addContestTeam' }>
): Promise<void> {
  const contest = await requireContest(env, body.contestId);
  const name = body.name.trim();
  if (!name) throw new ApiError(400, 'Team name is required');
  const members = body.members ?? [];
  if (members.length > 3) throw new ApiError(400, 'A contest team can have at most 3 members');

  const existing = await env.DB
    .prepare('SELECT id FROM contest_teams WHERE contest_id = ? AND name = ?')
    .bind(contest.id, name)
    .first<{ id: number }>();
  if (existing) throw new ApiError(409, 'Team already exists');

  let seasonTeamId = body.seasonTeamId;
  if (!seasonTeamId) {
    seasonTeamId = await ensureSeasonTeam(env, contest.season_id, name);
  }

  const insertTeam = await env.DB
    .prepare(
      `INSERT INTO contest_teams (contest_id, season_team_id, name, updated_at)
       VALUES (?, ?, ?, ?)`
    )
    .bind(contest.id, seasonTeamId, name, Date.now())
    .run();
  const contestTeamId = insertTeam.meta.last_row_id;
  const personIds = await insertTeamMembers(env, contest.id, contestTeamId, members);
  await syncSeasonRoster(env, seasonTeamId, personIds);
}

async function updateTeam(
  env: Env,
  body: Extract<SetupBody, { action: 'updateContestTeam' }>
): Promise<void> {
  const team = await env.DB
    .prepare('SELECT * FROM contest_teams WHERE id = ?')
    .bind(body.contestTeamId)
    .first<{ id: number; contest_id: number; season_team_id: number | null; name: string }>();
  if (!team) throw new ApiError(404, 'Team not found');

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) throw new ApiError(400, 'Team name is required');
    const duplicate = await env.DB
      .prepare('SELECT id FROM contest_teams WHERE contest_id = ? AND name = ? AND id <> ?')
      .bind(team.contest_id, name, team.id)
      .first();
    if (duplicate) throw new ApiError(409, 'Team name already exists in this contest');
    await env.DB
      .prepare('UPDATE contest_teams SET name = ?, updated_at = ? WHERE id = ?')
      .bind(name, Date.now(), team.id)
      .run();
  }

  if (body.members !== undefined) {
    if (body.members.length > 3) throw new ApiError(400, 'A contest team can have at most 3 members');
    await replaceTeamMembers(env, team.contest_id, team.id, team.season_team_id, body.members);
  }
}

async function removeTeam(
  env: Env,
  body: Extract<SetupBody, { action: 'removeContestTeam' }>
): Promise<void> {
  const team = await env.DB
    .prepare('SELECT * FROM contest_teams WHERE id = ?')
    .bind(body.contestTeamId)
    .first<{ id: number; name: string }>();
  if (!team) throw new ApiError(404, 'Team not found');
  const submission = await env.DB
    .prepare('SELECT id FROM submissions WHERE contest_team_id = ? LIMIT 1')
    .bind(team.id)
    .first();
  if (submission) throw new ApiError(409, 'Cannot remove a team that already has submissions');
  await env.DB.prepare('DELETE FROM contest_teams WHERE id = ?').bind(team.id).run();
}

async function setAttendance(
  env: Env,
  body: Extract<SetupBody, { action: 'setMemberAttendance' }>
): Promise<void> {
  const member = await env.DB
    .prepare(
      `SELECT m.id, m.contest_team_id, c.scheduled_start_at, c.scheduled_end_at
       FROM contest_team_members m
       JOIN contest_teams ct ON ct.id = m.contest_team_id
       JOIN contests c ON c.id = ct.contest_id
       WHERE m.id = ?`
    )
    .bind(body.contestTeamMemberId)
    .first<{
      id: number;
      scheduled_start_at: number;
      scheduled_end_at: number;
    }>();
  if (!member) throw new ApiError(404, 'Member not found');
  if (
    !writeWindowOpen(
      member.scheduled_start_at,
      member.scheduled_end_at,
      Date.now()
    )
  ) {
    throw new ApiError(423, 'Scoreboard is frozen');
  }
  await env.DB
    .prepare('UPDATE contest_team_members SET attendance_valid = ?, updated_at = ? WHERE id = ?')
    .bind(body.valid ? 1 : 0, Date.now(), member.id)
    .run();
}

async function insertTeamMembers(
  env: Env,
  contestId: number,
  contestTeamId: number,
  members: MemberInput[]
): Promise<number[]> {
  const personIds: number[] = [];
  for (const member of members) {
    const personId = await upsertPerson(env, member);
    personIds.push(personId);
    const conflict = await env.DB
      .prepare(
        'SELECT id FROM contest_team_members WHERE contest_id = ? AND person_id = ?'
      )
      .bind(contestId, personId)
      .first();
    if (conflict) {
      throw new ApiError(409, 'Person is already registered in another team for this contest');
    }
    await env.DB
      .prepare(
        `INSERT INTO contest_team_members
          (contest_id, contest_team_id, person_id, attendance_valid, role, updated_at)
         VALUES (?, ?, ?, 1, 'player', ?)`
      )
      .bind(contestId, contestTeamId, personId, Date.now())
      .run();
  }
  return personIds;
}

async function replaceTeamMembers(
  env: Env,
  contestId: number,
  contestTeamId: number,
  seasonTeamId: number | null,
  desiredMembers: MemberInput[]
): Promise<void> {
  const existingRows = await env.DB
    .prepare(
      `SELECT id, person_id FROM contest_team_members
       WHERE contest_team_id = ? ORDER BY id`
    )
    .bind(contestTeamId)
    .all<{ id: number; person_id: number }>();
  const submissions = await env.DB
    .prepare('SELECT id FROM submissions WHERE contest_team_id = ? LIMIT 1')
    .bind(contestTeamId)
    .first();
  if (submissions && desiredMembers.length > 0) {
    throw new ApiError(409, 'Team members cannot be changed after submissions exist; update attendance instead');
  }

  const desiredPersonIds: number[] = [];
  for (const member of desiredMembers) {
    const personId = await upsertPerson(env, member);
    desiredPersonIds.push(personId);
    const existing = await env.DB
      .prepare(
        `SELECT id FROM contest_team_members
         WHERE contest_id = ? AND person_id = ?`
      )
      .bind(contestId, personId)
      .first<{ id: number }>();
    if (!existing) {
      await env.DB
        .prepare(
          `INSERT INTO contest_team_members
            (contest_id, contest_team_id, person_id, attendance_valid, role, updated_at)
           VALUES (?, ?, ?, 1, 'player', ?)`
        )
        .bind(contestId, contestTeamId, personId, Date.now())
        .run();
    } else if (existing.id !== 0 && !(await isMemberOfTeam(env, contestTeamId, personId))) {
      throw new ApiError(409, 'Person is already registered in another team for this contest');
    }
  }

  if (!submissions) {
    for (const row of existingRows.results) {
      if (!desiredPersonIds.includes(row.person_id)) {
        await env.DB.prepare('DELETE FROM contest_team_members WHERE id = ?').bind(row.id).run();
      }
    }
    if (seasonTeamId !== null) {
      await syncSeasonRoster(env, seasonTeamId, desiredPersonIds);
    }
  }
}

async function syncSeasonRoster(
  env: Env,
  seasonTeamId: number,
  personIds: number[]
): Promise<void> {
  const existingRows = await env.DB
    .prepare('SELECT person_id FROM season_team_members WHERE season_team_id = ?')
    .bind(seasonTeamId)
    .all<{ person_id: number }>();
  for (const row of existingRows.results) {
    if (!personIds.includes(row.person_id)) {
      await env.DB
        .prepare('DELETE FROM season_team_members WHERE season_team_id = ? AND person_id = ?')
        .bind(seasonTeamId, row.person_id)
        .run();
    }
  }
  for (const personId of personIds) {
    await env.DB
      .prepare('INSERT OR IGNORE INTO season_team_members (season_team_id, person_id) VALUES (?, ?)')
      .bind(seasonTeamId, personId)
      .run();
  }
}

async function isMemberOfTeam(
  env: Env,
  contestTeamId: number,
  personId: number
): Promise<boolean> {
  const row = await env.DB
    .prepare('SELECT id FROM contest_team_members WHERE contest_team_id = ? AND person_id = ?')
    .bind(contestTeamId, personId)
    .first();
  return Boolean(row);
}

async function upsertPerson(
  env: Env,
  input: MemberInput
): Promise<number> {
  const displayName = input.displayName.trim();
  if (!displayName) throw new ApiError(400, 'Member name is required');
  const now = Date.now();
  const externalId = input.externalId?.trim() || null;
  const existing = externalId
    ? await env.DB.prepare('SELECT id FROM persons WHERE external_id = ?').bind(externalId).first<{ id: number }>()
    : null;
  if (existing) {
    await env.DB
      .prepare(
        `UPDATE persons
         SET display_name = ?, gender = COALESCE(?, gender), class_name = COALESCE(?, class_name), updated_at = ?
         WHERE id = ?`
      )
      .bind(displayName, input.gender ?? null, input.className ?? null, now, existing.id)
      .run();
    return existing.id;
  }

  const result = await env.DB
    .prepare(
      `INSERT INTO persons (external_id, display_name, gender, class_name, updated_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(externalId, displayName, input.gender ?? null, input.className ?? null, now)
    .run();
  return result.meta.last_row_id;
}

async function ensureSeasonTeam(
  env: Env,
  seasonId: number,
  name: string
): Promise<number> {
  const existing = await env.DB
    .prepare('SELECT id FROM season_teams WHERE season_id = ? AND name = ?')
    .bind(seasonId, name)
    .first<{ id: number }>();
  if (existing) return existing.id;
  const result = await env.DB
    .prepare('INSERT INTO season_teams (season_id, name, updated_at) VALUES (?, ?, ?)')
    .bind(seasonId, name, Date.now())
    .run();
  return result.meta.last_row_id;
}

async function requireContest(
  env: Env,
  contestId: number
): Promise<{ id: number; season_id: number; scheduled_start_at: number; scheduled_end_at: number; problem_count: number }> {
  const contest = await findContest(env.DB, contestId);
  if (!contest) throw new ApiError(404, 'Contest not found');
  return contest;
}

function requireWriteWindow(contest: { scheduled_start_at: number; scheduled_end_at: number }): void {
  if (!writeWindowOpen(contest.scheduled_start_at, contest.scheduled_end_at, Date.now())) {
    throw new ApiError(423, 'Scoreboard is frozen');
  }
}
