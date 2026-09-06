import { handleApiError, jsonResponse, type ApiFunction } from '../lib/d1';
import { findContest, loadMembers, loadSubmissions, loadTeams } from '../lib/db';
import { computeBoard } from '../lib/scoring';
import {
  isFinalThreeMinutes,
  MINUTE_MS,
  POST_END_WRITE_MINUTES,
  PRE_START_WRITE_MINUTES,
  writeWindowOpen
} from '../lib/time';

export const onRequestGet: ApiFunction = async ({ env, request }) => {
  try {
    const url = new URL(request.url);
    const contestId = url.searchParams.get('contest_id');
    const contest = await findContest(
      env.DB,
      contestId ? Number(contestId) || null : null
    );
    if (!contest) {
      return jsonResponse({
        ok: true,
        contest: null,
        now: Date.now(),
        writeWindowOpen: false,
        finalThree: false,
        teams: []
      });
    }

    const now = Date.now();
    const teams = await loadTeams(env.DB, contest.id);
    const members = await loadMembers(env.DB, contest.id);
    const submissions = await loadSubmissions(env.DB, contest.id);
    const board = computeBoard(contest, teams, members, submissions);

    return jsonResponse({
      ok: true,
      contest: {
        id: contest.id,
        title: contest.title ?? `Stage ${contest.stage_no ?? ''}`.trim(),
        stageNo: contest.stage_no,
        problemCount: contest.problem_count,
        startAt: contest.scheduled_start_at,
        endAt: contest.scheduled_end_at,
        writeWindowStart: contest.scheduled_start_at - PRE_START_WRITE_MINUTES * MINUTE_MS,
        writeWindowEnd: contest.scheduled_end_at + POST_END_WRITE_MINUTES * MINUTE_MS,
        ratingFinalizedAt: contest.ratings_finalized_at
      },
      now,
      writeWindowOpen: writeWindowOpen(
        contest.scheduled_start_at,
        contest.scheduled_end_at,
        now
      ),
      finalThree: isFinalThreeMinutes(contest.scheduled_start_at, contest.scheduled_end_at, now),
      effectiveTeamCount: board.effectiveTeamCount,
      teams: board.teams.map((team) => ({
        id: team.team.id,
        name: team.team.name,
        displayRank: team.displayRank,
        perfRank: team.perfRank,
        solved: team.solved,
        penalty: team.penalty,
        totalSubmissions: team.totalSubmissions,
        teamPerf: team.teamPerf,
        members: team.members.map((member) => ({
          membershipId: member.id,
          personId: member.person_id,
          name: member.display_name,
          externalId: member.external_id,
          attendanceValid: Boolean(member.attendance_valid),
          role: member.role
        })),
        problems: team.problems.map((problem) => ({
          index: problem.problemIndex,
          label: String.fromCharCode(64 + problem.problemIndex),
          correct: problem.correct,
          wrongCount: problem.wrongCount,
          pendingCount: problem.pendingCount,
          correctMinute: problem.correctMinute,
          totalSubmissions: problem.totalSubmissions,
          pendingSubmissionIds: problem.pendingSubmissionIds
        }))
      }))
    });
  } catch (error) {
    return handleApiError(error);
  }
};
