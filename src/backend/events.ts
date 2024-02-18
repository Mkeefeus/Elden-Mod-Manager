import { app, ipcMain, shell } from 'electron';

app.on('ready', () => {
  ipcMain.on('open-external-link', (_, href: string) => {
    shell.openExternal(href).catch(console.error);
  });
});
