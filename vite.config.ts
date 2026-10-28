import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {readFileSync} from 'node:fs';
import {defineConfig} from 'vite';

export default defineConfig({
  base: './',
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
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
  },
});
