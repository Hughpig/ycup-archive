<template>
  <div class="schedule-container">
    <div class="schedule-card" :class="statusClass">
      <div class="event-info">
        <div class="event-title">{{ title }}</div>
        <div class="event-time">
            <span class="icon">📅</span> {{ formatTime(start) }} ~ {{ formatTime(computedEnd) }}
            <span class="duration">(时长: {{ displayDuration }}min)</span>
        </div>
      </div>
      <div class="event-status">
        <span class="status-badge">
          {{ countdownText || statusLabel }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  title: String,
  start: String,    // "2026-04-02 10:30"
  duration: {       // 时长（分钟），默认为 40
    type: Number,
    default: 40
  },
  end: String       // 可选：如果传了 end，则优先使用 end
})

const now = ref(new Date())
let timer = null

// 计算结束时间：如果有手动传 end 就用 end，否则用 start + duration
const computedEnd = computed(() => {
  if (props.end) return props.end;
  const startTime = new Date(props.start).getTime();
  const endTime = new Date(startTime + props.duration * 60000);
  
  const d = new Date(endTime);
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
});

// 2. 新增：计算要显示在 UI 上的时长 [关键修复!]
const displayDuration = computed(() => {
  if (props.end) {
    const s = new Date(props.start).getTime();
    const e = new Date(props.end).getTime();
    return Math.round((e - s) / 60000); // 算出实际的分钟数
  }
  return props.duration; // 没传 end 就用默认/传入的 duration
});

// --- 状态逻辑部分 ---

const statusClass = computed(() => {
  const targetStart = new Date(props.start)
  const targetEnd = new Date(computedEnd.value)
  if (now.value < targetStart) return 'is-upcoming'
  if (now.value > targetEnd) return 'is-past'
  return 'is-active'
})

const statusLabel = computed(() => {
  if (statusClass.value === 'is-upcoming') return '⏳ 待开启'
  if (statusClass.value === 'is-past') return '✅ 已结束'
  return '🔥 进行中'
})

const countdownText = computed(() => {
  const targetStart = new Date(props.start)
  const targetEnd = new Date(computedEnd.value)
  
  if (now.value < targetStart && targetStart - now.value < 86400000) {
    const diff = targetStart - now.value
    return `🚀 ${Math.floor(diff/3600000)}h ${Math.floor((diff%3600000)/60000)}m 后开启`
  }
  
  if (now.value >= targetStart && now.value <= targetEnd) {
    const diff = targetEnd - now.value
    return `⏱️ 剩 ${Math.floor(diff/60000)}分${Math.floor((diff%60000)/1000)}秒`
  }
  return null
})

const formatTime = (timeStr) => {
  const d = new Date(timeStr)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

onMounted(() => { timer = setInterval(() => { now.value = new Date() }, 1000) })
onUnmounted(() => { clearInterval(timer) })
</script>

<style scoped>
/* 终极一击：把那个卡片样式贴回去！ */
.schedule-container { margin: 16px 0; font-family: 'JetBrains Mono', monospace; }
.schedule-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.event-title { font-size: 1.1em; font-weight: 700; margin-bottom: 6px; color: var(--vp-c-text-1); }
.event-time { font-size: 0.85em; color: var(--vp-c-text-2); display: flex; align-items: center; gap: 8px; }
.duration { color: var(--vp-c-brand); font-weight: bold; }

.status-badge {
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 0.9em;
  font-weight: 600;
  background: var(--vp-c-default-soft);
  min-width: 110px;
  text-align: center;
  display: block;
}

/* 激活状态的高亮效果 */
.is-active {
  border-color: var(--vp-c-brand);
  background: var(--vp-c-brand-soft);
  transform: scale(1.02);
  box-shadow: 0 6px 20px rgba(var(--vp-c-brand-rgb, 59, 130, 246), 0.15);
}
.is-active .status-badge {
  background: var(--vp-c-brand);
  color: white;
  box-shadow: 0 0 15px var(--vp-c-brand-soft);
}

.is-past { opacity: 0.6; filter: grayscale(0.8); }
</style>