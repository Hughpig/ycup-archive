// .vitepress/theme/index.ts
import DefaultTheme from 'vitepress/theme'
import './custom.css'
import type { EnhanceAppContext } from 'vitepress'
import PdfBox from './components/PdfBox.vue'
import Solve from './components/Solve.vue'
import Schedule from './components/Schedule.vue'

export default {
  extends: DefaultTheme, // 继承默认主题
  enhanceApp({ app }: EnhanceAppContext) {
    // 全局注册组件，这样你在任何 .md 里都能直接用 <PdfBox />
    app.component('PdfBox', PdfBox)
    app.component('Solve', Solve)
    app.component('Schedule', Schedule)
  }
}