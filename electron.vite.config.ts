import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared'),
        '@main': resolve(__dirname, 'src/main'),
      },
    },
    build: {
      outDir: 'out/main',
      lib: {
        entry: resolve(__dirname, 'src/main/app.ts'),
      },
      rollupOptions: {
        external: ['better-sqlite3', 'sharp', 'node-machine-id', 'archiver'],
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared'),
        '@preload': resolve(__dirname, 'src/preload'),
      },
    },
    build: {
      outDir: 'out/preload',
      lib: {
        entry: resolve(__dirname, 'src/preload/preload.ts'),
      },
    },
  },
  renderer: {
    root: '.',
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared'),
        '@renderer': resolve(__dirname, 'src/renderer'),
        '@toolbar': resolve(__dirname, 'src/toolbar'),
        '@annotation': resolve(__dirname, 'src/annotation'),
        '@region': resolve(__dirname, 'src/region'),
      },
    },
    plugins: [react()],
    build: {
      outDir: 'out/renderer',
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'src/renderer/index.html'),
          toolbar: resolve(__dirname, 'src/toolbar/index.html'),
          annotation: resolve(__dirname, 'src/annotation/index.html'),
          region: resolve(__dirname, 'src/region/index.html'),
        },
      },
    },
  },
});
