import { notifications } from '@mantine/notifications';
import { LogEntry } from 'winston';

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

const getLogLabel = (level: string) => {
  switch (level) {
    case 'error':
      return 'Error';
    case 'warning':
      return 'Warning';
    case 'info':
      return 'Info';
    default:
      return undefined;
  }
};

const showNotification = (log: LogEntry) => {
  console.log(log);
  notifications.show({
    color: getLogColor(log.level),
    title: getLogLabel(log.level),
    message: log.message,
  });
};

export const sendLog = (log: LogEntry) => {
  window.electronAPI.log(log);
};

export const startRendererLogger = () => {
  window.electronAPI.notify(showNotification);
};
