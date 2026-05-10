import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { randomUUID } from 'crypto';
import path from 'path';
import {
  clearFirstRun,
  getModEnginePath,
  getModsFolder,
  getPromptedModsFolder,
  getActiveProfile,
  getActiveProfileId,
  updateActiveProfile,
  isFirstRun,
  loadMods,
  saveMods,
  saveProfileRefs,
  setModEnginePath,
  clearPromptedModsFolder,
  setModsFolder,
  getProfiles,
  saveProfiles,
  setActiveProfileId,
  getLauncherSettings,
  setLauncherSettings,
} from './db/api';
import { AddModFormValues, BrowseType, LogEntry, Mod, ProfileModRef } from 'types';
import { existsSync } from 'fs';
import { join, normalize, sep } from 'path';
import { CreateModPathFromName, errToString } from '../utils/utilities';
import { handleLog, logger } from '../utils/mainLogger';
import { launchEldenRingModded, promptME3Install, updateME3Path, detectME3 } from './me3';
import { launchEldenRing } from './steam';
import {
  browse,
  extractModArchive,
  scanDirForFile,
  listIniFiles,
  readIniFile,
  writeIniFile,
  saveFilePath,
} from './fileSystem';
import { handleAddMod, handleDeleteMod, updateModsFolder } from './mods';
import { exportSettings, importSettings } from './importExport';
import {
  handleCreateProfile,
  handleApplyProfile,
  handleUpdateProfile,
  handleDeleteProfile,
  handleRenameProfile,
} from './profiles';
import { initMe3ProfileWatchers } from './me3Profile';
import { getMainWindow } from '../main';
import { validateNexusApiKey } from './nexus';
import { getActiveDownloads, cancelDownload, dismissDownload, addLocalDownload } from './downloadManager';

const { debug, error, warning } = logger;

let getModsWindow: BrowserWindow | null = null;

export const getGetModsWindow = () => getModsWindow;

