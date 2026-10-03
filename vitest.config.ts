import { fileURLToPath } from 'url';
import { defineConfig } from 'vitest/config';

// Tests cover main-process logic only (src/backend, src/utils), so a plain Node environment is enough.
// `tsconfigPaths` mirrors the aliases the Vite configs use (~, @utils, @backend, ...).
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: [
      // Electron's runtime APIs don't exist under Node; swap in a stub (exact match so electron-store etc. are untouched)
      { find: /^electron$/, replacement: fileURLToPath(new URL('./tests/mocks/electron.ts', import.meta.url)) },
    ],
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    // Reset call history and undo vi.spyOn / vi.stubGlobal between tests so they can't leak into each other
    clearMocks: true,
    restoreMocks: true,
    unstubGlobals: true,
  },
});
