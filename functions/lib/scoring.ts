import type { ContestTeamRow, SubmissionRow, TeamMemberRow } from './types';
import type { ContestRow } from './types';

export interface ProblemState {
  problemIndex: number;
  correct: boolean;
  wrongCount: number;
  pendingCount: number;
  correctMinute: number | null;
  totalSubmissions: number;
  pendingSubmissionIds: number[];
}

export interface TeamBoard {
  team: ContestTeamRow;
  members: TeamMemberRow[];
  problems: ProblemState[];
  solved: number;
  penalty: number;
  totalSubmissions: number;
  displayRank: number;
  perfRank: number;
  effectiveTeamCount: number;
  teamPerf: number;
}

export interface Board {
  contest: ContestRow;
  teams: TeamBoard[];
  effectiveTeamCount: number;
}

export interface TeamStats {
  team: ContestTeamRow;
  members: TeamMemberRow[];
  solved: number;
  penalty: number;
  totalSubmissions: number;
  problems: ProblemState[];
}

export function computeBoard(
  contest: ContestRow,
  teams: ContestTeamRow[],
  members: TeamMemberRow[],
  submissions: SubmissionRow[]
): Board {
  const stats = teams.map((team) => {
    const teamMembers = members.filter((member) => member.contest_team_id === team.id);
    const teamSubmissions = submissions.filter(
      (submission) => submission.contest_team_id === team.id && !submission.voided
    );
    return computeTeamStats(team, teamMembers, teamSubmissions, contest.problem_count);
  });

  const sorted = [...stats].sort((a, b) => {
    return (
      b.solved - a.solved ||
      a.penalty - b.penalty ||
      a.totalSubmissions - b.totalSubmissions ||
      a.team.name.localeCompare(b.team.name)
    );
  });

  const effectiveTeamCount = sorted.filter((team) => team.solved > 0).length;
  const boardTeams: TeamBoard[] = [];
  let previousKey = '';
  let previousPerfRank = 0;

  sorted.forEach((team, index) => {
    const key = `${team.solved}|${team.penalty}|${team.totalSubmissions}`;
    const sameAsPrevious = index > 0 && key === previousKey;
    const perfRank = sameAsPrevious ? previousPerfRank : index + 1;
    const perf = team.solved > 0 ? perfForRank(perfRank, effectiveTeamCount) : 0;

    boardTeams.push({
      ...team,
      displayRank: index + 1,
      perfRank,
      effectiveTeamCount,
      teamPerf: Math.max(0, perf)
    });

    previousKey = key;
    previousPerfRank = perfRank;
  });

  return { contest, teams: boardTeams, effectiveTeamCount };
}

export function computeTeamStats(
  team: ContestTeamRow,
  members: TeamMemberRow[],
  submissions: SubmissionRow[],
  problemCount: number
): TeamStats {
  const problems: ProblemState[] = [];
  let solved = 0;
  let penalty = 0;
  let totalSubmissions = submissions.length;

  for (let problemIndex = 1; problemIndex <= problemCount; problemIndex += 1) {
    const rows = submissions
      .filter((submission) => submission.problem_index === problemIndex)
      .sort((a, b) => a.submitted_at - b.submitted_at || a.id - b.id);
    const correctRows = rows.filter((row) => row.verdict === 'correct');
    const firstCorrect = correctRows[0];
    const wrongCount = rows.filter((row) => row.verdict === 'wrong').length;
    const pendingCount = rows.filter((row) => row.verdict === 'pending').length;
    const correct = Boolean(firstCorrect);

    if (firstCorrect) {
      solved += 1;
      penalty += firstCorrect.effective_minute;
      for (const row of rows) {
        const isAtOrBeforeCorrect =
          row.submitted_at < firstCorrect.submitted_at ||
          (row.submitted_at === firstCorrect.submitted_at && row.id < firstCorrect.id);
        if (row.verdict === 'wrong' && isAtOrBeforeCorrect) {
          penalty += 5;
        }
      }
    }

    problems.push({
      problemIndex,
      correct,
      wrongCount,
      pendingCount,
      correctMinute: firstCorrect ? firstCorrect.effective_minute : null,
      totalSubmissions: rows.length,
      pendingSubmissionIds: rows
        .filter((row) => row.verdict === 'pending')
        .map((row) => row.id)
    });
  }

  return { team, members, solved, penalty, totalSubmissions, problems };
}

export function perfForRank(rank: number, effectiveTeamCount: number): number {
  if (effectiveTeamCount <= 0 || rank > effectiveTeamCount) return 0;
  const bonus = rank === 1 ? 30 : rank === 2 ? 13 : rank === 3 ? 3 : 0;
  return (100 * (effectiveTeamCount - rank + 1)) / effectiveTeamCount + bonus;
}

export function seasonRating(perfs: number[], k: number): number {
  const sorted = [...perfs].sort((a, b) => b - a);
  return sorted.reduce((total, perf, index) => {
    return total + k * Math.pow(1 - k, index) * perf;
  }, 0);
}

export function boardRankInfo(contest: ContestRow, teams: ContestTeamRow[]): ContestTeamRow[] {
  void contest;
  return teams;
}
