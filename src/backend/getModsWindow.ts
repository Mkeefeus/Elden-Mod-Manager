import { BrowserWindow, dialog } from 'electron';
import path from 'path';
import { dismissDownload, getActiveDownloads } from './downloadManager';
import { getWindow, registerWindow } from './windowManager';

export const createOrFocusGetModsWindow = () => {
  const existing = getWindow('getMods');
  if (existing) {
    existing.focus();
    return existing;
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
    // icon: 'public/256x256.png',
  });

  registerWindow('getMods', window);

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
  });

  return window;
};
