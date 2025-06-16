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
        '/api/github-personal': {
          target: 'https://api.github.com',
          changeOrigin: true,
          rewrite: (path) => '/graphql'
        },
        '/api/github-corporate': {
          target: graphqlTarget,
          changeOrigin: true,
          rewrite: (path) => '/graphql',
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              if (req.body) {
                const bodyData = JSON.stringify(req.body);
                proxyReq.setHeader('Content-Type', 'application/json');
                proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
                proxyReq.write(bodyData);
              }
            });
          }
        }
      }
    }
  };
});
