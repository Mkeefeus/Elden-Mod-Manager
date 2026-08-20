import { app, autoUpdater, BrowserWindow, Menu, screen } from 'electron';
import path from 'path';
import '@backend/mainEvents';
import { template } from './menu';
import check from './electron-squirrel-startup';
import { getWindowState, setWindowState } from '@backend/db/api';
import { logger } from './utils/mainLogger';
import { initDownloadManager } from '@backend/downloadManager';
import { getGetModsWindow } from '@backend/getModsWindow';
import { type UpdateResult } from 'types';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// Squirrel relaunches the app with a --squirrel-* flag during install/update, and
// app.quit() is async, so execution continues past this point. Everything below
// that opens a window or starts the updater is guarded on `check` — without that
// guard a BrowserWindow is created and painted before the quit lands, which shows
// up as a screen flash while an update is being applied.
if (check) {
  app.quit();
}

const isLinux = process.platform === 'linux';

// --- Updates ---------------------------------------------------------------
// Nothing is downloaded in the background. The footer polls the GitHub API to
// learn that a newer release exists (see getLatestVersion in mainEvents), and
// the download only starts when the user confirms it in the update modal.
// Applying a Squirrel update relaunches the app, so keeping it user-initiated
// means the restart is expected rather than a surprise.

const UPDATE_FEED_HOST = 'https://update.electronjs.org';
const UPDATE_REPO = 'Mkeefeus/Elden-Mod-Manager';
const DOWNLOAD_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Electron's autoUpdater only works on packaged Windows (Squirrel) and macOS
 * builds. Anywhere else the user has to install the new version by hand.
 */
export const canAutoUpdate = () => !isLinux && !check && app.isPackaged;

let feedConfigured = false;
let updateInProgress = false;

const configureFeed = () => {
  if (feedConfigured) return;
  const feedURL = `${UPDATE_FEED_HOST}/${UPDATE_REPO}/${process.platform}-${process.arch}/${app.getVersion()}`;
  logger.debug(`[updater] feed URL: ${feedURL}`, { hideDisplay: true });
  autoUpdater.setFeedURL({
    url: feedURL,
    headers: { 'User-Agent': `Elden-Mod-Manager/${app.getVersion()} (${process.platform}: ${process.arch})` },
  });
  feedConfigured = true;
};

/**
 * Downloads the pending update and restarts into it. Resolves with `ok: false`
 * when there is nothing to install or the download failed, so the renderer can
 * fall back to sending the user to the GitHub release page.
 */
export const downloadAndInstallUpdate = (): Promise<UpdateResult> => {
  if (!canAutoUpdate()) return Promise.resolve({ ok: false, reason: 'unsupported' });
  if (updateInProgress) return Promise.resolve({ ok: false, reason: 'in-progress' });

  updateInProgress = true;
  configureFeed();

  return new Promise<UpdateResult>((resolve) => {
    const finish = (result: UpdateResult) => {
      clearTimeout(timeout);
      autoUpdater.removeListener('update-downloaded', onDownloaded);
      autoUpdater.removeListener('update-not-available', onNotAvailable);
      autoUpdater.removeListener('error', onError);
      updateInProgress = false;
      resolve(result);
    };

    const onDownloaded = () => {
      logger.debug('[updater] update downloaded, restarting to install', { hideDisplay: true });
      finish({ ok: true });
      // Let the IPC reply flush so the modal can close before the app restarts.
      setImmediate(() => autoUpdater.quitAndInstall());
    };

    const onNotAvailable = () => {
      logger.debug('[updater] no update available from feed', { hideDisplay: true });
      finish({ ok: false, reason: 'not-available' });
    };

    const onError = (err: Error) => {
      logger.error(`[updater] ${err.message}`);
      finish({ ok: false, reason: 'error', message: err.message });
    };

    const timeout = setTimeout(() => {
      logger.error('[updater] timed out waiting for the update to download');
      finish({ ok: false, reason: 'timeout' });
    }, DOWNLOAD_TIMEOUT_MS);

    autoUpdater.once('update-downloaded', onDownloaded);
    autoUpdater.once('update-not-available', onNotAvailable);
    autoUpdater.once('error', onError);

    logger.debug('[updater] checking for updates', { hideDisplay: true });
    autoUpdater.checkForUpdates();
  });
};

let mainWindow: BrowserWindow | null;

export const getMainWindow = () => mainWindow;
const menu = Menu.buildFromTemplate(template);
// app.setPath('temp', path.join(app.getPath('temp'), 'elden-mod-manager'));

Menu.setApplicationMenu(menu);

const createWindow = () => {
  // Create the browser window.
  const savedState = getWindowState();

  // On Linux, getBounds() unreliably reports x/y as 0,0 (X11/Wayland limitation),
  // so position/display restoration is skipped — size only is restored.
  // On other platforms, validate the saved display still exists and the window
  // fits within its bounds; fall back to centered on primary if not.
  let windowX: number | undefined;
  let windowY: number | undefined;

  if (!isLinux) {
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

  mainWindow = new BrowserWindow({
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

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Persist window state on resize/move (debounced) and on close
  const saveState = (source: string) => {
    if (!mainWindow) return;
    const winBounds = mainWindow.getBounds();
    logger.debug(`Saving window state due to ${source}`);
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

  mainWindow.on('resize', () => saveStateDebounced('resize'));
  mainWindow.on('moved', () => saveStateDebounced('move'));
  mainWindow.on('close', () => {
    saveState('close');
    const gmWin = getGetModsWindow();
    if (gmWin && !gmWin.isDestroyed()) gmWin.destroy();
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL).catch(console.error);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)).catch(console.error);
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  // Squirrel hook run — the pending app.quit() hasn't landed yet. Creating a
  // window here would briefly flash it on screen before the process exits.
  if (check) return;
  createWindow();
  initDownloadManager(() => getGetModsWindow());
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (!check && BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
