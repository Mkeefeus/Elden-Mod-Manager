import { createLogger, format, transports, LogEntry } from 'winston';
import Transport, { TransportStreamOptions } from 'winston-transport';
import { getMainWindow } from '../main';
import { LogObject } from 'types';

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
    // printf((info) => `[${info.timestamp}] ${info.label}: ${info.message}`)
    printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'EMM.log' }),
    new GuiTransport({
      level: 'info',
    }),
  ],
  level: 'debug',
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
  },
});

export const handleLog = (log: LogObject) => {
  logger.log(log);
};
