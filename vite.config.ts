import { defineConfig } from 'vite'
// ...existing code...

export default defineConfig({
  // ...existing code...
  server: {
    proxy: {
      '/github-contributions': {
        target: 'https://github-contributions-api.jogruber.de/v4',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/github-contributions/, '')
      }
    }
  }
  // ...existing code...
})