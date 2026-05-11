import { BrowserWindow, dialog } from 'electron';
import path from 'path';
import { dismissDownload, getActiveDownloads } from './downloadManager';

let getModsWindow: BrowserWindow | null = null;

export const getGetModsWindow = () => getModsWindow;

export const createOrFocusGetModsWindow = () => {
  if (getModsWindow && !getModsWindow.isDestroyed()) {
    getModsWindow.focus();
    return getModsWindow;
  }

  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
    },
    icon: 'public/256x256.png',
  });

  getModsWindow = window;

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void window.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}#/get-mods`);
  } else {
    void window.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`), {
      hash: '/get-mods',
    });
  }

  window.webContents.on('will-prevent-unload', (event) => {
    const choice = dialog.showMessageBoxSync(window, {
      type: 'question',
      buttons: ['Close Anyway', 'Stay'],
      defaultId: 1,
      cancelId: 1,
      title: 'Mods Pending Installation',
      message: 'You have mods that have not been installed yet. Are you sure you want to close?',
    });
    if (choice === 0) {
      event.preventDefault();
    }
  });

  window.on('closed', () => {
    for (const download of getActiveDownloads()) {
      void dismissDownload(download.id);
    }
    if (getModsWindow === window) {
      getModsWindow = null;
    }
  });

  return window;
};
