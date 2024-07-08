import { app, ipcMain, shell } from 'electron';
import {
  clearFirstRun,
  getModEnginePath,
  getModsFolder,
  getPromptedModsFolder,
  isFirstRun,
  loadMods,
  saveMods,
  setModEnginePath,
  clearPromptedModsFolder,
  setModsFolder,
} from './db/api';
import { AddModFormValues, BrowseType, Mod } from 'types';
import { cpSync, existsSync, renameSync } from 'fs';
import { CreateModPathFromName, errToString } from '../utils/utilities';
import { handleLog, logger } from '../utils/mainLogger';
import { LogEntry } from 'winston';
import { launchEldenRingModded, promptME2Install, updateME2Path } from './me2';
import { launchEldenRing } from './steam';
import { browse, extractModZip } from './fileSystem';
import { handleAddMod, handleDeleteMod, updateModsFolder } from './mods';
import './toml';
import './ini';
import { getMainWindow } from '../main';
import path from 'path';

const { debug, error } = logger;

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
      console.log(zipPath)
      return await extractModZip(zipPath);
    });

    ipcMain.handle('add-mod', (_, formData: AddModFormValues) => {
      return handleAddMod(formData);
    });

    ipcMain.handle('delete-mod', (_, mod: Mod) => {
      return handleDeleteMod(mod);
    });

    ipcMain.on('launch-game', (_, modded: boolean) => {
      return modded ? launchEldenRingModded() : launchEldenRing();
    });

    ipcMain.on('launch-mod-exe', (_, mod: Mod) => {
      debug(`Launching mod executable: ${mod.exe}`);
      try {
        shell.openPath(`${getModsFolder()}\\${CreateModPathFromName(mod.name)}\\${mod.exe}`);
      } catch (err) {
        const msg = `An error occured while launching mod executable: ${errToString(err)}`;
        error(msg);
        throw new Error(msg);
      }
    });

    ipcMain.on('log', (_, log: LogEntry) => {
      handleLog(log);
    });

    ipcMain.on('set-me2-path', (_, path: string) => {
      setModEnginePath(path);
    });

    ipcMain.handle('get-me2-path', () => {
      return getModEnginePath();
    });

    ipcMain.handle('get-mods-path', () => {
      return getModsFolder();
    });

    // Packaging ME2 with the app as a redist instead
    // ipcMain.handle('install-me2', () => {
    //   return downloadModEngine2();
    // });

    ipcMain.handle('check-mods-folder-prompt', () => {
      return getPromptedModsFolder();
    });

    ipcMain.on('clear-prompted-mods-folder', () => {
      clearPromptedModsFolder();
    });

    ipcMain.on('save-mods-folder', (_, path: string) => {
      setModsFolder(path);
    });

    ipcMain.on('update-me2-path', (_, path: string) => {
      updateME2Path(path);
    });

    ipcMain.on('update-mods-folder', (_, path: string) => {
      updateModsFolder(path);
    });

    const devMode = process.env.NODE_ENV === 'development';
    const me2Dir = getModEnginePath();
    if (!existsSync(me2Dir)) {
      const me2Source = devMode
        ? path.join(__dirname, '/../../ModEngine2')
        : path.join(process.resourcesPath, '/ModEngine2');
      cpSync(me2Source, me2Dir, { recursive: true });
    }
    const modsDir = getModsFolder();
    if (!existsSync(modsDir)) {
      const modsSource = devMode ? path.join(__dirname, '/../../Mods') : path.join(process.resourcesPath, '/Mods');
      cpSync(modsSource, modsDir, { recursive: true });
    }

    // Startup tasks
    if (isFirstRun()) {
      const window = getMainWindow();
      if (!window) {
        throw new Error('Main window not found');
      }
      window.once('ready-to-show', () => {
        promptME2Install();
      });
      clearFirstRun();
    }
    debug('App started');
  })
  .catch((err) => {
    error(`An error occured while starting app: ${errToString(err)}`);
  });
process;
