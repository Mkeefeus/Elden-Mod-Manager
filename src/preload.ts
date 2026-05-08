// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';
import {
  Mod,
  AddModFormValues,
  BrowseType,
  ModProfile,
  LogEntry,
  LatestRelease,
  NexusUser,
  DownloadState,
  ExportedSettings,
} from 'types';

interface IElectronAPI {
  // --- Mods ---
  loadMods: () => Promise<Mod[]>;
  saveMods: (mods: Mod[]) => Promise<boolean>;
  addMod: (formData: AddModFormValues) => Promise<boolean>;
  deleteMod: (mod: Mod) => Promise<void>;
  launchModExe: (mod: Mod) => void;
  openModFolder: (mod: Mod) => void;
  listIniFiles: (modName: string) => Promise<string[]>;
  readIniFile: (modName: string, filename: string) => Promise<string>;
  writeIniFile: (modName: string, filename: string, content: string) => Promise<void>;

  // --- Profiles ---
  loadProfiles: () => Promise<ModProfile[]>;
  getActiveProfile: () => Promise<ModProfile>;
  getActiveProfileId: () => Promise<string>;
  createProfile: (name: string) => Promise<ModProfile>;
  applyProfile: (uuid: string) => Promise<void>;
  deleteProfile: (uuid: string) => void;
  renameProfile: (uuid: string, name: string) => void;
  updateProfile: (uuid: string) => Promise<void>;
  updateActiveProfileSettings: (fields: {
    savefile?: string;
    startOnline?: boolean;
    disableArxan?: boolean;
    noMemPatch?: boolean;
  }) => void;

  // --- Settings ---
  getME3Path: () => Promise<string>;
  updateME3Path: (path: string) => void;
  detectME3: () => Promise<string | null>;
  getModsPath: () => Promise<string>;
  updateModsFolder: (path: string) => void;
  getLauncherSettings: () => Promise<{ noBootBoost: boolean; showLogos: boolean; skipSteamInit: boolean }>;
  updateLauncherSettings: (fields: { noBootBoost?: boolean; showLogos?: boolean; skipSteamInit?: boolean }) => void;

  // --- Nexus Mods ---
  getNexusApiKey: () => Promise<string>;
  validateNexusApiKey: () => Promise<NexusUser | null>;
  setNexusApiKey: (key: string) => Promise<NexusUser>;

  // --- Get Mods Window ---
  openGetModsWindow: () => void;

  // --- Download Manager ---
  getDownloads: () => Promise<DownloadState[]>;
  cancelDownload: (id: string) => void;
  dismissDownload: (id: string) => void;
  addLocalDownload: (id: string, filename: string, extractedPath: string) => Promise<DownloadState>;
  onDownloadStarted: (callback: (state: DownloadState) => void) => void;
  onDownloadProgress: (callback: (update: { id: string; progress: number; status?: string }) => void) => void;
  onDownloadComplete: (callback: (state: DownloadState) => void) => void;
  onDownloadError: (callback: (state: DownloadState) => void) => void;

  // --- Import / Export ---
  exportSettings: () => Promise<boolean>;
  importSettings: () => Promise<ExportedSettings | undefined>;

  // --- File System ---
  browse: (type: BrowseType, title?: string, startingDir?: string) => Promise<string | undefined>;
  extractArchive: (archivePath: string) => Promise<string>;
  scanDir: (dirPath: string, extension: string) => Promise<string | undefined>;
  checkModsFolderPrompt: () => Promise<boolean>;
  saveModsFolder: (path: string) => void;
  clearPromptedModsFolder: () => void;

  // --- App ---
  openExternalLink: (href: string) => void;
  launchGame: (modded: boolean) => void;
  getLatestVersion: () => Promise<LatestRelease | null>;
  log: (log: LogEntry) => void;
  setME3Path: (path: string) => void;

  // --- Main to renderer ---
  notify: (callback: (log: LogEntry) => void) => void;
  promptME3Install: (callback: () => void) => void;
  onModsChanged: (callback: () => void) => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}

