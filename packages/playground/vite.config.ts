import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@gausszhou/mock-pty': resolve(__dirname, '../mock-pty/src'),
    },
  },
})
