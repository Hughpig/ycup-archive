<template>
  <div class="pdf-wrapper">
    <div class="pdf-container">
      <iframe 
        :src="finalUrl" 
        width="100%" 
        height="600px" 
        frameborder="0"
      >
        <p>您的浏览器不支持 PDF 预览，请点击下方按钮下载。</p>
      </iframe>
    </div>
    
    <div class="pdf-footer">
      <a :href="finalUrl" download class="download-btn">
        📥 下载本周试卷 (PDF)
      </a>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useData } from 'vitepress'

const props = defineProps(['url'])
const { site } = useData()

// 自动处理 base 路径，防止部署到 GitHub 后路径失效
const finalUrl = computed(() => {
  const base = site.value.base || '/'
  return (base + props.url).replace(/\/+/g, '/')
})
</script>

<style scoped>
.pdf-wrapper { margin: 20px 0; border: 1px solid #eee; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.pdf-container { background: #525659; line-height: 0; }
.pdf-footer { padding: 15px; background: #fff; text-align: center; border-top: 1px solid #eee; }
.download-btn { display: inline-block; padding: 10px 24px; background: #3eaf7c; color: white !important; text-decoration: none !important; border-radius: 6px; font-weight: bold; transition: 0.2s; }
.download-btn:hover { background: #369a6e; transform: translateY(-1px); }
</style>