import { app, ipcMain, shell } from 'electron';
import { loadMods, saveMods } from './db/api';
import { Mod } from 'types';

app
  .whenReady()
  .then(() => {
    ipcMain.on('open-external-link', (_, href: string) => {
      shell.openExternal(href).catch(console.error);
    });
    ipcMain.handle('get-mods', loadMods);
    ipcMain.handle('set-mods', (_, mods: Mod[]) => saveMods(mods));
  })
  .catch(console.error);
