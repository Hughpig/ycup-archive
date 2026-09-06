<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";

interface ProblemDto {
  index: number;
  label: string;
  correct: boolean;
  wrongCount: number;
  pendingCount: number;
  correctMinute: number | null;
  totalSubmissions: number;
  pendingSubmissionIds: number[];
}

interface MemberDto {
  membershipId: number;
  personId: number;
  name: string;
  externalId: string | null;
  attendanceValid: boolean;
  role: string;
}

interface TeamDto {
  id: number;
  name: string;
  displayRank: number;
  perfRank: number;
  solved: number;
  penalty: number;
  totalSubmissions: number;
  teamPerf: number;
  members: MemberDto[];
  problems: ProblemDto[];
}

interface BoardDto {
  ok: boolean;
  contest: {
    id: number;
    title: string;
    problemCount: number;
    startAt: number;
    endAt: number;
    writeWindowStart: number;
    writeWindowEnd: number;
    ratingFinalizedAt: number | null;
  } | null;
  now: number;
  writeWindowOpen: boolean;
  finalThree: boolean;
  effectiveTeamCount: number;
  teams: TeamDto[];
}

interface EditorMember {
  membershipId: number | null;
  personId: number | null;
  externalId: string;
  displayName: string;
  attendanceValid: boolean;
}

const board = ref<BoardDto | null>(null);
const loading = ref(true);
const errorMessage = ref("");
const adminMessage = ref("");
const tokenInput = ref("");
const isAdmin = ref(false);
const editMode = ref(false);
const problemCountInput = ref(10);
const problemCountDirty = ref(false);
const actionTarget = ref<{ team: TeamDto; problem: ProblemDto } | null>(null);
const actionBusy = ref(false);
const teamEditorOpen = ref(false);
const teamEditorSaving = ref(false);
const teamEditor = ref<{
  teamId: number | null;
  name: string;
  members: EditorMember[];
}>({ teamId: null, name: "", members: [] });
let pollTimer: number | undefined;

const storedToken = ref("");

const frozen = computed(() => !board.value?.writeWindowOpen);
const canScore = computed(
  () =>
    isAdmin.value && editMode.value && Boolean(board.value?.writeWindowOpen),
);

const statusText = computed(() => {
  const data = board.value;
  if (!data?.contest) return "暂无比赛";
  const now = data.now;
  const start = data.contest.startAt;
  const end = data.contest.endAt;
  if (data.finalThree) return "最后 3 分钟封榜";
  if (now < start) return data.writeWindowOpen ? "准备窗口" : "已冻结";
  if (now <= end) return "比赛进行中";
  return data.writeWindowOpen ? "赛后调整窗口" : "已结束";
});

onMounted(() => {
  storedToken.value = localStorage.getItem("ycup_admin_token") || "";
  refresh();
  pollTimer = window.setInterval(refresh, 5000);
  if (storedToken.value) {
    tokenInput.value = storedToken.value;
    verifyAdmin(storedToken.value, false);
  }
});

onUnmounted(() => {
  if (pollTimer) window.clearInterval(pollTimer);
});

async function refresh(): Promise<void> {
  try {
    const response = await fetch("/api/board", {
      headers: { accept: "application/json" },
    });
    const data = (await response.json()) as BoardDto;
    if (!response.ok)
      throw new Error((data as any).error || "Failed to load board");
    board.value = data;
    if (!problemCountDirty.value && data.contest) {
      problemCountInput.value = data.contest.problemCount;
    }
    errorMessage.value = "";
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "加载榜单失败";
  } finally {
    loading.value = false;
  }
}

async function verifyAdmin(token: string, showError = true): Promise<void> {
  try {
    const response = await fetch("/api/admin/session", {
      headers: { authorization: `Bearer ${token}` },
    });
    const data = (await response.json()) as { ok?: boolean; error?: string };
    if (!response.ok || !data.ok)
      throw new Error(data.error || "Token invalid");
    isAdmin.value = true;
    localStorage.setItem("ycup_admin_token", token);
    storedToken.value = token;
    adminMessage.value = "";
  } catch (error) {
    if (showError)
      adminMessage.value = error instanceof Error ? error.message : "鉴权失败";
    isAdmin.value = false;
    localStorage.removeItem("ycup_admin_token");
  }
}

