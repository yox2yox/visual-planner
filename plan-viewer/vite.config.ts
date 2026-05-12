import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  base: './',
  plugins: [svelte(), viteSingleFile()],
  build: {
    outDir: '../.apm/skills/sensei/viewer',
    emptyOutDir: true,
  },
  test: {
    environment: 'node',
    include: [
      'src/**/*.{test,spec}.{js,ts,mjs}',
      '../.apm/skills/sensei/scripts/__tests__/**/*.{test,spec}.{js,ts,mjs}',
    ],
  },
})
