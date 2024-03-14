// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';
import { Mod, AddModFormValues } from 'types';

interface IElectronAPI {
  openExternalLink: (href: string) => void;
  loadMods: () => Promise<Mod[]>;
  saveMods: (mods: Mod[]) => Promise<boolean>;
  browseForMod: (fromZip: boolean) => Promise<string | undefined>;
  addMod: (formData: AddModFormValues) => Promise<boolean>;
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
  saveMods: (mods) => ipcRenderer.invoke('set-mods', mods),
  browseForMod: (fromZip) => ipcRenderer.invoke('browse-mod', fromZip),
  addMod: (formData) => ipcRenderer.invoke('add-mod', formData),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
