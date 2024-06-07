// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';
import { Mod, AddModFormValues, BrowseType } from 'types';
import { LogEntry } from 'winston';

interface IElectronAPI {
  // Renderer to main
  openExternalLink: (href: string) => void;
  loadMods: () => Promise<Mod[]>;
  saveMods: (mods: Mod[]) => Promise<boolean>;
  browse: (type: BrowseType, title?: string, startingDir?: string) => Promise<string | undefined>;
  addMod: (formData: AddModFormValues) => Promise<boolean>;
  deleteMod: (mod: Mod) => void;
  launchGame: (modded: boolean) => void;
  launchModExe: (mod: Mod) => void;
  log: (log: LogEntry) => void;
  extractZip: (zipPath: string) => Promise<string>;
  clearTemp: () => void;
  setME2Path: (path: string) => void;
  getME2Path: () => Promise<string>;
  getModsPath: () => Promise<string>;
  installME2: () => Promise<void>;
  checkModsFolderPrompt: () => Promise<boolean>;
  saveModsFolder: (path: string) => void;
  clearPromptedModsFolder: () => void;
  updateModsFolder: (path: string) => void;
  updateME2Path: (path: string) => void;
  // Main to renderer
  notify: (callback: (log: LogEntry) => void) => void;
  promptME2Install: (callback: () => void) => void;
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
  deleteMod: (...args) => ipcRenderer.send('delete-mod', ...args),
  launchModExe: (...args) => ipcRenderer.send('launch-mod-exe', ...args),
  log: (...args) => ipcRenderer.send('log', ...args),
  extractZip: (...args) => ipcRenderer.invoke('extract-zip', ...args),
  clearTemp: () => ipcRenderer.send('clear-temp'),
  setME2Path: (path) => ipcRenderer.send('set-me2-path', path),
  getME2Path: () => ipcRenderer.invoke('get-me2-path'),
  getModsPath: () => ipcRenderer.invoke('get-mods-path'),
  installME2: () => ipcRenderer.invoke('install-me2'),
  checkModsFolderPrompt: () => ipcRenderer.invoke('check-mods-folder-prompt'),
  saveModsFolder: (path) => ipcRenderer.send('save-mods-folder', path),
  clearPromptedModsFolder: () => ipcRenderer.send('clear-prompted-mods-folder'),
  updateModsFolder: (path) => ipcRenderer.send('update-mods-folder', path),
  updateME2Path: (path) => ipcRenderer.send('update-me2-path', path),
  // Main to renderer
  notify: (callback) => ipcRenderer.on('notify', (_event, value) => callback(value)),
  promptME2Install: (callback) => ipcRenderer.on('prompt-me2-install', callback),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
