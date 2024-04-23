import { notifications } from '@mantine/notifications';
import { LogObject } from 'types';

const getLogColor = (level: string) => {
  switch (level) {
    case 'error':
      return 'red';
    case 'warning':
      return 'yellow';
    case 'info':
      return 'blue';
    default:
      return 'grey';
  }
};

const showNotification = (log: LogObject) => {
  notifications.show({
    color: getLogColor(log.level),
    title: log.label,
    message: log.message,
  });
};

export const sendLog = (log: LogObject) => {
  window.electronAPI.log(log);
};

export const startRendererLogger = () => {
  window.electronAPI.notify(showNotification);
};
