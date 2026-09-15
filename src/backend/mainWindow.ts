import { BrowserWindow } from 'electron';

// Deliberately its own module with no local imports. `getMainWindow` is needed by low-level code
// (mainLogger.ts) as well as by mainEvents.ts and startup.ts — if it lived in startup.ts (which
// creates the window) it would create a circular import, since startup.ts also needs to reach
// mainEvents.ts (to register IPC handlers) and mainLogger.ts (to log), both of which need
// getMainWindow. Keeping the window reference here, with startup.ts as the only writer, breaks
// that cycle.
let mainWindow: BrowserWindow | null = null;

export const getMainWindow = () => mainWindow;

export const setMainWindow = (window: BrowserWindow | null) => {
  mainWindow = window;
};
