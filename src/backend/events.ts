import tryCatch from './tryCatchHandler';
import { app, dialog, ipcMain, shell, OpenDialogOptions } from 'electron';
import { loadMods, saveMods, addMod } from './db/api';
import { Mod } from 'types';

const browseForMod = tryCatch((fromZip: boolean) => {
  const options: OpenDialogOptions = fromZip
    ? { properties: ['openFile'], filters: [{ name: 'Compressed Files', extensions: ['zip'] }] }
    : { properties: ['openDirectory'] };
  const filePath = dialog.showOpenDialogSync(options)?.[0];
  return filePath || false;
});

app
  .whenReady()
  .then(async () => {
    ipcMain.on('open-external-link', (_, href: string) => {
      shell.openExternal(href).catch(console.error);
    });
    ipcMain.handle('load-mods', loadMods);
    ipcMain.handle('set-mods', (_, mods: Mod[]) => saveMods(mods));
    ipcMain.handle('browse-mod', (_, fromZip) => browseForMod(fromZip));
    ipcMain.handle('add-mod', (_, formData) => {
      return addMod(formData);
    });
  })
  .catch(console.error);
