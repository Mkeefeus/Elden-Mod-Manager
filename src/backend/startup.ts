import { randomUUID } from 'crypto';
import { BrowserWindow, screen } from 'electron';
import path from 'path';
import { ModProfile } from 'types';
import { logger } from '@utils/mainLogger';
import {
  clearFirstRun,
  getActiveProfileId,
  getLastPage,
  getProfiles,
  getWindowState,
  isFirstRun,
  saveProfiles,
  setActiveProfileId,
  setWindowState,
} from './db/api';
import { runMigrations } from './db/migrations';
import { initDownloadManager } from './downloadManager';
import { getGetModsWindow } from './getModsWindow';
import { registerIpcHandlers } from './mainEvents';
import { setMainWindow } from './mainWindow';

const { debug } = logger;

const isLinux = process.platform === 'linux';

export const createWindow = () => {
  debug('Creating main window...');
  // Create the browser window.
  const savedState = getWindowState();

  // On Linux, getBounds() unreliably reports x/y as 0,0 (X11/Wayland limitation),
  // so position/display restoration is skipped — size only is restored.
  // On other platforms, validate the saved display still exists and the window
  // fits within its bounds; fall back to centered on primary if not.
  let windowX: number | undefined;
  let windowY: number | undefined;

  if (!isLinux) {
    debug(`Restoring window state: ${JSON.stringify(savedState)}`);
    const displays = screen.getAllDisplays();
    const savedDisplay = displays.find((d) => d.id === savedState.displayId);
    const targetDisplay = savedDisplay ?? screen.getPrimaryDisplay();
    const { bounds } = targetDisplay;

    const isOnScreen =
      !!savedDisplay &&
      savedState.x >= bounds.x &&
      savedState.y >= bounds.y &&
      savedState.x + savedState.width <= bounds.x + bounds.width &&
      savedState.y + savedState.height <= bounds.y + bounds.height;

    windowX = isOnScreen ? savedState.x : bounds.x + Math.floor((bounds.width - savedState.width) / 2);
    windowY = isOnScreen ? savedState.y : bounds.y + Math.floor((bounds.height - savedState.height) / 2);
  }

  const window = new BrowserWindow({
    minWidth: 1280,
    minHeight: 720,
    width: savedState.width,
    height: savedState.height,
    x: windowX,
    y: windowY,
    // Start hidden and reveal once the renderer has painted, so an empty
    // window is never shown (avoids a blank flash on launch).
    show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  });
  setMainWindow(window);

  window.once('ready-to-show', () => {
    window.show();
  });

  // Persist window state on resize/move (debounced) and on close
  const saveState = (source: string) => {
    const winBounds = window.getBounds();
    debug(`Saving window state due to ${source}`);
    if (isLinux) {
      // Only save size on Linux — position is unreliable
      setWindowState({ ...savedState, width: winBounds.width, height: winBounds.height });
    } else {
      const display = screen.getDisplayMatching(winBounds);
      setWindowState({
        width: winBounds.width,
        height: winBounds.height,
        x: winBounds.x,
        y: winBounds.y,
        displayId: display.id,
      });
    }
  };

  let saveTimeout: ReturnType<typeof setTimeout> | null = null;
  const saveStateDebounced = (source: string) => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => saveState(source), 500);
  };

  window.on('resize', () => saveStateDebounced('resize'));
  window.on('moved', () => saveStateDebounced('move'));
  window.on('close', () => {
    saveState('close');
    const gmWin = getGetModsWindow();
    if (gmWin && !gmWin.isDestroyed()) gmWin.destroy();
  });

  // and load the index.html of the app, opening on the page the user was last on.
  const lastPage = getLastPage();
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    window.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}#${lastPage}`).catch(console.error);
  } else {
    window
      .loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`), { hash: lastPage })
      .catch(console.error);
  }
};

export const runStartupTasks = () => {
  const profiles = getProfiles();
  if (profiles.length === 0) {
    const defaultProfile: ModProfile = {
      uuid: randomUUID(),
      name: 'Default',
      createdAt: Date.now(),
      mods: [],
      startOnline: false,
      disableArxan: false,
      noMemPatch: false,
      noBootBoost: false,
      showLogos: false,
      skipSteamInit: false,
    };
    saveProfiles([defaultProfile]);
    setActiveProfileId(defaultProfile.uuid);
    debug(`Created default profile: ${defaultProfile.uuid}`);
  } else if (!profiles.some((profile) => profile.uuid === getActiveProfileId())) {
    setActiveProfileId(profiles[0].uuid);
    debug(`Recovered missing active profile: ${profiles[0].uuid}`);
  }

  runMigrations();
  registerIpcHandlers();

  if (isFirstRun()) {
    clearFirstRun();
  }

  createWindow();
  initDownloadManager(() => getGetModsWindow());
};