function enableAdmin(): void {
  adminMessage.value = "";
  verifyAdmin(tokenInput.value.trim());
}

function disableAdmin(): void {
  isAdmin.value = false;
  editMode.value = false;
  tokenInput.value = "";
  storedToken.value = "";
  localStorage.removeItem("ycup_admin_token");
}

function toggleEdit(): void {
  editMode.value = !editMode.value;
}

async function apiCall(path: string, body: unknown): Promise<void> {
  const token = storedToken.value;
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => null)) as {
    ok?: boolean;
    error?: string;
  } | null;
  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || "Request failed");
  }
  await refresh();
}

async function saveProblemCount(): Promise<void> {
  const count = Number(problemCountInput.value);
  if (!board.value?.contest) return;
  try {
    await apiCall("/api/admin/setup", {
      action: "updateContestProblemCount",
      contestId: board.value.contest.id,
      problemCount: count,
    });
    problemCountDirty.value = false;
  } catch (error) {
    adminMessage.value =
      error instanceof Error ? error.message : "题目数更新失败";
  }
}

function openAction(team: TeamDto, problem: ProblemDto): void {
  if (!canScore.value) return;
  actionTarget.value = { team, problem };
}

function closeAction(): void {
  actionTarget.value = null;
}

async function submitScore(
  action: string,
  verdict?: "correct" | "wrong",
): Promise<void> {
  const target = actionTarget.value;
  if (!target || !board.value?.contest || actionBusy.value) return;
  actionBusy.value = true;
  try {
    const body: Record<string, unknown> = {
      action,
      contestId: board.value.contest.id,
      teamId: target.team.id,
      problemIndex: target.problem.index,
      idempotencyKey: `${Date.now()}-${target.team.id}-${target.problem.index}-${Math.random()}`,
    };
    if (action === "review") {
      body.submissionId = target.problem.pendingSubmissionIds[0];
      body.verdict = verdict;
    }
    await apiCall("/api/admin/score", body);
    closeAction();
  } catch (error) {
    adminMessage.value = error instanceof Error ? error.message : "提交失败";
  } finally {
    actionBusy.value = false;
  }
}

async function undoLatest(
  teamId?: number,
  problemIndex?: number,
): Promise<void> {
  if (!board.value?.contest) return;
  try {
    await apiCall("/api/admin/score", {
      action: "undo",
      contestId: board.value.contest.id,
      teamId,
      problemIndex,
    });
  } catch (error) {
    adminMessage.value = error instanceof Error ? error.message : "撤销失败";
  }
}

async function clearSubmissions(): Promise<void> {
  if (!board.value?.contest) return;
  if (!window.confirm("确定清空本场全部提交记录？队伍和成员不会被删除。"))
    return;
  try {
    await apiCall("/api/admin/score", {
      action: "clearSubmissions",
      contestId: board.value.contest.id,
    });
  } catch (error) {
    adminMessage.value = error instanceof Error ? error.message : "清空失败";
  }
}

function openAddTeam(): void {
  teamEditor.value = { teamId: null, name: "", members: [] };
  teamEditorOpen.value = true;
}

function openEditTeam(team: TeamDto): void {
  if (!isAdmin.value) return;
  teamEditor.value = {
    teamId: team.id,
    name: team.name,
    members: team.members.map((member) => ({
      membershipId: member.membershipId,
      personId: member.personId,
      externalId: member.externalId || "",
      displayName: member.name,
      attendanceValid: member.attendanceValid,
    })),
  };
  teamEditorOpen.value = true;
}

function addEditorMember(): void {
  if (teamEditor.value.members.length >= 3) {
    adminMessage.value = "每队最多 3 人";
    return;
  }
  teamEditor.value.members.push({
    membershipId: null,
    personId: null,
    externalId: "",
    displayName: "",
    attendanceValid: true,
  });
}

function removeEditorMember(index: number): void {
  teamEditor.value.members.splice(index, 1);
}

