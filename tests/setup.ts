import { afterEach, vi } from 'vitest';
import { closeTestStore } from './helpers/store';
import { cleanupTempDirs } from './helpers/tempDir';

// Runs before every test file (see `setupFiles` in vitest.config.ts). Mocks declared here apply to all tests;
// a test file can still replace one with its own vi.mock() of the same module.

// The real logger writes to a log file and pushes toasts to the main window
vi.mock('@utils/mainLogger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

// Route the app's store to the per-test store from openTestStore() (see tests/helpers/store.ts)
vi.mock('@backend/db/init', async () => {
  const { storeProxy } = await import('./helpers/store');
  return { default: storeProxy };
});

afterEach(() => {
  closeTestStore();
  cleanupTempDirs();
});
