<script setup lang="ts">
import { ref, onMounted } from 'vue'
import CryptoJS from 'crypto-js'

interface Props {
  hash: string   // 正确答案的 MD5 值
  pid: string    // 题目唯一 ID，例如 '26-W01-A'
}

const props = defineProps<Props>()

const input = ref('')
const status = ref<'none' | 'ac' | 'wa'>('none')
const isPassed = ref(false) // 记录该题是否曾被 AC 过
const isSubmitting = ref(false) // 防止连点

// 初始化：从本地存储读取该题的状态
onMounted(() => {
  const savedStatus = localStorage.getItem(`ycup_solved_${props.pid}`)
  if (savedStatus === 'true') {
    isPassed.value = true
  }
})

const submit = () => {
  if (!input.value.trim() || isSubmitting.value) return
  
  isSubmitting.value = true
  
  // 计算用户输入的 MD5 (去除空格并转小写处理，增加容错)
  const userHash = CryptoJS.MD5(input.value.trim().toLowerCase()).toString()
  
  if (userHash === props.hash.toLowerCase()) {
    status.value = 'ac'
    isPassed.value = true
    localStorage.setItem(`ycup_solved_${props.pid}`, 'true')
  } else {
    status.value = 'wa'
  }

  // 1秒后解除点击锁定，允许重复尝试
  setTimeout(() => {
    isSubmitting.value = false
  }, 1000)
}
</script>

<template>
  <div class="solve-card" :class="{ 'passed': isPassed }">
    <div class="card-header">
      <span class="pid-tag"># {{ pid }}</span>
      <span v-if="isPassed" class="status-badge ac">ACCEPTED</span>
      <span v-else class="status-badge todo">UNSOLVED</span>
    </div>

    <div class="input-wrapper">
      <input 
        v-model="input" 
        @keyup.enter="submit"
        placeholder="输入数值或简短答案..."
        spellcheck="false"
      />
      <button @click="submit" :disabled="isSubmitting">
        {{ isSubmitting ? '检查中...' : '提交' }}
      </button>
    </div>

    <transition name="slide-fade">
      <div v-if="status === 'ac'" class="feedback-msg ac-msg">
        ✨ 恭喜！答案正确。
      </div>
      <div v-else-if="status === 'wa'" class="feedback-msg wa-msg">
        ❌ 答案错误，再检查一下过程？
      </div>
    </transition>
  </div>
</template>

<style scoped>
/* 容器样式 */
.solve-card {
  margin: 1.5rem 0;
  padding: 1.2rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background-color: var(--vp-c-bg-soft);
  transition: all 0.3s ease;
}

/* 已通过时的边框和背景微调 */
.solve-card.passed {
  border-color: rgba(66, 184, 131, 0.5);
  background-color: rgba(66, 184, 131, 0.05);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.pid-tag {
  font-family: var(--vp-font-family-mono);
  font-weight: bold;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}

.status-badge {
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 800;
  letter-spacing: 0.5px;
}

.status-badge.ac { background: #42b883; color: white; }
.status-badge.todo { background: var(--vp-c-divider); color: var(--vp-c-text-2); }

/* 输入区域 */
.input-wrapper {
  display: flex;
  gap: 10px;
}

input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s;
}

input:focus {
  border-color: var(--vp-c-brand);
}

button {
  padding: 0 20px;
  background: var(--vp-c-brand);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;
}

button:active { transform: scale(0.96); }
button:disabled { opacity: 0.6; cursor: not-allowed; }

/* 反馈信息 */
.feedback-msg {
  margin-top: 12px;
  font-size: 0.85rem;
  font-weight: 600;
}
.ac-msg { color: #42b883; }
.wa-msg { color: #f66; }

.slide-fade-enter-active { transition: all 0.3s ease-out; }
.slide-fade-enter-from { opacity: 0; transform: translateY(-10px); }
</style>