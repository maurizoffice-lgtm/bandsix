import { defineConfig } from 'vite';

const BUILD_ID = Date.now().toString(36);

export default defineConfig({
  // GitHub Pages serves the site from /<repo-name>/; set BASE_PATH in the deploy workflow.
  base: process.env.BASE_PATH || '/',
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  build: { target: 'es2020' },
  plugins: [
    {
      // version.json lets an open or cached page notice that a newer deploy exists.
      name: 'build-version',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ id: BUILD_ID }) });
      },
    },
  ],
});
