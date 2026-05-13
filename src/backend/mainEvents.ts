import { app, dialog, ipcMain, shell } from 'electron';
import {
  getModEnginePath,
  getModsFolder,
  getPromptedModsFolder,
  getActiveProfile,
  getActiveProfileId,
  updateActiveProfile,
  loadMods,
  saveMods,
  saveProfileMods,
  setModEnginePath,
  clearPromptedModsFolder,
  setModsFolder,
  getProfiles,
  getLauncherSettings,
  setLauncherSettings,
} from './db/api';
import {
  AddModFormValues,
  BrowseType,
  ImportInstallTarget,
  ImportModResult,
  LogEntry,
  Mod,
  ProfileModRef,
} from 'types';
import { join, normalize, sep } from 'path';
import { CreateModPathFromName, errToString } from '../utils/utilities';
import { handleLog, logger } from '../utils/mainLogger';
import { launchEldenRingModded, updateME3Path, detectME3 } from './me3';
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
  handleDeleteProfile,
  handleRenameProfile,
  handleExportProfile,
  analyzeProfileImport,
  completeProfileImport,
} from './profiles';
import { ProfileImportAnalysis } from 'types';
import { getMainWindow } from '../main';
import { getActiveDownloads, cancelDownload, dismissDownload, addLocalDownload } from './downloadManager';
import { createOrFocusGetModsWindow, getGetModsWindow } from './getModsWindow';
import { runStartupTasks } from './startup';

const { debug, error, info } = logger;

type ActiveProfileSettingsPatch = {
  savefile?: string;
  startOnline?: boolean;
  disableArxan?: boolean;
  noMemPatch?: boolean;
};

type LauncherSettingsPatch = {
  noBootBoost?: boolean;
  showLogos?: boolean;
  skipSteamInit?: boolean;
};

const getInstalledModPath = (mod: Pick<Mod, 'name' | 'version'>) =>
  join(getModsFolder(), CreateModPathFromName(mod.name, mod.version));

const getSafeModFilePath = (mod: Pick<Mod, 'name' | 'version'>, filename: string) => {
  const modDir = getInstalledModPath(mod);
  const filePath = join(modDir, filename);
  if (!filePath.startsWith(normalize(modDir) + sep)) {
    throw new Error('Invalid filename');
  }
  return filePath;
};

const launchModExecutable = (mod: Mod) => {
  debug(`Launching mod executable: ${mod.exe}`);
  try {
    void shell.openPath(join(getInstalledModPath(mod), mod.exe!));
  } catch (err) {
    const msg = `An error occured while launching mod executable: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};

const openInstalledModFolder = (mod: Mod) => {
  debug(`Opening mod folder: ${mod.name}`);
  void shell.openPath(getInstalledModPath(mod));
};

const exportActiveProfile = (uuid: string) => {
  try {
    debug(`Exporting profile: ${uuid}`);
    const profiles = getProfiles();
    const profile = profiles.find((p) => p.uuid === uuid);
    if (!profile) {
      const msg = `Profile not found: ${uuid}`;
      error(msg);
      throw new Error(msg);
    }

    const dest = saveFilePath(`emm-profile-${profile.name}.json`, 'Export Profile');
    if (!dest) return;

    handleExportProfile(profile, dest);
    info(`Profile "${profile.name}" successfully exported to ${dest}`);
  } catch (err) {
    const msg = `An error occurred while exporting profile: ${errToString(err)}`;
    error(msg);
    dialog.showErrorBox('Export Failed', msg);
  }
};

const getLatestVersion = async () => {
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
};

const registerShellHandlers = () => {
  ipcMain.on('open-external-link', (_, href: string) => {
    void shell.openExternal(href);
  });
};

const registerWindowHandlers = () => {
  ipcMain.on('open-get-mods-window', () => {
    createOrFocusGetModsWindow();
  });
  ipcMain.on('open-get-mods-with-url', (_, url: string) => {
    const win = createOrFocusGetModsWindow();
    const sendNav = () => win.webContents.send('navigate-nexus-to', url);
    if (win.webContents.isLoading()) {
      win.webContents.once('did-finish-load', sendNav);
    } else {
      sendNav();
    }
  });
  ipcMain.on('open-get-mods-with-queue', (_, mods: ImportModResult[]) => {
    const win = createOrFocusGetModsWindow();
    const send = () => {
      win.webContents.send('set-import-queue', mods);
      const firstWithNexus = mods.find((mod) => mod.status !== 'installed' && mod.nexusModId);
      if (firstWithNexus?.nexusModId) {
        const domain = firstWithNexus.nexusGameDomain ?? 'eldenring';
        win.webContents.send(
          'navigate-nexus-to',
          `https://www.nexusmods.com/${domain}/mods/${firstWithNexus.nexusModId}`
        );
      }
    };
    if (win.webContents.isLoading()) {
      win.webContents.once('did-finish-load', send);
    } else {
      send();
    }
  });
  ipcMain.on('update-import-queue', (_, mods: ImportModResult[]) => {
    const win = getGetModsWindow();
    if (!win || win.isDestroyed()) return;
    win.webContents.send('set-import-queue', mods);
  });
};