async function saveTeam(): Promise<void> {
  const editor = teamEditor.value;
  if (!editor.name.trim()) {
    adminMessage.value = "请填写队名";
    return;
  }
  if (editor.members.length === 0) {
    adminMessage.value = "请至少添加一名成员";
    return;
  }
  teamEditorSaving.value = true;
  try {
    const members = editor.members.map((member) => ({
      externalId: member.externalId.trim() || undefined,
      displayName: member.displayName.trim(),
    }));
    if (editor.teamId === null) {
      if (!board.value?.contest) return;
      await apiCall("/api/admin/setup", {
        action: "addContestTeam",
        contestId: board.value.contest.id,
        name: editor.name,
        members,
      });
    } else {
      const currentTeam = board.value?.teams.find(
        (team) => team.id === editor.teamId,
      );
      const rosterChanged =
        !currentTeam ||
        currentTeam.name !== editor.name ||
        !sameMembers(currentTeam.members, members);
      if (rosterChanged) {
        await apiCall("/api/admin/setup", {
          action: "updateContestTeam",
          contestTeamId: editor.teamId,
          name: editor.name,
          members,
        });
      }
    }
    teamEditorOpen.value = false;
    adminMessage.value = "";
  } catch (error) {
    adminMessage.value =
      error instanceof Error ? error.message : "队伍保存失败";
  } finally {
    teamEditorSaving.value = false;
  }
}

function sameMembers(
  current: MemberDto[],
  next: Array<{ externalId?: string; displayName: string }>,
): boolean {
  if (current.length !== next.length) return false;
  return current.every((member, index) => {
    const target = next[index];
    return (
      member.name === target.displayName &&
      (member.externalId || "") === (target.externalId || "")
    );
  });
}

async function saveAttendance(member: EditorMember): Promise<void> {
  if (member.membershipId === null) return;
  try {
    await apiCall("/api/admin/setup", {
      action: "setMemberAttendance",
      contestTeamMemberId: member.membershipId,
      valid: member.attendanceValid,
    });
  } catch (error) {
    member.attendanceValid = !member.attendanceValid;
    adminMessage.value =
      error instanceof Error ? error.message : "参赛状态更新失败";
  }
}

async function removeTeam(): Promise<void> {
  const editor = teamEditor.value;
  if (!editor.teamId) return;
  if (!window.confirm(`确定删除队伍「${editor.name}」？`)) return;
  try {
    await apiCall("/api/admin/setup", {
      action: "removeContestTeam",
      contestTeamId: editor.teamId,
    });
    teamEditorOpen.value = false;
  } catch (error) {
    adminMessage.value =
      error instanceof Error ? error.message : "队伍删除失败";
  }
}

