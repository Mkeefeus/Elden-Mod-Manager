import { app, dialog, ipcMain, shell } from 'electron';
import { loadMods, saveMods } from './db/api';
import { Mod } from 'types';

async function getFilePath() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      // { name: 'Executable Files', extensions: ['exe'] },
      { name: 'Compressed Files', extensions: ['zip', 'rar', '7z'] },
      { name: 'Folder', extensions: [''] },
      { name: 'All Files', extensions: ['*'] },
    ],
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
    ipcMain.handle('get-file-path', getFilePath);
  })
  .catch(console.error);
