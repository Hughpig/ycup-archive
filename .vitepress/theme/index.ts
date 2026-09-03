import DefaultTheme from 'vitepress/theme'
import './custom.css'
import { watch, onMounted, nextTick } from 'vue'
import { useRoute } from 'vitepress'
import type { EnhanceAppContext } from 'vitepress'
import PdfBox from './components/PdfBox.vue'
import Solve from './components/Solve.vue'
import Schedule from './components/Schedule.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }: EnhanceAppContext) {
    app.component('PdfBox', PdfBox)
    app.component('Solve', Solve)
    app.component('Schedule', Schedule)
  },
  setup() {
    const route = useRoute()

    const renderMath = () => {
      // 这里的 nextTick 很重要，确保在 DOM 更新后执行渲染
      nextTick(() => {
        if (typeof (window as any).MathJax !== 'undefined') {
          (window as any).MathJax.typesetPromise()
        }
      })
    }

    // 监听路由变化（换页）
    watch(() => route.path, () => renderMath())

    // 初始挂载（进站）
    onMounted(() => renderMath())
  }
}