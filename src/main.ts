import { app, BrowserWindow, Menu } from 'electron';
import path from 'path';
import './backend/mainEvents';
import './backend/db/api';
import { template, createLaunchShortcut } from './menu';
import { updateElectronApp } from 'update-electron-app';
import check from './electron-squirrel-startup';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (check) {
  createLaunchShortcut();
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
  mainWindow = new BrowserWindow({
    minWidth: 1152,
    minHeight: 648,
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
    icon: 'public/256x256.png',
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
