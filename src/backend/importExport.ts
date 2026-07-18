import { existsSync, readFileSync, writeFileSync } from 'fs';
import { ExportedSettings } from 'types';
import {
  getModsFolder,
  getEldenRingFolder,
  getLauncherSettings,
  setModsFolder,
  setEldenRingFolder,
  setLauncherSettings,
} from './db/api';
import { logger } from '@utils/mainLogger';
import { errToString } from '@utils/utilities';

const { debug, error, warning } = logger;

export const exportSettings = (destPath: string): void => {
  debug(`Exporting settings to: ${destPath}`);
  try {
    const launcher = getLauncherSettings();
    const settings: ExportedSettings = {
      version: 1,
      modFolderPath: getModsFolder(),
      eldenRingFolder: getEldenRingFolder(),
      noBootBoost: launcher.noBootBoost,
      showLogos: launcher.showLogos,
      skipSteamInit: launcher.skipSteamInit,
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
    typeof o['eldenRingFolder'] === 'string' &&
    typeof o['noBootBoost'] === 'boolean' &&
    typeof o['showLogos'] === 'boolean' &&
    typeof o['skipSteamInit'] === 'boolean'
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

    if (parsed.eldenRingFolder && existsSync(parsed.eldenRingFolder)) {
      setEldenRingFolder(parsed.eldenRingFolder);
    } else if (parsed.eldenRingFolder) {
      warning(`Imported Elden Ring folder does not exist on this machine, skipping: ${parsed.eldenRingFolder}`);
    }

    setLauncherSettings({
      noBootBoost: parsed.noBootBoost,
      showLogos: parsed.showLogos,
      skipSteamInit: parsed.skipSteamInit,
    });
    debug('Settings imported successfully');
    return parsed;
  } catch (err) {
    const msg = `An error occured while importing settings: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};
