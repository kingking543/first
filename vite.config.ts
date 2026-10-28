import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {readFileSync} from 'node:fs';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',  // ← 添加这一行，解决 GitHub Pages 路径问题
    plugins: [react(), tailwindcss(), {
      name: 'official-draws-snapshot',
      configureServer(server) {
        server.middlewares.use('/data/official-draws.json', (_req, res, next) => {
          try {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Cache-Control', 'no-store');
            res.end(readFileSync(path.resolve(__dirname, 'src/data/official-draws.json')));
          } catch (error) {
            next(error);
          }
        });
      },
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'data/official-draws.json', source: readFileSync(path.resolve(__dirname, 'src/data/official-draws.json')) });
      },
    }],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
