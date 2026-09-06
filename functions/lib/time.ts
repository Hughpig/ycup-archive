export const MINUTE_MS = 60_000;
export const CONTEST_DURATION_MINUTES = 40;
export const PRE_START_WRITE_MINUTES = 15;
export const POST_END_WRITE_MINUTES = 15;
export const FINAL_FROZEN_MINUTES = 3;
export const CHINA_OFFSET_MS = 8 * 60 * MINUTE_MS;

export function parseShanghai(date: string, time: string): number {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const timeOnly = /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
  if (!dateOnly || !timeOnly) {
    throw new Error(`Invalid Shanghai time: ${date} ${time}`);
  }
  return Date.parse(`${date}T${time}:00+08:00`);
}

export function formatShanghai(epochMs: number | null | undefined): string {
  if (!epochMs) return '';
  return new Date(epochMs + CHINA_OFFSET_MS).toISOString().slice(0, 16).replace('T', ' ');
}

export function writeWindowOpen(
  startAt: number,
  endAt: number,
  now: number
): boolean {
  return (
    now >= startAt - PRE_START_WRITE_MINUTES * MINUTE_MS &&
    now <= endAt + POST_END_WRITE_MINUTES * MINUTE_MS
  );
}

export function isFinalThreeMinutes(startAt: number, endAt: number, now: number): boolean {
  return now >= endAt - FINAL_FROZEN_MINUTES * MINUTE_MS && now <= endAt;
}

export function isPostContestReviewWindow(startAt: number, endAt: number, now: number): boolean {
  return now > endAt && now <= endAt + POST_END_WRITE_MINUTES * MINUTE_MS;
}

export function effectiveMinute(now: number, startAt: number): number {
  const raw = Math.floor((now - startAt) / MINUTE_MS);
  return Math.min(CONTEST_DURATION_MINUTES, Math.max(0, raw));
}

export function ratingAvailableAt(endAt: number): number {
  return endAt + POST_END_WRITE_MINUTES * MINUTE_MS;
}