const electronAPI: IElectronAPI = {
  // --- Mods ---
  loadMods: () => ipcRenderer.invoke('load-mods'),
  saveMods: (...args) => ipcRenderer.invoke('set-mods', ...args),
  addMod: (...args) => ipcRenderer.invoke('add-mod', ...args),
  deleteMod: (...args) => ipcRenderer.invoke('delete-mod', ...args),
  launchModExe: (...args) => ipcRenderer.send('launch-mod-exe', ...args),
  openModFolder: (mod) => ipcRenderer.send('open-mod-folder', mod),
  listIniFiles: (modName) => ipcRenderer.invoke('list-ini-files', modName),
  readIniFile: (modName, filename) => ipcRenderer.invoke('read-ini-file', modName, filename),
  writeIniFile: (modName, filename, content) => ipcRenderer.invoke('write-ini-file', modName, filename, content),

  // --- Profiles ---
  loadProfiles: () => ipcRenderer.invoke('load-profiles'),
  getActiveProfile: () => ipcRenderer.invoke('get-active-profile'),
  getActiveProfileId: () => ipcRenderer.invoke('get-active-profile-id'),
  createProfile: (name) => ipcRenderer.invoke('create-profile', name),
  applyProfile: (uuid) => ipcRenderer.invoke('apply-profile', uuid),
  deleteProfile: (uuid) => ipcRenderer.send('delete-profile', uuid),
  renameProfile: (uuid, name) => ipcRenderer.send('rename-profile', uuid, name),
  updateProfile: (uuid) => ipcRenderer.invoke('update-profile', uuid),
  updateActiveProfileSettings: (fields) => ipcRenderer.send('update-active-profile-settings', fields),

  // --- Settings ---
  getME3Path: () => ipcRenderer.invoke('get-me3-path'),
  updateME3Path: (path) => ipcRenderer.send('update-me3-path', path),
  detectME3: () => ipcRenderer.invoke('detect-me3'),
  getModsPath: () => ipcRenderer.invoke('get-mods-path'),
  updateModsFolder: (path) => ipcRenderer.send('update-mods-folder', path),
  getLauncherSettings: () => ipcRenderer.invoke('get-launcher-settings'),
  updateLauncherSettings: (fields) => ipcRenderer.send('update-launcher-settings', fields),

  // --- Nexus Mods ---
  getNexusApiKey: () => ipcRenderer.invoke('get-nexus-api-key'),
  validateNexusApiKey: () => ipcRenderer.invoke('validate-nexus-api-key'),
  setNexusApiKey: (key) => ipcRenderer.invoke('set-nexus-api-key', key),

  // --- Get Mods Window ---
  openGetModsWindow: () => ipcRenderer.send('open-get-mods-window'),

  // --- Download Manager ---
  getDownloads: () => ipcRenderer.invoke('get-downloads'),
  cancelDownload: (id) => ipcRenderer.send('cancel-download', id),
  dismissDownload: (id) => ipcRenderer.send('dismiss-download', id),
  addLocalDownload: (id, filename, extractedPath) =>
    ipcRenderer.invoke('add-local-download', id, filename, extractedPath),
  onDownloadStarted: (callback) =>
    ipcRenderer.on('download-started', (_event, state: DownloadState) => callback(state)),
  onDownloadProgress: (callback) =>
    ipcRenderer.on('download-progress', (_event, update: { id: string; progress: number; status?: string }) =>
      callback(update)
    ),
  onDownloadComplete: (callback) =>
    ipcRenderer.on('download-complete', (_event, state: DownloadState) => callback(state)),
  onDownloadError: (callback) => ipcRenderer.on('download-error', (_event, state: DownloadState) => callback(state)),

  // --- Import / Export ---
  exportSettings: () => ipcRenderer.invoke('export-settings'),
  importSettings: () => ipcRenderer.invoke('import-settings'),

  // --- File System ---
  browse: (...args) => ipcRenderer.invoke('browse', ...args),
  extractArchive: (...args) => ipcRenderer.invoke('extract-archive', ...args),
  scanDir: (...args) => ipcRenderer.invoke('scan-dir', ...args),
  checkModsFolderPrompt: () => ipcRenderer.invoke('check-mods-folder-prompt'),
  saveModsFolder: (path) => ipcRenderer.send('save-mods-folder', path),
  clearPromptedModsFolder: () => ipcRenderer.send('clear-prompted-mods-folder'),

  // --- App ---
  openExternalLink: (href) => ipcRenderer.send('open-external-link', href),
  launchGame: (...args) => ipcRenderer.send('launch-game', ...args),
  getLatestVersion: () => ipcRenderer.invoke('get-latest-version'),
  log: (...args) => ipcRenderer.send('log', ...args),
  setME3Path: (path) => ipcRenderer.send('set-me3-path', path),

  // --- Main to renderer ---
  notify: (callback) => ipcRenderer.on('notify', (_event, value) => callback(value as LogEntry)),
  promptME3Install: (callback) => ipcRenderer.on('prompt-me3-install', callback),
  onModsChanged: (callback) => ipcRenderer.on('mods-changed', callback),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
