import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/github-contributions': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/api/github-stats': {
        target: 'https://github-contributions-api.jogruber.de/v4',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/github-stats/, '')
      }
    }
  }
});