function formatClock(epochMs: number | null | undefined): string {
  if (!epochMs) return "";
  const date = new Date(epochMs + 8 * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

function problemText(problem: ProblemDto): { text: string; cls: string } {
  if (problem.correct) {
    const wrong = problem.wrongCount ? `+${problem.wrongCount}` : "";
    return {
      text: `${wrong} ${problem.correctMinute ?? ""}`.trim(),
      cls: "is-correct",
    };
  }
  if (problem.pendingCount > 0)
    return { text: `?${problem.pendingCount}`, cls: "is-pending" };
  if (problem.wrongCount > 0)
    return { text: `-${problem.wrongCount}`, cls: "is-wrong" };
  return { text: "", cls: "" };
}
</script>

<template>
  <div class="scoreboard-wrap">
    <div v-if="loading" class="empty-state">加载中...</div>
    <div v-else-if="errorMessage && !board" class="empty-state error">
      {{ errorMessage }}
    </div>
    <template v-else-if="board?.contest">
      <section class="toolbar">
        <div class="title-block">
          <h2>{{ board.contest.title }}</h2>
          <p>
            {{ formatClock(board.contest.startAt) }} -
            {{ formatClock(board.contest.endAt) }}
            <span class="pill">{{ statusText }}</span>
          </p>
        </div>

        <div class="admin-box" v-if="!isAdmin">
          <input
            v-model="tokenInput"
            type="password"
            placeholder="管理员令牌"
            autocomplete="off"
          />
          <button type="button" @click="enableAdmin">解锁</button>
          <span v-if="adminMessage" class="inline-error">{{
            adminMessage
          }}</span>
        </div>

        <div class="admin-box" v-else>
          <label class="switch-label">
            <input type="checkbox" v-model="editMode" @change="toggleEdit" />
            编辑模式
          </label>
          <button type="button" @click="disableAdmin">锁定</button>
          <button type="button" :disabled="!canScore" @click="undoLatest()">
            撤销
          </button>
          <button type="button" :disabled="!canScore" @click="clearSubmissions">
            清空提交
          </button>
          <label
            >题数
            <input
              v-model="problemCountInput"
              type="number"
              min="9"
              max="13"
              class="number-input"
              @input="problemCountDirty = true"
          /></label>
          <button type="button" :disabled="!canScore" @click="saveProblemCount">
            更新题数
          </button>
          <button type="button" @click="openAddTeam">添加队伍</button>
          <span v-if="adminMessage" class="inline-error">{{
            adminMessage
          }}</span>
        </div>
      </section>

      <p v-if="!editMode" class="hint-row">
        WA 罚时 5 分钟，最后 3 分钟仅记录 pending 提交。
      </p>

      <div v-if="board.teams.length === 0" class="empty-state">还没有队伍</div>
      <div v-else class="table-scroll">
        <table class="score-table">
          <thead>
            <tr>
              <th class="rank-cell">#</th>
              <th class="name-cell">队伍</th>
              <th
                v-for="problem in board.teams[0].problems"
                :key="problem.index"
              >
                {{ problem.label }}
              </th>
              <th>通过</th>
              <th>罚时</th>
              <th>提交</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="team in board.teams" :key="team.id">
              <td class="rank-cell">{{ team.displayRank }}</td>
              <td class="name-cell">
                <button
                  type="button"
                  class="team-name"
                  :disabled="!isAdmin || !editMode"
                  @click="openEditTeam(team)"
                >
                  {{ team.name }}
                  <span class="member-line">{{
                    team.members.map((m) => m.name).join(" / ")
                  }}</span>
                </button>
              </td>
              <td
                v-for="problem in team.problems"
                :key="problem.index"
                :class="['problem-cell', problemText(problem).cls]"
              >
                <button
                  type="button"
                  class="problem-button"
                  :disabled="!canScore"
                  @click="openAction(team, problem)"
                >
                  {{ problemText(problem).text }}
                </button>
              </td>
              <td class="total-cell">{{ team.solved }}</td>
              <td class="total-cell">{{ team.penalty }}</td>
              <td class="total-cell">{{ team.totalSubmissions }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="actionTarget" class="modal-layer">
        <div class="modal">
          <h3>
            {{ actionTarget.team.name }} - {{ actionTarget.problem.label }}
          </h3>
          <p v-if="board.finalThree" class="modal-status">
            最后 3 分钟，只能记录 pending。
          </p>
          <p
            v-else-if="actionTarget.problem.pendingCount > 0"
            class="modal-status"
          >
            赛后评审 pending 提交。
          </p>
          <div class="modal-buttons">
            <template v-if="board.finalThree">
              <button type="button" @click="submitScore('pending')">
                记录提交
              </button>
            </template>
            <template v-else-if="actionTarget.problem.pendingCount > 0">
              <button
                type="button"
                :disabled="!actionTarget.problem.pendingSubmissionIds[0]"
                @click="submitScore('review', 'correct')"
              >
                评审 AC
              </button>
              <button
                type="button"
                :disabled="!actionTarget.problem.pendingSubmissionIds[0]"
                @click="submitScore('review', 'wrong')"
              >
                评审 WA
              </button>
            </template>
            <template v-else>
              <button
                type="button"
                :disabled="actionTarget.problem.correct"
                @click="submitScore('correct')"
              >
                标记 AC
              </button>
              <button
                type="button"
                :disabled="actionTarget.problem.correct"
                @click="submitScore('wrong')"
              >
                增加 WA
              </button>
              <button type="button" @click="submitScore('reset')">
                重置题目
              </button>
              <button
                type="button"
                @click="
                  undoLatest(actionTarget.team.id, actionTarget.problem.index)
                "
              >
                撤销
              </button>
            </template>
            <button type="button" @click="closeAction">取消</button>
          </div>
        </div>
      </div>

      <div v-if="teamEditorOpen" class="modal-layer">
        <div class="modal team-modal">
          <h3>{{ teamEditor.teamId ? "修改队伍" : "添加队伍" }}</h3>
          <label>队名 <input v-model="teamEditor.name" type="text" /></label>
          <div class="member-head">
            <span>成员（最多 3 人）</span>
            <button type="button" @click="addEditorMember">添加成员</button>
          </div>
          <div
            v-for="(member, index) in teamEditor.members"
            :key="index"
            class="member-row"
          >
            <input
              v-model="member.displayName"
              type="text"
              placeholder="姓名"
            />
            <input
              v-model="member.externalId"
              type="text"
              placeholder="班学号（可选）"
            />
            <label v-if="member.membershipId !== null" title="参赛有效性">
              <input
                v-model="member.attendanceValid"
                type="checkbox"
                @change="saveAttendance(member)"
              />
              有效参赛
            </label>
            <button type="button" @click="removeEditorMember(index)">
              移除
            </button>
          </div>
          <div class="modal-buttons">
            <button
              type="button"
              :disabled="teamEditorSaving"
              @click="saveTeam"
            >
              保存
            </button>
            <button
              v-if="teamEditor.teamId"
              type="button"
              :disabled="teamEditorSaving"
              @click="removeTeam"
            >
              删除队伍
            </button>
            <button type="button" @click="teamEditorOpen = false">取消</button>
          </div>
        </div>
      </div>
    </template>
    <div v-else class="empty-state">暂无比赛数据</div>
  </div>
</template>

<style scoped>
.scoreboard-wrap {
  width: 100%;
}

.toolbar {
  display: grid;
  gap: 12px;
  align-items: center;
  margin-bottom: 14px;
  padding: 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

@media (min-width: 900px) {
  .toolbar {
    grid-template-columns: minmax(220px, 1fr) auto;
  }
}

.title-block h2 {
  margin: 0 0 4px;
  font-size: 1.25rem;
  line-height: 1.2;
}
.title-block p {
  margin: 0;
  color: var(--vp-c-text-2);
}
.pill {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #e3f2fd;
  color: #0d47a1;
  font-size: 0.78rem;
  font-weight: 700;
}

.admin-box {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}

.admin-box input[type="password"],
.admin-box input[type="text"],
.admin-box input[type="number"],
.modal input[type="text"],
.modal input[type="password"] {
  min-height: 32px;
  padding: 4px 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

.number-input {
  width: 56px;
}
.switch-label {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  white-space: nowrap;
}
.inline-error {
  color: #c62828;
  font-size: 0.85rem;
}
.hint-row {
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
  margin: 4px 0 10px;
}
.empty-state {
  padding: 28px 12px;
  text-align: center;
  color: var(--vp-c-text-2);
}
.error {
  color: #c62828;
}

.table-scroll {
  overflow-x: auto;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
}
.score-table {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
}
.score-table th,
.score-table td {
  border-bottom: 1px solid var(--vp-c-divider);
  padding: 8px 6px;
  text-align: center;
  white-space: nowrap;
}
.score-table th {
  background: var(--vp-c-default-soft);
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
}
.rank-cell {
  width: 36px;
}
.name-cell {
  min-width: 190px;
  text-align: left;
}
.total-cell {
  font-weight: 700;
}
.problem-cell {
  min-width: 72px;
}
.problem-button,
.team-name {
  width: 100%;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: center;
}
.team-name {
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-start;
  font-weight: 700;
  cursor: pointer;
}
.team-name:disabled {
  cursor: default;
}
.member-line {
  font-size: 0.72rem;
  font-weight: 400;
  color: var(--vp-c-text-2);
}
.problem-button {
  min-height: 34px;
  cursor: pointer;
}
.problem-button:disabled {
  cursor: default;
}
.is-correct {
  background: #dcedc8;
  color: #33691e;
}
.is-wrong {
  background: #ffcdd2;
  color: #b71c1c;
}
.is-pending {
  background: #fff9c4;
  color: #7a5200;
}

.modal-layer {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.35);
}

.modal {
  width: min(520px, calc(100vw - 24px));
  max-height: calc(100vh - 32px);
  overflow: auto;
  padding: 16px;
  border-radius: 8px;
  background: var(--vp-c-bg);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.22);
}

.modal h3 {
  margin: 0 0 8px;
}
.modal-status {
  color: var(--vp-c-text-2);
  margin: 0 0 10px;
}
.modal-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}
button {
  min-height: 30px;
  padding: 4px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  cursor: pointer;
}
button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.member-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 14px 0 8px;
  font-weight: 700;
}
.member-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}
.member-row input[type="text"] {
  flex: 1;
  min-width: 130px;
}
.team-modal label {
  display: flex;
  gap: 6px;
  align-items: center;
}
</style>
