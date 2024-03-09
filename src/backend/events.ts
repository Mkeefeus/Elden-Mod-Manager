import { app, dialog, ipcMain, shell } from 'electron';
import { loadMods, saveMods } from './db/api';
import { Mod } from 'types';

async function browseForModZip() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Compressed Files', extensions: ['zip'] }],
  });
  if (!canceled) {
    return filePaths[0];
  }
}

async function browseForModPath() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  if (!canceled) {
    return filePaths[0];
  }
}

app
  .whenReady()
  .then(() => {
    ipcMain.on('open-external-link', (_, href: string) => {
      shell.openExternal(href).catch(console.error);
    });
    ipcMain.handle('load-mods', loadMods);
    ipcMain.handle('set-mods', (_, mods: Mod[]) => saveMods(mods));
    ipcMain.handle('browse-mod-zip', browseForModZip);
    ipcMain.handle('browse-mod-path', browseForModPath);
  })
  .catch(console.error);
