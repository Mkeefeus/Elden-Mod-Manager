import tryCatch, { handleError } from './tryCatchHandler';
import { app, dialog, ipcMain, shell, OpenDialogOptions } from 'electron';
import { loadMods, saveMods } from './db/api';
import { AddModFormValues, Mod } from 'types';
import { randomUUID } from 'crypto';
import { cpSync, existsSync, unlinkSync, rmdirSync } from 'fs';
import decompress from 'decompress';
import { resolve } from 'path';

const browseForMod = tryCatch((fromZip: boolean) => {
  const options: OpenDialogOptions = fromZip
    ? { properties: ['openFile'], filters: [{ name: 'Compressed Files', extensions: ['zip'] }] }
    : { properties: ['openDirectory'] };
  const filePath = dialog.showOpenDialogSync(options)?.[0];
  return filePath || false;
});

const genUUID = (): string => {
  const uuid = randomUUID();
  const mods = loadMods();
  if (!mods) {
    throw new Error('Failed to load mods');
  }
  const existingUUIDs = mods.map((mod) => mod.uuid);
  return existingUUIDs?.includes(uuid) ? genUUID() : uuid;
};

const installMod = tryCatch(async (source: string, mod: Mod, fromZip: boolean) => {
  // const installPath = `./mods/${mod.uuid}/`;
  const pathName = mod.name.replace(/\s/g, '-').toLowerCase();
  console.log(fromZip, pathName);
  const installPath = `./mods/${pathName}/`;
  if (existsSync(installPath)) {
    return false;
  }
  if (fromZip) {
    await decompress(source, installPath);
  } else
    cpSync(source, installPath, {
      recursive: true,
    });
});

const handleAddMod = tryCatch(async (formData: AddModFormValues, fromZip: boolean) => {
  const mods = loadMods();
  if (!mods) {
    return false;
  }
  const newMod: Mod = {
    uuid: genUUID(),
    enabled: false,
    name: formData.modName,
    installDate: Date.now(),
    isDll: formData.isDll,
  };

  try {
    await installMod(formData.path, newMod, fromZip);
  } catch (err) {
    handleError(err);
    return false;
  }

  if (formData.delete) {
    try {
      if (existsSync(formData.path)) {
        if (fromZip) {
          unlinkSync(formData.path);
        } else {
          rmdirSync(formData.path, { recursive: true });
        }
      }
    } catch (err) {
      handleError(err);
    }
  }

  const newMods = [...(mods as Mod[]), newMod];
  saveMods(newMods);
  return true;
});

app
  .whenReady()
  .then(async () => {
    ipcMain.on('open-external-link', (_, href: string) => {
      shell.openExternal(href).catch(console.error);
    });
    ipcMain.handle('load-mods', loadMods);
    ipcMain.handle('set-mods', (_, mods: Mod[]) => saveMods(mods));
    ipcMain.handle('browse-mod', (_, fromZip: boolean) => browseForMod(fromZip));
    ipcMain.handle('add-mod', (_, formData: AddModFormValues, fromZip: boolean) => {
      return handleAddMod(formData, fromZip);
    });
  })
  .catch(console.error);
