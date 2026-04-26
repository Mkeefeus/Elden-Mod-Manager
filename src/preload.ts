// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';
import { Mod, AddModFormValues, BrowseType, ModProfile, LogEntry, LatestRelease } from 'types';

interface IElectronAPI {
  // Renderer to main
  openExternalLink: (href: string) => void;
  loadMods: () => Promise<Mod[]>;
  saveMods: (mods: Mod[]) => Promise<boolean>;
  browse: (type: BrowseType, title?: string, startingDir?: string) => Promise<string | undefined>;
  addMod: (formData: AddModFormValues) => Promise<boolean>;
  deleteMod: (mod: Mod) => Promise<void>;
  launchGame: (modded: boolean) => void;
  launchModExe: (mod: Mod) => void;
  log: (log: LogEntry) => void;
  extractZip: (zipPath: string) => Promise<string>;
  setME3Path: (path: string) => void;
  getME3Path: () => Promise<string>;
  getModsPath: () => Promise<string>;
  detectME3: () => Promise<string | null>;
  checkModsFolderPrompt: () => Promise<boolean>;
  saveModsFolder: (path: string) => void;
  clearPromptedModsFolder: () => void;
  updateModsFolder: (path: string) => void;
  updateME3Path: (path: string) => void;
  getSavefile: () => Promise<string>;
  setSavefile: (value: string) => void;
  getStartOnline: () => Promise<boolean>;
  setStartOnline: (value: boolean) => void;
  // Profiles
  loadProfiles: () => Promise<ModProfile[]>;
  getActiveProfileId: () => Promise<string>;
  createProfile: (name: string) => Promise<ModProfile>;
  applyProfile: (uuid: string) => Promise<void>;
  deleteProfile: (uuid: string) => void;
  renameProfile: (uuid: string, name: string) => void;
  updateProfile: (uuid: string) => Promise<void>;
  getLatestVersion: () => Promise<LatestRelease | null>;
  // Main to renderer
  notify: (callback: (log: LogEntry) => void) => void;
  promptME3Install: (callback: () => void) => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}

const electronAPI: IElectronAPI = {
  // Renderer to main
  openExternalLink: (href) => {
    ipcRenderer.send('open-external-link', href);
  },
  loadMods: () => ipcRenderer.invoke('load-mods'),
  saveMods: (...args) => ipcRenderer.invoke('set-mods', ...args),
  addMod: (...args) => ipcRenderer.invoke('add-mod', ...args),
  browse: (...args) => ipcRenderer.invoke('browse', ...args),
  launchGame: (...args) => ipcRenderer.send('launch-game', ...args),
  deleteMod: (...args) => ipcRenderer.invoke('delete-mod', ...args),
  launchModExe: (...args) => ipcRenderer.send('launch-mod-exe', ...args),
  log: (...args) => ipcRenderer.send('log', ...args),
  extractZip: (...args) => ipcRenderer.invoke('extract-zip', ...args),
  setME3Path: (path) => ipcRenderer.send('set-me3-path', path),
  getME3Path: () => ipcRenderer.invoke('get-me3-path'),
  getModsPath: () => ipcRenderer.invoke('get-mods-path'),
  detectME3: () => ipcRenderer.invoke('detect-me3'),
  checkModsFolderPrompt: () => ipcRenderer.invoke('check-mods-folder-prompt'),
  saveModsFolder: (path) => ipcRenderer.send('save-mods-folder', path),
  clearPromptedModsFolder: () => ipcRenderer.send('clear-prompted-mods-folder'),
  updateModsFolder: (path) => ipcRenderer.send('update-mods-folder', path),
  updateME3Path: (path) => ipcRenderer.send('update-me3-path', path),
  getSavefile: () => ipcRenderer.invoke('get-savefile'),
  setSavefile: (value) => ipcRenderer.send('set-savefile', value),
  getStartOnline: () => ipcRenderer.invoke('get-start-online'),
  setStartOnline: (value) => ipcRenderer.send('set-start-online', value),
  // Profiles
  loadProfiles: () => ipcRenderer.invoke('load-profiles'),
  getActiveProfileId: () => ipcRenderer.invoke('get-active-profile-id'),
  createProfile: (name) => ipcRenderer.invoke('create-profile', name),
  applyProfile: (uuid) => ipcRenderer.invoke('apply-profile', uuid),
  deleteProfile: (uuid) => ipcRenderer.send('delete-profile', uuid),
  renameProfile: (uuid, name) => ipcRenderer.send('rename-profile', uuid, name),
  updateProfile: (uuid) => ipcRenderer.invoke('update-profile', uuid),
  getLatestVersion: () => ipcRenderer.invoke('get-latest-version'),
  // Main to renderer
  notify: (callback) => ipcRenderer.on('notify', (_event, value) => callback(value as LogEntry)),
  promptME3Install: (callback) => ipcRenderer.on('prompt-me3-install', callback),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
