import { tmpdir } from 'os';
import { join } from 'path';
import { vi } from 'vitest';

// Stand-in for the `electron` module, wired in for every test via the alias in vitest.config.ts. Electron's
// runtime APIs don't exist under plain Node, so backend modules that import them would otherwise fail to load.
// Individual tests can still override any of these with vi.mocked(...).mockReturnValue(...) and friends.

// Every app.getPath() lookup resolves under here (per process, since test files run in parallel workers), so
// nothing a test does touches the real user profile
export const ELECTRON_TEST_ROOT = join(tmpdir(), `emm-electron-test-${process.pid}`);

export const app = {
  isPackaged: false,
  getPath: vi.fn((name: string) => join(ELECTRON_TEST_ROOT, name)),
  // Deliberately not the repo root: fileSystem.ts chmods a 7-Zip binary under getAppPath() at import time
  getAppPath: vi.fn(() => join(ELECTRON_TEST_ROOT, 'app')),
  getVersion: vi.fn(() => '0.0.0-test'),
  quit: vi.fn(),
  on: vi.fn(),
};

export const shell = {
  openPath: vi.fn(() => Promise.resolve('')),
  openExternal: vi.fn(() => Promise.resolve()),
};

export const dialog = {
  showOpenDialogSync: vi.fn(),
  showSaveDialogSync: vi.fn(),
  showErrorBox: vi.fn(),
  showMessageBox: vi.fn(() => Promise.resolve({ response: 0 })),
};

export const ipcMain = {
  handle: vi.fn(),
  on: vi.fn(),
};

export const session = {
  defaultSession: { on: vi.fn() },
};

export const screen = {
  getAllDisplays: vi.fn(() => []),
  getPrimaryDisplay: vi.fn(),
};

export const autoUpdater = {
  setFeedURL: vi.fn(),
  checkForUpdates: vi.fn(),
  quitAndInstall: vi.fn(),
  on: vi.fn(),
  once: vi.fn(),
  removeListener: vi.fn(),
};

export const Menu = {
  buildFromTemplate: vi.fn(),
  setApplicationMenu: vi.fn(),
};

export class BrowserWindow {
  static getAllWindows = vi.fn(() => []);
}

export default { app, shell, dialog, ipcMain, session, screen, autoUpdater, Menu, BrowserWindow };
