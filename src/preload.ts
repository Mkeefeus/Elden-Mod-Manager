// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';

export interface IElectronAPI {
  openExternalLink: (href: string) => void,
}

declare global {
  interface Window {
    electronAPI: IElectronAPI
  }
}

contextBridge.exposeInMainWorld('electronAPI', {
  openExternalLink: (href: string): void => {
    ipcRenderer.send('open-external-link', href)
  }
})