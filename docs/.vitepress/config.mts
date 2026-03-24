import { defineConfig } from 'vitepress'
// 注意：如果运行报错，请确保执行了 pnpm add -D markdown-it-katex
// @ts-ignore
import markdownItKatex from 'markdown-it-katex'

export default defineConfig({
  base: '/ycup-archive/',
  title: "ycup Archive",
  description: "ycup 数学竞赛数字化存档站",
  
  // 必须在 head 中引入 KaTeX 的 CSS，否则公式会乱码（只有源码没有样式）
  head: [
    ['link', { 
      rel: 'stylesheet', 
      href: 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css' 
    }]
  ],

  markdown: {
    // 启用 KaTeX 插件
    config: (md) => {
      md.use(markdownItKatex)
    }
  },

  themeConfig: {
    // 顶部导航
    nav: [
      { text: '首页', link: '/' },
      { text: '指南', link: '/guide' },
      { text: '2026 赛季', link: '/problems/2026/w01/' },
      { text: '关于', link: '/about' }
    ],

    // 侧边栏：支持多级折叠
    sidebar: {
      '/problems/2026/': [
        {
          text: '📅 2026 第一季度 (Q1)',
          collapsed: false,
          items: [
            {
              text: 'Stage 1 (YiChuan) 3.24',
              collapsed: true,
              items: [
                { text: '题目预览', link: '/problems/2026/w01/' },
                { text: '官方题解', link: '/problems/2026/w01/solution' },
                { text: '赛后战报', link: '/problems/2026/w01/report' }
              ]
            }
          ]
        }
      ]
    },

    // 搜索功能
    search: {
      provider: 'local'
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Hughpig/ycup' }
    ],

    footer: {
      message: 'ycup: The Wasteland of Math',
      copyright: 'Copyright © 2026-present Hughpig'
    }
  }
})