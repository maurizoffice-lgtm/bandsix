import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages serves the site from /<repo-name>/; set BASE_PATH in the deploy workflow.
  base: process.env.BASE_PATH || '/',
  define: { __BUILD_ID__: JSON.stringify(Date.now().toString(36)) },
  build: { target: 'es2020' },
});
