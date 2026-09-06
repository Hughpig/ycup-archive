import assert from 'node:assert/strict';
import test from 'node:test';
import { computeBoard, perfForRank, seasonRating } from '../functions/lib/scoring.ts';
import type { ContestRow, ContestTeamRow, SubmissionRow, TeamMemberRow } from '../functions/lib/types.ts';

const contest: ContestRow = {
  id: 1,
  season_id: 1,
  stage_no: 1,
  title: 'Test',
  scheduled_start_at: 0,
  scheduled_end_at: 40 * 60_000,
  problem_count: 2,
  ratings_finalized_at: null
};

const teamA: ContestTeamRow = {
  id: 1,
  contest_id: 1,
  season_team_id: null,
  name: 'A'
};

const teamB: ContestTeamRow = {
  id: 2,
  contest_id: 1,
  season_team_id: null,
  name: 'B'
};

test('computeBoard uses solved, penalty, total submissions and Perf rank', () => {
  const submissions: SubmissionRow[] = [
    {
      id: 1,
      contest_id: 1,
      contest_team_id: 1,
      problem_index: 1,
      verdict: 'wrong',
      submitted_at: 5 * 60_000,
      effective_minute: 0,
      voided: 0
    },
    {
      id: 2,
      contest_id: 1,
      contest_team_id: 1,
      problem_index: 1,
      verdict: 'correct',
      submitted_at: 10 * 60_000,
      effective_minute: 10,
      voided: 0
    },
    {
      id: 3,
      contest_id: 1,
      contest_team_id: 2,
      problem_index: 1,
      verdict: 'correct',
      submitted_at: 20 * 60_000,
      effective_minute: 20,
      voided: 0
    },
    {
      id: 4,
      contest_id: 1,
      contest_team_id: 2,
      problem_index: 2,
      verdict: 'wrong',
      submitted_at: 22 * 60_000,
      effective_minute: 0,
      voided: 0
    }
  ];

  const board = computeBoard(contest, [teamA, teamB], [], submissions);
  assert.equal(board.effectiveTeamCount, 2);
  assert.equal(board.teams[0].team.name, 'A');
  assert.equal(board.teams[0].solved, 1);
  assert.equal(board.teams[0].penalty, 15);
  assert.equal(board.teams[0].teamPerf, perfForRank(1, 2));
  assert.equal(board.teams[1].solved, 1);
  assert.equal(board.teams[1].penalty, 20);
  assert.equal(board.teams[1].teamPerf, perfForRank(2, 2));
  assert.equal(board.teams[0].totalSubmissions, 2);
  assert.equal(board.teams[1].totalSubmissions, 2);
});

test('tied teams share perf rank and the next rank skips', () => {
  const teamC: ContestTeamRow = { ...teamB, id: 3, name: 'C' };
  const correct = (teamId: number, id: number, minute: number): SubmissionRow => ({
    id,
    contest_id: 1,
    contest_team_id: teamId,
    problem_index: 1,
    verdict: 'correct',
    submitted_at: minute * 60_000,
    effective_minute: minute,
    voided: 0
  });
  const board = computeBoard(
    contest,
    [teamA, teamB, teamC],
    [],
    [correct(1, 1, 10), correct(2, 2, 10), correct(3, 3, 30)]
  );
  assert.deepEqual(board.teams.map((team) => team.perfRank), [1, 1, 3]);
  assert.deepEqual(board.teams.map((team) => team.displayRank), [1, 2, 3]);
  assert.equal(board.effectiveTeamCount, 3);
});

test('pending final submissions count as attempts but do not solve until reviewed', () => {
  const pending: SubmissionRow = {
    id: 5,
    contest_id: 1,
    contest_team_id: 1,
    problem_index: 1,
    verdict: 'pending',
    submitted_at: 38 * 60_000,
    effective_minute: 40,
    voided: 0
  };
  const board = computeBoard(contest, [teamA], [], [pending]);
  assert.equal(board.teams[0].solved, 0);
  assert.equal(board.teams[0].totalSubmissions, 1);
  assert.equal(board.teams[0].problems[0].pendingCount, 1);
});

test('members with valid attendance receive team Perf', () => {
  const member: TeamMemberRow = {
    id: 1,
    contest_id: 1,
    contest_team_id: 1,
    person_id: 10,
    attendance_valid: 1,
    role: 'player',
    display_name: 'Person',
    external_id: 'p10',
    class_name: null,
    gender: null
  };
  const correct: SubmissionRow = {
    id: 6,
    contest_id: 1,
    contest_team_id: 1,
    problem_index: 1,
    verdict: 'correct',
    submitted_at: 60_000,
    effective_minute: 1,
    voided: 0
  };
  const board = computeBoard(contest, [teamA], [member], [correct]);
  assert.equal(board.teams[0].members[0].person_id, 10);
  assert.equal(board.teams[0].teamPerf, perfForRank(1, 1));
});

test('seasonRating sorts Perf descending and is monotonic for nonnegative Perf', () => {
  const k = 1 / 6;
  const one = seasonRating([130], k);
  const two = seasonRating([130, 63], k);
  assert.equal(two > one, true);
  assert.equal(seasonRating([0, 0, 130, 63], k), two);
});
