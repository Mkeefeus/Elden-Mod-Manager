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
      return 'undefined';
  }
};

const clickableMessage = (message: string) => {
  return (
    <div
      onClick={() => {
        navigator.clipboard.writeText(message);
        notifications.show({ message: 'Copied to clipboard', color: 'blue', autoClose: 1000 });
      }}
      style={{ cursor: 'pointer' }}
    >
      {message}
    </div>
  );
};

const showNotification = (log: LogEntry) => {
  const label = getLogLabel(log.level);
  notifications.show({
    color: getLogColor(log.level),
    title: label + ' (Click to copy)',
    message: clickableMessage(log.message),
  });
};

export const sendLog = (log: LogEntry) => {
  window.electronAPI.log(log);
};

window.electronAPI.notify(showNotification);
