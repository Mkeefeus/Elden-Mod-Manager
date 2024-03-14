import tryCatch from './tryCatchHandler';
import { app, dialog, ipcMain, shell } from 'electron';
import { loadMods, saveMods, addMod } from './db/api';
import { Mod } from 'types';

const browseForModZip = tryCatch(() => {
  const filePaths = dialog.showOpenDialogSync({
    properties: ['openFile'],
    filters: [{ name: 'Compressed Files', extensions: ['zip'] }],
  });
  return filePaths?.[0];
});

const browseForModPath = tryCatch(() => {
  const filePaths = dialog.showOpenDialogSync({
    properties: ['openDirectory'],
  });
  return filePaths?.[0];
});

app
  .whenReady()
  .then(async () => {
    ipcMain.on('open-external-link', (_, href: string) => {
      shell.openExternal(href).catch(console.error);
    });
    ipcMain.handle('load-mods', loadMods);
    ipcMain.handle('set-mods', (_, mods: Mod[]) => saveMods(mods));
    ipcMain.handle('browse-mod-zip', browseForModZip);
    ipcMain.handle('browse-mod-path', browseForModPath);
    ipcMain.handle('add-mod', (_, formData) => {
      return addMod(formData);
    });
  })
  .catch(console.error);
