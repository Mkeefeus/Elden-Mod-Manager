import { createLogger, format, transports, LogEntry } from 'winston';
import Transport, { TransportStreamOptions } from 'winston-transport';
import 'winston-daily-rotate-file';
import { getMainWindow } from '../main';
import { app } from 'electron';

const { combine, timestamp, printf, align } = format;

class GuiTransport extends Transport {
  constructor(opts?: TransportStreamOptions) {
    super(opts);
  }
  log(info: LogEntry, callback: () => void) {
    callback();
    const window = getMainWindow();
    if (!window || info.hideDisplay) {
      return;
    }
    window.webContents.send('notify', info);
  }
}

export const logger = createLogger({
  format: combine(
    timestamp({
      format: 'YYYY-MM-DD HH:mm:ss.SSS',
    }),
    align(),
    printf((info) => `[${info.timestamp}] [${info.level}] ${info.message.trim()}`)
  ),
  transports: [
    new transports.Console({
      level: 'info',
    }),
    new transports.DailyRotateFile({
      datePattern: 'YYYY-MM-DD',
      filename: 'EMM-%DATE%.log',
      dirname: app.getPath('logs'),
      maxSize: '20m',
      maxFiles: '14d',
    }),
    new GuiTransport({
      level: 'info',
    }),
  ],
  level: 'debug',
  levels: {
    error: 0,
    warning: 1,
    info: 2,
    debug: 3,
  },
});

export const handleLog = (log: LogEntry) => {
  logger.log(log);
};