const registerDownloadHandlers = () => {
  ipcMain.handle('get-downloads', () => getActiveDownloads());
  ipcMain.on('cancel-download', (_, id: string) => cancelDownload(id));
  ipcMain.on('dismiss-download', (_, id: string) => {
    void dismissDownload(id);
  });
  ipcMain.handle(
    'add-local-download',
    (_, id: string, filename: string, extractedPath: string, importTarget?: ImportInstallTarget) =>
      addLocalDownload(id, filename, 'local', extractedPath, importTarget)
  );
};

const registerModHandlers = () => {
  ipcMain.handle('load-mods', loadMods);
  ipcMain.handle('set-mods', (_, mods: Mod[]) => saveMods(mods));
  ipcMain.handle('save-profile-mods', (_, refs: ProfileModRef[]) => {
    const activeId = getActiveProfileId();
    if (!activeId) return false;
    return saveProfileMods(activeId, refs);
  });
  ipcMain.handle('add-mod', (_, formData: AddModFormValues) => {
    const result = handleAddMod(formData);
    if (result) getMainWindow()?.webContents.send('mods-changed');
    return result;
  });
  ipcMain.handle('delete-mod', (_, mod: Mod) => handleDeleteMod(mod));
  ipcMain.on('launch-mod-exe', (_, mod: Mod) => {
    launchModExecutable(mod);
  });
  ipcMain.on('open-mod-folder', (_, mod: Mod) => {
    openInstalledModFolder(mod);
  });
};

const registerFileSystemHandlers = () => {
  ipcMain.handle('browse', (_, type: BrowseType, title?: string, startingDir?: string) =>
    browse(type, title, startingDir)
  );
  ipcMain.handle('extract-archive', async (_, archivePath: string) => extractModArchive(archivePath));
  ipcMain.handle('scan-dir', (_, dirPath: string, extension: string) => scanDirForFile(dirPath, extension));
};

const registerGameHandlers = () => {
  ipcMain.on('launch-game', (_, modded: boolean) => {
    return modded ? launchEldenRingModded() : launchEldenRing();
  });
};

const registerSettingsHandlers = () => {
  ipcMain.on('log', (event, log: LogEntry) => {
    handleLog(log, event.sender);
  });
  ipcMain.on('set-me3-path', (_, path: string) => {
    setModEnginePath(path);
  });
  ipcMain.handle('get-me3-path', () => getModEnginePath());
  ipcMain.handle('get-mods-path', () => getModsFolder());
  ipcMain.handle('check-mods-folder-prompt', () => getPromptedModsFolder());
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
  ipcMain.handle('get-active-profile', () => getActiveProfile());
  ipcMain.on('update-active-profile-settings', (_, fields: ActiveProfileSettingsPatch) => {
    updateActiveProfile(fields);
  });
  ipcMain.handle('get-launcher-settings', () => getLauncherSettings());
  ipcMain.on('update-launcher-settings', (_, fields: LauncherSettingsPatch) => {
    setLauncherSettings(fields);
  });
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
  ipcMain.handle('detect-me3', () => detectME3());
};

const registerProfileHandlers = () => {
  ipcMain.handle('load-profiles', () => getProfiles());
  ipcMain.handle('get-active-profile-id', () => getActiveProfileId());
  ipcMain.handle('create-profile', (_, name: string) => handleCreateProfile(name));
  ipcMain.handle('apply-profile', (_, uuid: string) => handleApplyProfile(uuid));
  ipcMain.handle('delete-profile', (_, uuid: string) => handleDeleteProfile(uuid));
  ipcMain.on('rename-profile', (_, uuid: string, name: string) => {
    handleRenameProfile(uuid, name);
  });
  ipcMain.on('export-profile', (_, uuid: string) => {
    exportActiveProfile(uuid);
  });
  ipcMain.handle('analyze-profile-import', (_, srcPath: string) => analyzeProfileImport(srcPath));
  ipcMain.handle(
    'complete-profile-import',
    (_, analysis: ProfileImportAnalysis, manualMatches: Record<number, string>, profileName: string) =>
      completeProfileImport(analysis, manualMatches, profileName)
  );
};

const registerIniEditorHandlers = () => {
  ipcMain.handle('list-ini-files', (_, mod: Mod) => {
    const modDir = getInstalledModPath(mod);
    return listIniFiles(modDir);
  });
  ipcMain.handle('read-ini-file', (_, mod: Mod, filename: string) => {
    return readIniFile(getSafeModFilePath(mod, filename));
  });
  ipcMain.handle('write-ini-file', (_, mod: Mod, filename: string, content: string) => {
    return writeIniFile(getSafeModFilePath(mod, filename), content);
  });
};

const registerUpdateHandlers = () => {
  ipcMain.handle('get-latest-version', getLatestVersion);
};

const registerIpcHandlers = () => {
  registerShellHandlers();
  registerWindowHandlers();
  registerDownloadHandlers();
  registerModHandlers();
  registerFileSystemHandlers();
  registerGameHandlers();
  registerSettingsHandlers();
  registerProfileHandlers();
  registerIniEditorHandlers();
  registerUpdateHandlers();
};

app
  .whenReady()
  .then(() => {
    debug('App starting');
    debug('Registering IPC events');

    registerIpcHandlers();
    runStartupTasks(getMainWindow);

    debug('App started');
  })
  .catch((err) => {
    error(`An error occured while starting app: ${errToString(err)}`);
  });
