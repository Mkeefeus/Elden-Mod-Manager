import { app, ipcMain, shell } from 'electron';
import {
  clearFirstRun,
  getModEnginePath,
  getModFolderPath,
  getPromptedModsFolder,
  isFirstRun,
  loadMods,
  saveMods,
  setModEnginePath,
  clearPromptedModsFolder,
  setModFolderPath,
} from './db/api';
import { AddModFormValues, BrowseType, Mod } from 'types';
import { existsSync, rmSync } from 'fs';
import { CreateModPathFromName, errToString } from '../utils/utilities';
import { handleLog, logger } from '../utils/mainLogger';
import { LogEntry } from 'winston';
import { downloadModEngine2, launchEldenRingModded, promptME2Install } from './me2';
import { launchEldenRing } from './steam';
import { browse, extractModZip } from './fileSystem';
import { handleAddMod, handleDeleteMod } from './mods';
import './toml';

const { debug, error } = logger;

const clearTemp = () => {
  debug('Clearing temp directory');
  const tempDir = app.getPath('temp');
  //check if temp directory exists
  if (!existsSync(tempDir)) {
    debug('Temp directory not found');
    return;
  }
  try {
    rmSync(tempDir, { recursive: true });
    debug('Temp directory cleared');
  } catch (err) {
    const msg = `An error occured while clearing temp directory: ${errToString(err)}`;
    error(msg);
    throw new Error(msg);
  }
};

app
  .whenReady()
  .then(() => {
    debug('App starting');
    debug('Registering IPC events');
    ipcMain.on('open-external-link', (_, href: string) => {
      shell.openExternal(href);
    });
    ipcMain.handle('load-mods', loadMods);
    ipcMain.handle('set-mods', (_, mods: Mod[]) => saveMods(mods));
    ipcMain.handle('browse', (_, type: BrowseType, title?: string, startingDir?: string) => {
      return browse(type, title, startingDir);
    });

    ipcMain.handle('extract-zip', async (_, zipPath: string) => {
      return extractModZip(zipPath);
    });

    ipcMain.handle('add-mod', (_, formData: AddModFormValues) => {
      return handleAddMod(formData);
    });

    ipcMain.on('delete-mod', (_, mod: Mod) => {
      handleDeleteMod(mod);
    });

    ipcMain.on('launch-game', (_, modded: boolean) => {
      return modded ? launchEldenRingModded() : launchEldenRing();
    });

    ipcMain.on('launch-mod-exe', (_, mod: Mod) => {
      debug(`Launching mod executable: ${mod.exe}`);
      try {
        shell.openPath(`${getModFolderPath()}\\${CreateModPathFromName(mod.name)}\\${mod.exe}`);
      } catch (err) {
        const msg = `An error occured while launching mod executable: ${errToString(err)}`;
        error(msg);
        throw new Error(msg);
      }
    });

    ipcMain.on('log', (_, log: LogEntry) => {
      handleLog(log);
    });

    ipcMain.on('clear-temp', () => {
      clearTemp();
    });

    ipcMain.on('set-me2-path', (_, path: string) => {
      setModEnginePath(path);
    });

    ipcMain.handle('get-me2-path', () => {
      return getModEnginePath();
    });

    ipcMain.handle('get-mods-path', () => {
      return getModFolderPath();
    });

    ipcMain.handle('install-me2', () => {
      return downloadModEngine2();
    });

    ipcMain.handle('check-mods-folder-prompt', () => {
      return getPromptedModsFolder();
    });

    ipcMain.on('clear-prompted-mods-folder', () => {
      clearPromptedModsFolder();
    });

    ipcMain.on('save-mods-folder', (_, path: string) => {
      setModFolderPath(path);
    });

    // Startup tasks
    if (isFirstRun()) {
      promptME2Install();
      clearFirstRun();
    }
    // clearTemp();
    debug('App started');
  })
  .catch((err) => {
    error(`An error occured while starting app: ${errToString(err)}`);
  });
process;
