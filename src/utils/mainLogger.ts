import { createLogger, format, transports, LogEntry } from 'winston';
import Transport, { TransportStreamOptions } from 'winston-transport';
import 'winston-daily-rotate-file';
import { getMainWindow } from '../main';

const { combine, timestamp, printf, align } = format;

class GuiTransport extends Transport {
  constructor(opts?: TransportStreamOptions) {
    super(opts);
  }
  log(info: LogEntry, callback: () => void) {
    const window = getMainWindow();
    if (!window) {
      callback();
      return;
    }
    // if (info.hideDisplay) return callback();
    window.webContents.send('notify', info);
    callback();
  }
}

export const logger = createLogger({
  format: combine(
    timestamp({
      format: 'YYYY-MM-DD hh:mm:ss.SSS A',
    }),
    align(),
    printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)
  ),
  transports: [
    new transports.Console(),
    new transports.DailyRotateFile({ 
      datePattern: 'YYYY-MM-DD',
      filename: 'EMM-%DATE%.log',
      dirname: 'logs',
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
