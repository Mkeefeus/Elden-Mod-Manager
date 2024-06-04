import { showNotification } from './utils/rendererLogger';

window.electronAPI.notify(showNotification);

window.electronAPI.promptME2Install(() => {
  console.log('ME2 installed');
});
