import path from 'path';
import log from 'electron-log/main';
import { app } from 'electron';
import { getMainWindow } from '../main';
import { type LogEntry } from 'types';

// File transport — write debug+ to a rolling log file in the OS log directory
log.transports.file.level = 'debug';
log.transports.file.maxSize = 20 * 1024 * 1024; // 20 MB
log.transports.file.resolvePathFn = () => path.join(app.getPath('logs'), 'EMM.log');

// Console transport — info+ only
log.transports.console.level = 'info';

/**
 * Send a notification to the renderer window, mapping electron-log level names
 * back to the app convention ('warn' → 'warning'). Skips debug-level messages.
 */
const notifyGui = (level: string, message: string, hideDisplay?: boolean) => {
  if (hideDisplay || level === 'debug') return;
  const window = getMainWindow();
  if (window) {
    window.webContents.send('notify', { level, message });
  }
};

/** Main-process logger. Supports the custom 'warning' level used across the codebase. */
export const logger = {
  debug: (msg: string) => log.debug(msg),
  error: (msg: string) => {
    log.error(msg);
    notifyGui('error', msg);
  },
  info: (msg: string) => {
    log.info(msg);
    notifyGui('info', msg);
  },
  warning: (msg: string | Error) => {
    const message = msg instanceof Error ? msg.message : msg;
    log.warn(message);
    notifyGui('warning', message);
  },
};

/**
 * Called from mainEvents when the renderer sends a 'log' IPC message.
 * Writes to file and echoes a 'notify' event back so the renderer can show a toast.
 */
export const handleLog = (entry: LogEntry) => {
  const { level, message, hideDisplay } = entry;
  if (level === 'error') log.error(message);
  else if (level === 'warning' || level === 'warn') log.warn(message);
  else if (level === 'debug') log.debug(message);
  else log.info(message);
  notifyGui(level, message, hideDisplay);
};

