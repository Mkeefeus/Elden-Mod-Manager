import { app, BrowserWindow, Menu, screen } from 'electron';
import path from 'path';
import './backend/mainEvents';
import { template } from './menu';
import { updateElectronApp } from 'update-electron-app';
import check from './electron-squirrel-startup';
import { getWindowState, setWindowState } from './backend/db/api';
import { logger } from './utils/mainLogger';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (check) {
  app.quit();
}

updateElectronApp({ repo: 'Mkeefeus/Elden-Mod-Manager', updateInterval: '5 minutes' });

let mainWindow: BrowserWindow | null;

export const getMainWindow = () => mainWindow;
const menu = Menu.buildFromTemplate(template);
// app.setPath('temp', path.join(app.getPath('temp'), 'elden-mod-manager'));

Menu.setApplicationMenu(menu);

const createWindow = () => {
  // Create the browser window.
  const savedState = getWindowState();
  const isLinux = process.platform === 'linux';

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
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
    icon: 'public/256x256.png',
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
      setWindowState({ width: winBounds.width, height: winBounds.height, x: winBounds.x, y: winBounds.y, displayId: display.id });
    }
  };

  let saveTimeout: ReturnType<typeof setTimeout> | null = null;
  const saveStateDebounced = (source: string) => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => saveState(source), 500);
  };

  mainWindow.on('resize', () => saveStateDebounced('resize'));
  mainWindow.on('moved', () => saveStateDebounced('move'));
  mainWindow.on('close', () => saveState('close'));

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
app.on('ready', createWindow);

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
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
