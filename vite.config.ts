import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // AI/ML 相关库单独打包（最大的部分）
          if (id.includes('onnxruntime') || id.includes('@xenova/transformers')) {
            return 'ai-vendor'
          }
          // React 相关
          if (id.includes('react')) {
            return 'react-vendor'
          }
          // 数据库
          if (id.includes('dexie')) {
            return 'db-vendor'
          }
        }
      }
    }
  }
})
