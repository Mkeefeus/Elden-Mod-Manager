// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';
import { Mod, AddModFormValues } from 'types';

interface IElectronAPI {
  openExternalLink: (href: string) => void;
  loadMods: () => Promise<Mod[]>;
  saveMods: (mods: Mod[]) => Promise<boolean>;
  browseForMod: (fromZip: boolean) => Promise<string | undefined>;
  addMod: (formData: AddModFormValues, fromZip: boolean) => Promise<boolean>;
  browseForExe: () => Promise<string | undefined>;
  launchGame: (modded: boolean) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}

const electronAPI: IElectronAPI = {
  openExternalLink: (href) => {
    ipcRenderer.send('open-external-link', href);
  },
  loadMods: () => ipcRenderer.invoke('load-mods'),
  saveMods: (...args) => ipcRenderer.invoke('set-mods', ...args),
  browseForMod: (...args) => ipcRenderer.invoke('browse-mod', ...args),
  addMod: (...args) => ipcRenderer.invoke('add-mod', ...args),
  browseForExe: () => ipcRenderer.invoke('browse-exe'),
  launchGame: (...args) => ipcRenderer.invoke('launch-game', ...args),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
