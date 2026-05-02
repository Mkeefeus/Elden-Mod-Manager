import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import os from 'os';
import { errToString } from '../utils/utilities';
import { logger } from '../utils/mainLogger';
import * as VDF from 'vdf-parser';
import { shell } from 'electron';
import { getEldenRingFolder, setEldenRingFolder } from './db/api';

const { debug, error } = logger;

interface LibraryFolders {
  libraryfolders: {
    [index: string]: {
      path: string;
      label: string;
      contentid: number;
      totalsize: number;
      update_clean_bytes_tally: number;
      time_last_update_corruption: number;
      apps: { [appId: string]: string };
    };
  };
}

/**
 * Returns the Steam install directory by checking well-known filesystem paths.
 * Works on both Windows and Linux — no PowerShell or registry reads needed.
 */
const getSteamInstallDir = (): string | null => {
  debug('Getting steam install dir');

  if (process.platform === 'win32') {
    // Steam doesn't add itself to PATH, but always writes its install location to the registry
    try {
      const result = execSync('reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Valve\\Steam" /v InstallPath', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      const match = result.match(/InstallPath\s+REG_SZ\s+(.+)/);
      if (match && match[1]) {
        const steamDir = match[1].trim();
        if (existsSync(join(steamDir, 'steamapps'))) {
          debug(`Steam install directory found via registry: ${steamDir}`);
          return steamDir;
        }
      }
    } catch {
      // registry key not found, fall through to candidate paths
    }
  } else {
    // On Linux, the steam launcher is in PATH
    try {
      const result = execSync('which steam', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
      if (result) {
        const steamDir = dirname(result);
        if (existsSync(join(steamDir, 'steamapps'))) {
          debug(`Steam install directory found via PATH: ${steamDir}`);
          return steamDir;
        }
      }
    } catch {
      // not in PATH, fall through to candidate paths
    }
  }

  // Fall back to well-known filesystem locations
  const candidates: string[] =
    process.platform === 'win32'
      ? [
          join(process.env['PROGRAMFILES(X86)'] ?? 'C:\\Program Files (x86)', 'Steam'),
          join(process.env['PROGRAMFILES'] ?? 'C:\\Program Files', 'Steam'),
        ]
      : [
          join(os.homedir(), '.local', 'share', 'Steam'),
          join(os.homedir(), '.steam', 'steam'),
          join(os.homedir(), '.steam', 'Steam'),
        ];

  for (const candidate of candidates) {
    if (existsSync(join(candidate, 'steamapps'))) {
      debug(`Steam install directory found: ${candidate}`);
      return candidate;
    }
  }

  debug('Steam install directory not found');
  return null;
};

const getLibrayPath = (appID: string, steamDir: string) => {
  debug('Getting library path');
  const libraryFoldersPath = join(steamDir, 'steamapps', 'libraryfolders.vdf');
  try {
    debug(`Reading libraryfolders.vdf file: ${libraryFoldersPath}`);
    const vdfContent = readFileSync(libraryFoldersPath, 'utf8');
    debug('Parsing libraryfolders.vdf file');
    const parsedVdf = VDF.parse<LibraryFolders>(vdfContent)['libraryfolders'];
    debug('Searching for library path');
    for (const key in parsedVdf) {
      if (parsedVdf[key].apps[appID]) {
        debug(`Library path: ${parsedVdf[key].path}`);
        return parsedVdf[key].path;
      }
    }
  } catch (err) {
    const msg = `An error occured while trying to get the library path: ${errToString(err)}`;
    error(msg, { hideDisplay: true });
    throw new Error(msg, { cause: err });
  }
};

export const getEldenRingInstallDir = (): string | null => {
  const cachedEldenRingFolder = getEldenRingFolder();
  if (existsSync(join(cachedEldenRingFolder, 'eldenring.exe'))) {
    debug(`Game install directory loaded from cache: ${cachedEldenRingFolder}`);
    return cachedEldenRingFolder;
  }
  const appId = '1245620';
  const steamDir = getSteamInstallDir();
  if (!steamDir) {
    return null;
  }
  const libraryFoldersPath = getLibrayPath(appId, steamDir);

  const appManifestPath = join(steamDir, libraryFoldersPath ?? '', 'steamapps', `appmanifest_${appId}.acf`);
  debug(`Searching for ${appManifestPath}`);

  try {
    const appManifestData = readFileSync(appManifestPath, 'utf8');
    const lines = appManifestData.split('\n');

    for (const line of lines) {
      const match = line.match(/^\s*"installdir"\s*"(.+)"$/);
      if (match && match[1]) {
        const folder = join(steamDir, 'steamapps', 'common', match[1], 'Game');
        debug(`Game install directory: ${folder}`);
        setEldenRingFolder(folder);
        return folder;
      }
    }
  } catch (err) {
    const msg = `An error occured while trying to get the steam game install directory: ${errToString(err)}`;
    error(msg, { hideDisplay: true });
    throw new Error(msg, { cause: err });
  }
  return null;
};

export const launchEldenRing = () => {
  debug('Launching game without mods');
  try {
    void shell.openExternal('steam://rungameid/1245620');
  } catch (err) {
    const msg = `An error occured while launching game without mods: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};
