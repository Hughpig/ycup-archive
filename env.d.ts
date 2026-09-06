// 1. 声明 Vue 文件，解决在 .ts 文件中 import .vue 报错的问题
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// 2. 声明没有自带类型定义的第三方库
declare module 'markdown-it-katex';
declare module 'markdown-it-mathjax3';