app
  .whenReady()
  .then(() => {
    debug('App starting');
    debug('Registering IPC events');
    ipcMain.on('open-external-link', (_, href: string) => {
      void shell.openExternal(href);
    });

    // --- Get Mods Window ---
    ipcMain.on('open-get-mods-window', () => {
      if (getModsWindow && !getModsWindow.isDestroyed()) {
        getModsWindow.focus();
        return;
      }
      getModsWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        webPreferences: {
          preload: path.join(__dirname, 'preload.js'),
          webviewTag: true,
        },
        icon: 'public/256x256.png',
      });

      if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        void getModsWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}#/get-mods`);
      } else {
        void getModsWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`), {
          hash: '/get-mods',
        });
      }

      getModsWindow.webContents.on('will-prevent-unload', (event) => {
        const choice = dialog.showMessageBoxSync(getModsWindow!, {
          type: 'question',
          buttons: ['Close Anyway', 'Stay'],
          defaultId: 1,
          cancelId: 1,
          title: 'Mods Pending Installation',
          message: 'You have mods that have not been installed yet. Are you sure you want to close?',
        });
        if (choice === 0) {
          event.preventDefault(); // allows the unload to proceed
        }
      });

      getModsWindow.on('closed', () => {
        // Dismiss all pending downloads to clean up temp files
        for (const dl of getActiveDownloads()) {
          void dismissDownload(dl.id);
        }
        getModsWindow = null;
      });
    });

    // --- Download Manager IPC ---
    ipcMain.handle('get-downloads', () => getActiveDownloads());
    ipcMain.on('cancel-download', (_, id: string) => cancelDownload(id));
    ipcMain.on('dismiss-download', (_, id: string) => {
      void dismissDownload(id);
    });
    ipcMain.handle('add-local-download', (_, id: string, filename: string, extractedPath: string) =>
      addLocalDownload(id, filename, 'local', extractedPath)
    );

    ipcMain.handle('load-mods', loadMods);
    ipcMain.handle('set-mods', (_, mods: Mod[]) => {
      return saveMods(mods);
    });
    ipcMain.handle('save-profile-refs', (_, refs: string[]) => {
      const activeId = getActiveProfileId();
      if (!activeId) return false;
      return saveProfileRefs(activeId, refs);
    });
    ipcMain.handle('browse', (_, type: BrowseType, title?: string, startingDir?: string) => {
      return browse(type, title, startingDir);
    });

    ipcMain.handle('extract-archive', async (_, archivePath: string) => {
      return await extractModArchive(archivePath);
    });

    ipcMain.handle('scan-dir', (_, dirPath: string, extension: string) => {
      return scanDirForFile(dirPath, extension);
    });

    ipcMain.handle('add-mod', (_, formData: AddModFormValues) => {
      const result = handleAddMod(formData);
      if (result) getMainWindow()?.webContents.send('mods-changed');
      return result;
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
        void shell.openPath(join(getModsFolder(), CreateModPathFromName(mod.name, mod.version), mod.exe!));
      } catch (err) {
        const msg = `An error occured while launching mod executable: ${errToString(err)}`;
        error(msg);
        throw new Error(msg, { cause: err });
      }
    });

    ipcMain.on('open-mod-folder', (_, mod: Mod) => {
      debug(`Opening mod folder: ${mod.name}`);
      void shell.openPath(join(getModsFolder(), CreateModPathFromName(mod.name, mod.version)));
    });

    ipcMain.on('log', (event, log: LogEntry) => {
      handleLog(log, event.sender);
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

    ipcMain.handle('get-active-profile', () => {
      return getActiveProfile();
    });

    ipcMain.on(
      'update-active-profile-settings',
      (_, fields: { savefile?: string; startOnline?: boolean; disableArxan?: boolean; noMemPatch?: boolean }) => {
        updateActiveProfile(fields);
      }
    );

    ipcMain.handle('get-launcher-settings', () => {
      return getLauncherSettings();
    });

    ipcMain.on(
      'update-launcher-settings',
      (_, fields: { noBootBoost?: boolean; showLogos?: boolean; skipSteamInit?: boolean }) => {
        setLauncherSettings(fields);
      }
    );

    ipcMain.handle('export-settings', () => {
      const dest = saveFilePath('emm-settings.json', 'Export Settings');
      if (!dest) return false;
      exportSettings(dest);
      return true;
    });

    ipcMain.handle('import-settings', () => {
      const src = browse('binary', 'Import Settings');
      if (!src) return undefined;
      return importSettings(src);
    });

    ipcMain.handle('detect-me3', () => {
      return detectME3();
    });

    // Profile handlers
    ipcMain.handle('load-profiles', () => getProfiles());
    ipcMain.handle('get-active-profile-id', () => getActiveProfileId());
    ipcMain.handle('create-profile', (_, name: string) => handleCreateProfile(name));
    ipcMain.handle('apply-profile', (_, uuid: string) => handleApplyProfile(uuid));
    ipcMain.handle('delete-profile', (_, uuid: string) => handleDeleteProfile(uuid));
    ipcMain.on('rename-profile', (_, uuid: string, name: string) => handleRenameProfile(uuid, name));
    ipcMain.handle('update-profile', (_, uuid: string) => handleUpdateProfile(uuid));

    // INI file editor
    ipcMain.handle('list-ini-files', (_, mod: Mod) => {
      const modDir = join(getModsFolder(), CreateModPathFromName(mod.name, mod.version));
      return listIniFiles(modDir);
    });

    ipcMain.handle('read-ini-file', (_, mod: Mod, filename: string) => {
      const modDir = join(getModsFolder(), CreateModPathFromName(mod.name, mod.version));
      const filePath = join(modDir, filename);
      // Prevent path traversal
      if (!filePath.startsWith(normalize(modDir) + sep)) {
        throw new Error('Invalid filename');
      }
      return readIniFile(filePath);
    });

    ipcMain.handle('write-ini-file', (_, mod: Mod, filename: string, content: string) => {
      const modDir = join(getModsFolder(), CreateModPathFromName(mod.name, mod.version));
      const filePath = join(modDir, filename);
      // Prevent path traversal
      if (!filePath.startsWith(normalize(modDir) + sep)) {
        throw new Error('Invalid filename');
      }
      return writeIniFile(filePath, content);
    });

    // Version check — returns { version, url } if a newer release exists, otherwise null
    ipcMain.handle('get-latest-version', async () => {
      try {
        const res = await fetch('https://api.github.com/repos/Mkeefeus/Elden-Mod-Manager/releases/latest', {
          headers: { 'User-Agent': 'Elden-Mod-Manager' },
        });
        const data = (await res.json()) as { tag_name: string; html_url: string };
        const latest = data.tag_name.replace(/^v/, '');
        const current = app.getVersion();
        const isNewer =
          latest
            .split('.')
            .map(Number)
            .reduce((acc, n, i) => {
              if (acc !== 0) return acc;
              return n - (current.split('.').map(Number)[i] ?? 0);
            }, 0) > 0;
        return isNewer ? { version: latest, url: data.html_url } : null;
      } catch (err) {
        debug(`Version check failed: ${errToString(err)}`);
        return null;
      }
    });

    // Startup: check if ME3 is available; prompt user if not found
    const storedPath = getModEnginePath();
    const me3Available =
      (storedPath && existsSync(storedPath)) ||
      (() => {
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
    const profiles = getProfiles();
    if (profiles.length === 0) {
      const defaultProfile = {
        uuid: randomUUID(),
        name: 'Default',
        createdAt: Date.now(),
        mods: [],
        savefile: '',
        startOnline: false,
        disableArxan: false,
        noMemPatch: false,
      };
      saveProfiles([defaultProfile]);
      setActiveProfileId(defaultProfile.uuid);
      debug(`Created default profile: ${defaultProfile.uuid}`);
    } else if (!profiles.some((profile) => profile.uuid === getActiveProfileId())) {
      setActiveProfileId(profiles[0].uuid);
      debug(`Recovered missing active profile: ${profiles[0].uuid}`);
    }

    if (isFirstRun()) {
      clearFirstRun();
    }

    initMe3ProfileWatchers();

    debug('App started');
  })
  .catch((err) => {
    error(`An error occured while starting app: ${errToString(err)}`);
  });
