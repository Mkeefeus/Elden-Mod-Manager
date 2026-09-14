import { existsSync, readFileSync, writeFileSync } from 'fs';
import { ExportedSettings } from 'types';
import {
  getModsFolder,
  getToolsDirectory,
  getEldenRingFolder,
  setModsFolder,
  setToolsDirectory,
  setEldenRingFolder,
} from './db/api';
import { logger } from '@utils/mainLogger';
import { errToString } from '@utils/utilities';

const { debug, error, warning } = logger;

export const exportSettings = (destPath: string): void => {
  debug(`Exporting settings to: ${destPath}`);
  try {
    const settings: ExportedSettings = {
      version: 1,
      modFolderPath: getModsFolder(),
      toolFolderPath: getToolsDirectory(),
      eldenRingFolder: getEldenRingFolder(),
    };
    writeFileSync(destPath, JSON.stringify(settings, null, 2), 'utf-8');
    debug('Settings exported successfully');
  } catch (err) {
    const msg = `An error occured while exporting settings: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};

const isValidExportedSettings = (obj: unknown): obj is ExportedSettings => {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    o['version'] === 1 &&
    typeof o['modFolderPath'] === 'string' &&
    (o['toolFolderPath'] === undefined || typeof o['toolFolderPath'] === 'string') &&
    typeof o['eldenRingFolder'] === 'string'
  );
};

export const importSettings = (srcPath: string): ExportedSettings => {
  debug(`Importing settings from: ${srcPath}`);
  try {
    const raw = readFileSync(srcPath, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (!isValidExportedSettings(parsed)) {
      throw new Error('File is not a valid settings export');
    }

    if (parsed.modFolderPath && existsSync(parsed.modFolderPath)) {
      setModsFolder(parsed.modFolderPath);
    } else if (parsed.modFolderPath) {
      warning(`Imported mods folder does not exist on this machine, skipping: ${parsed.modFolderPath}`);
    }

    if (parsed.toolFolderPath && existsSync(parsed.toolFolderPath)) {
      setToolsDirectory(parsed.toolFolderPath);
    } else if (parsed.toolFolderPath) {
      warning(`Imported tools folder does not exist on this machine, skipping: ${parsed.toolFolderPath}`);
    }

    if (parsed.eldenRingFolder && existsSync(parsed.eldenRingFolder)) {
      setEldenRingFolder(parsed.eldenRingFolder);
    } else if (parsed.eldenRingFolder) {
      warning(`Imported Elden Ring folder does not exist on this machine, skipping: ${parsed.eldenRingFolder}`);
    }

    // Note: launcher settings (boot boost, intro logos, steam init, override exe) used to live here
    // but are now per-profile — see ModProfile / ProfileExport for exporting/importing those instead.
    debug('Settings imported successfully');
    return parsed;
  } catch (err) {
    const msg = `An error occured while importing settings: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};
