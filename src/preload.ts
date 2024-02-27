// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';
import { Mod } from 'types';

export interface IElectronAPI {
  openExternalLink: (href: string) => void;
  loadMods: () => Promise<Mod[]>;
  saveMods: (mods: Mod[]) => Promise<[boolean, Error?]>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}

contextBridge.exposeInMainWorld('electronAPI', {
  openExternalLink: (href: string): void => {
    ipcRenderer.send('open-external-link', href);
  },
  loadMods: () => ipcRenderer.invoke('get-mods') as Promise<Mod[]>,
  saveMods: (mods: Mod[]): Promise<[boolean, Error?]> =>
    ipcRenderer.invoke('set-mods', mods) as Promise<[boolean, Error?]>,
});
