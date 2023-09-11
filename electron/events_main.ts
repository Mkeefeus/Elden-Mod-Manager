import { ipcMain, dialog } from 'electron';


async function handleGetFile () {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Executable Files', extensions: ['exe'] },
    ]
  })
  if (!canceled) {
    return filePaths[0]
  }
}

const CreateEvents = () => {
  ipcMain.on('test-event', (_, message) => {
    console.log(message);
  });
  
  ipcMain.handle('dialog:openFile', handleGetFile)
};

export default CreateEvents;
