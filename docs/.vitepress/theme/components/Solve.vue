<script setup lang="ts">
import { ref, onMounted } from 'vue'
// 注意：需要先运行 pnpm add crypto-js
import CryptoJS from 'crypto-js'

interface Props {
  hash: string   // 答案的 MD5 哈希值
  pid: string    // 题目唯一 ID，如 26-W01-A
}

const props = defineProps<Props>()
const input = ref('')
const status = ref<'none' | 'ac' | 'wa'>('none')

// 初始化时检查本地存储，看看这题是不是已经做过了
onMounted(() => {
  const saved = localStorage.getItem(`ycup_solved_${props.pid}`)
  if (saved) status.value = 'ac'
})

const submit = () => {
  if (status.value === 'ac') return
  
  // 计算用户输入的 MD5
  const userHash = CryptoJS.MD5(input.value.trim()).toString()
  
  if (userHash === props.hash) {
    status.value = 'ac'
    localStorage.setItem(`ycup_solved_${props.pid}`, 'true')
  } else {
    status.value = 'wa'
    // 抖动效果或提示可以在这里加
  }
}
</script>

<template>
  <div class="solve-box" :class="status">
    <div class="header">
      <span class="title">🏁 答案提交</span>
      <span v-if="status === 'ac'" class="badge">Accepted</span>
    </div>
    
    <div class="input-area">
      <input 
        v-model="input" 
        :disabled="status === 'ac'"
        @keyup.enter="submit"
        placeholder="请输入数值或简短字符串答案..."
      />
      <button @click="submit" :disabled="status === 'ac'">
        {{ status === 'ac' ? '已通过' : '提交' }}
      </button>
    </div>
    
    <p v-if="status === 'wa'" class="error-msg">❌ 答案错误，再检查一下过程？</p>
    <p v-if="status === 'ac'" class="success-msg">🎉 恭喜！本题已成功解决。</p>
  </div>
</template>

<style scoped>
.solve-box { margin: 1.5rem 0; padding: 1rem; border: 1px solid var(--vp-c-divider); border-radius: 8px; background-color: var(--vp-c-bg-soft); transition: all 0.3s; }
.solve-box.ac { border-color: #42b883; background-color: rgba(66, 184, 131, 0.05); }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.title { font-weight: bold; font-size: 0.9rem; }
.badge { font-size: 0.75rem; background: #42b883; color: white; padding: 2px 8px; border-radius: 10px; }
.input-area { display: flex; gap: 8px; }
input { flex: 1; padding: 8px 12px; border: 1px solid var(--vp-c-divider); border-radius: 6px; background: var(--vp-c-bg); color: var(--vp-c-text-1); outline: none; }
input:focus { border-color: var(--vp-c-brand); }
button { padding: 8px 16px; background: var(--vp-c-brand); color: white; border-radius: 6px; border: none; font-weight: bold; cursor: pointer; }
button:disabled { background: var(--vp-c-divider); cursor: not-allowed; }
.error-msg { color: #f66; font-size: 0.85rem; margin-top: 8px; font-weight: bold; }
.success-msg { color: #42b883; font-size: 0.85rem; margin-top: 8px; font-weight: bold; }
</style>