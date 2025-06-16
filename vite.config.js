import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const graphqlTarget = env.VITE_ORG 
    ? `https://github.${env.VITE_ORG}.com/api` 
    : 'https://api.github.com';

  return {
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
        },
        '/api/github-corporate': {
          target: graphqlTarget,
          changeOrigin: true,
          rewrite: (path) => '/graphql'
        }
      }
    }
  };
});
