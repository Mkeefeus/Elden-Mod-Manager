import { contextBridge, ipcRenderer } from 'electron';

declare global {
  interface Window {
    electronAPI: {
      testEvent: (message: string) => void;
      getFile: () => Promise<string | undefined>;
    };
  }
}

const CreateEvents = () => {
  contextBridge.exposeInMainWorld('electronAPI', {
    testEvent: (message: string) => ipcRenderer.send('test-event', message),
    getFile: () => ipcRenderer.invoke('dialog:openFile'),
  });
};

export default CreateEvents;
