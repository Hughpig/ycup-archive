export interface SeasonRow {
  id: number;
  name: string;
  k: number;
}

export interface PersonRow {
  id: number;
  external_id: string | null;
  display_name: string;
  gender: 'male' | 'female' | null;
  class_name: string | null;
}

export interface ContestRow {
  id: number;
  season_id: number;
  stage_no: number | null;
  title: string | null;
  scheduled_start_at: number;
  scheduled_end_at: number;
  problem_count: number;
  ratings_finalized_at: number | null;
}

export interface ContestTeamRow {
  id: number;
  contest_id: number;
  season_team_id: number | null;
  name: string;
}

export interface TeamMemberRow {
  id: number;
  contest_id: number;
  contest_team_id: number;
  person_id: number;
  attendance_valid: 0 | 1;
  role: 'player' | 'setter';
  display_name: string;
  external_id: string | null;
  class_name: string | null;
  gender: 'male' | 'female' | null;
}

export interface SubmissionRow {
  id: number;
  contest_id: number;
  contest_team_id: number;
  problem_index: number;
  verdict: 'correct' | 'wrong' | 'pending';
  submitted_at: number;
  effective_minute: number;
  voided: 0 | 1;
}
