import { BrowserWindow } from 'electron';

export type WindowKey = string;

const windows = new Map<WindowKey, BrowserWindow>();

/** Registers a window under `key`. Auto-unregisters itself when the window fires 'closed'. */
export const registerWindow = (key: WindowKey, window: BrowserWindow): void => {
  windows.set(key, window);
  window.once('closed', () => {
    if (windows.get(key) === window) windows.delete(key);
  });
};

export const unregisterWindow = (key: WindowKey): void => {
  windows.delete(key);
};

/** Returns the live window for `key`, or null if absent/destroyed (pruning it if destroyed). */
export const getWindow = (key: WindowKey): BrowserWindow | null => {
  const win = windows.get(key);
  if (!win) return null;
  if (win.isDestroyed()) {
    windows.delete(key);
    return null;
  }
  return win;
};

export const minimizeWindow = (key: WindowKey): void => {
  getWindow(key)?.minimize();
};

/** `force: true` uses `.destroy()` (bypasses beforeunload/will-prevent-unload); default is graceful `.close()`. */
export const closeWindow = (key: WindowKey, options?: { force?: boolean }): void => {
  const win = getWindow(key);
  if (!win) return;
  if (options?.force) {
    win.destroy();
  } else {
    win.close();
  }
};

export const closeAllWindows = (options?: { except?: WindowKey[]; force?: boolean }): void => {
  const except = new Set(options?.except ?? []);
  for (const key of [...windows.keys()]) {
    if (!except.has(key)) closeWindow(key, { force: options?.force });
  }
};

export const minimizeAllWindows = (options?: { except?: WindowKey[] }): void => {
  const except = new Set(options?.except ?? []);
  for (const key of [...windows.keys()]) {
    if (!except.has(key)) minimizeWindow(key);
  }
};

export const getMainWindow = () => getWindow('main');
export const getGetModsWindow = () => getWindow('getMods');
