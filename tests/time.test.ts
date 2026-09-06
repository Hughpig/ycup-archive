import assert from 'node:assert/strict';
import test from 'node:test';
import {
  effectiveMinute,
  formatShanghai,
  isFinalThreeMinutes,
  isPostContestReviewWindow,
  writeWindowOpen
} from '../functions/lib/time.ts';

const startAt = Date.UTC(2026, 8, 10, 3, 55, 0, 0);
const endAt = startAt + 40 * 60_000;

test('write window opens 15 minutes before and closes 15 minutes after', () => {
  assert.equal(writeWindowOpen(startAt, endAt, startAt - 16 * 60_000), false);
  assert.equal(writeWindowOpen(startAt, endAt, startAt - 15 * 60_000), true);
  assert.equal(writeWindowOpen(startAt, endAt, endAt + 15 * 60_000), true);
  assert.equal(writeWindowOpen(startAt, endAt, endAt + 15 * 60_000 + 1), false);
});

test('final three minutes and post-contest review window use exact boundaries', () => {
  assert.equal(isFinalThreeMinutes(startAt, endAt, endAt - 3 * 60_000), true);
  assert.equal(isFinalThreeMinutes(startAt, endAt, endAt + 1), false);
  assert.equal(isPostContestReviewWindow(startAt, endAt, endAt + 1), true);
  assert.equal(isPostContestReviewWindow(startAt, endAt, endAt + 15 * 60_000), true);
  assert.equal(isPostContestReviewWindow(startAt, endAt, endAt + 15 * 60_000 + 1), false);
});

test('effective minute clamps to contest duration and formatting uses Asia/Shanghai', () => {
  assert.equal(effectiveMinute(startAt + 10 * 60_000, startAt), 10);
  assert.equal(effectiveMinute(startAt + 45 * 60_000, startAt), 40);
  assert.equal(formatShanghai(Date.UTC(2026, 8, 10, 3, 55, 0, 0)), '2026-09-10 11:55');
});
