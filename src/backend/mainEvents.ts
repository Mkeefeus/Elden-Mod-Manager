import { app, ipcMain, shell } from 'electron';
import { randomUUID } from 'crypto';
import {
  clearFirstRun,
  getModEnginePath,
  getModsFolder,
  getPromptedModsFolder,
  getSavefile,
  getStartOnline,
  isFirstRun,
  loadMods,
  saveMods,
  setModEnginePath,
  clearPromptedModsFolder,
  setModsFolder,
  setSavefile,
  setStartOnline,
  getProfiles,
  getActiveProfileId,
  saveProfiles,
  setActiveProfileId,
} from './db/api';
import { AddModFormValues, BrowseType, Mod } from 'types';
import { existsSync } from 'fs';
import { join } from 'path';
import { CreateModPathFromName, errToString } from '../utils/utilities';
import { handleLog, logger } from '../utils/mainLogger';
import { LogEntry } from 'winston';
import { launchEldenRingModded, promptME3Install, updateME3Path, detectME3 } from './me3';
import { launchEldenRing } from './steam';
import { browse, extractModZip } from './fileSystem';
import { handleAddMod, handleDeleteMod, updateModsFolder } from './mods';
import {
  handleCreateProfile,
  handleApplyProfile,
  handleUpdateProfile,
  handleDeleteProfile,
  handleRenameProfile,
} from './profiles';
import './me3Profile';
import { getMainWindow } from '../main';

const { debug, error } = logger;

app
  .whenReady()
  .then(() => {
    debug('App starting');
    debug('Registering IPC events');
    ipcMain.on('open-external-link', (_, href: string) => {
      void shell.openExternal(href);
    });
    ipcMain.handle('load-mods', loadMods);
    ipcMain.handle('set-mods', (_, mods: Mod[]) => saveMods(mods));
    ipcMain.handle('browse', (_, type: BrowseType, title?: string, startingDir?: string) => {
      return browse(type, title, startingDir);
    });

    ipcMain.handle('extract-zip', async (_, zipPath: string) => {
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
        void shell.openPath(join(getModsFolder(), CreateModPathFromName(mod.name), mod.exe!));
      } catch (err) {
        const msg = `An error occured while launching mod executable: ${errToString(err)}`;
        error(msg);
        throw new Error(msg, { cause: err });
      }
    });

    ipcMain.on('log', (_, log: LogEntry) => {
      handleLog(log);
    });

    ipcMain.on('set-me3-path', (_, path: string) => {
      setModEnginePath(path);
    });

    ipcMain.handle('get-me3-path', () => {
      return getModEnginePath();
    });

    ipcMain.handle('get-mods-path', () => {
      return getModsFolder();
    });

    ipcMain.handle('check-mods-folder-prompt', () => {
      return getPromptedModsFolder();
    });

    ipcMain.on('clear-prompted-mods-folder', () => {
      clearPromptedModsFolder();
    });

    ipcMain.on('save-mods-folder', (_, path: string) => {
      setModsFolder(path);
    });

    ipcMain.on('update-me3-path', (_, path: string) => {
      updateME3Path(path);
    });

    ipcMain.on('update-mods-folder', (_, path: string) => {
      updateModsFolder(path);
    });

    ipcMain.handle('get-savefile', () => {
      return getSavefile();
    });

    ipcMain.on('set-savefile', (_, value: string) => {
      setSavefile(value);
    });

    ipcMain.handle('get-start-online', () => {
      return getStartOnline();
    });

    ipcMain.on('set-start-online', (_, value: boolean) => {
      setStartOnline(value);
    });

    ipcMain.handle('detect-me3', () => {
      return detectME3();
    });

    // Profile handlers
    ipcMain.handle('load-profiles', () => getProfiles());
    ipcMain.handle('get-active-profile-id', () => getActiveProfileId());
    ipcMain.handle('create-profile', (_, name: string) => handleCreateProfile(name));
    ipcMain.handle('apply-profile', (_, uuid: string) => handleApplyProfile(uuid));
    ipcMain.on('delete-profile', (_, uuid: string) => handleDeleteProfile(uuid));
    ipcMain.on('rename-profile', (_, uuid: string, name: string) => handleRenameProfile(uuid, name));
    ipcMain.handle('update-profile', (_, uuid: string) => handleUpdateProfile(uuid));

    // Startup: check if ME3 is available; prompt user if not found
    const storedPath = getModEnginePath();
    const me3Available = (storedPath && existsSync(storedPath)) || (() => {
      const detected = detectME3();
      if (detected) {
        setModEnginePath(detected);
        return true;
      }
      return false;
    })();
    if (!me3Available) {
      const window = getMainWindow();
      if (window) {
        window.once('ready-to-show', () => {
          promptME3Install();
        });
      }
    }

    // Bootstrap a "Default" profile on first launch if none exist
    if (getProfiles().length === 0) {
      const defaultProfile = {
        uuid: randomUUID(),
        name: 'Default',
        createdAt: Date.now(),
        mods: [],
        savefile: '',
        startOnline: false,
      };
      saveProfiles([defaultProfile]);
      setActiveProfileId(defaultProfile.uuid);
      debug(`Created default profile: ${defaultProfile.uuid}`);
    }

    if (isFirstRun()) {
      clearFirstRun();
    }

    debug('App started');
  })
  .catch((err) => {
    error(`An error occured while starting app: ${errToString(err)}`);
  });
