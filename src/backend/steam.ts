import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
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

const GET_STEAM_DIR = `
$regPaths = @('HKLM:\\SOFTWARE\\Valve\\Steam', 'HKLM:\\SOFTWARE\\Wow6432Node\\Valve\\Steam')

foreach ($regPath in $regPaths) {
    $steamPath = Get-ItemProperty -Path $regPath -Name InstallPath -ErrorAction SilentlyContinue
    if ($steamPath) {
        $InstallPath = $steamPath.InstallPath
        Write-Output $InstallPath
        return
    }
}
`;

const getSteamInstallDir = () => {
  debug('Getting steam install dir');
  try {
    let steamDir = execSync(GET_STEAM_DIR, { shell: 'powershell.exe' }).toString();
    steamDir = steamDir.replace(/\r?\n|\r/g, ''); // Remove line breaks
    debug(`Steam install directory: ${steamDir}`);
    return steamDir;
  } catch (err) {
    const msg = `An error occured while trying to get the steam install directory: ${errToString(err)}`;
    error(msg, { hideDisplay: true });
    throw new Error(msg);
  }
};

const getLibrayPath = (appID: string, steamDir: string) => {
  debug('Getting library path');
  const libraryFoldersPath = `${steamDir}\\steamapps\\libraryfolders.vdf`;
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
    throw new Error(msg);
  }
};

export const getEldenRingInstallDir = (): string | null => {
  const cachedEldenRingFolder = getEldenRingFolder();
  if (existsSync(`${cachedEldenRingFolder}\\eldenring.exe`)) {
    debug(`Game install directory loaded from cache: ${cachedEldenRingFolder}`);
    return cachedEldenRingFolder;
  }
  const appId = '1245620';
  const steamDir = getSteamInstallDir();
  if (!steamDir) {
    return null;
  }
  const libraryFoldersPath = getLibrayPath(appId, steamDir);

  debug(`Searching for appmanifest_${appId}.acf file in ${libraryFoldersPath}\\steamapps\\`);
  const appManifestPath = `${libraryFoldersPath}\\steamapps\\appmanifest_${appId}.acf`;

  try {
    const appManifestData = readFileSync(appManifestPath, 'utf8');
    const lines = appManifestData.split('\n');

    for (const line of lines) {
      const match = line.match(/^\s*"installdir"\s*"(.+)"$/);
      if (match && match[1]) {
        const folder = `${steamDir}\\steamapps\\common\\${match[1]}\\Game`;
        debug(`Game install directory: ${folder}`);
        setEldenRingFolder(folder);
        return folder;
      }
    }
  } catch (err) {
    const msg = `An error occured while trying to get the steam game install directory: ${errToString(err)}`;
    error(msg, { hideDisplay: true });
    throw new Error(msg);
  }
  return null;
};

export const launchEldenRing = () => {
  debug('Launching game without mods');
  try {
    shell.openExternal('steam://rungameid/1245620');
  } catch (err) {
    const msg = `An error occured while launching game without mods: ${errToString(err)}`;
    error(msg);
    throw new Error(msg);
  }
};
