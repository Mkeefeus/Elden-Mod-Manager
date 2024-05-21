import { execSync } from 'child_process';
import { MenuItemConstructorOptions, shell, app } from 'electron';
import { readFileSync } from 'fs';
import * as VDF from 'vdf-parser';
import { logger } from './utils/mainLogger';
import { errToString } from './utils/utilities';

const { debug, error } = logger;

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

const INSTALL_DIR = process.cwd();

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

function getSteamInstallDir() {
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
}

function getLibrayPath(appID: string, steamDir: string) {
  debug('Getting library path');
  const libraryFoldersPath = `${steamDir}/steamapps/libraryfolders.vdf`;
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
}

function getSteamGameInstallDir(appId: string): string | null {
  const steamDir = getSteamInstallDir();
  if (!steamDir) {
    return null;
  }
  // find libary containing appID in steamapps/libraryfolders.vdf
  const libraryFoldersPath = getLibrayPath(appId, steamDir);

  debug(`Searching for appmanifest_${appId}.acf file in ${libraryFoldersPath}/steamapps/`);
  const appManifestPath = `${libraryFoldersPath}/steamapps/appmanifest_${appId}.acf`;

  try {
    const appManifestData = readFileSync(appManifestPath, 'utf8');
    const lines = appManifestData.split('\n');

    for (const line of lines) {
      const match = line.match(/^\s*"installdir"\s*"(.+)"$/);
      if (match && match[1]) {
        debug(`Game install directory: ${steamDir}\\steamapps\\common\\${match[1]}\\Game`);
        return `${steamDir}\\steamapps\\common\\${match[1]}\\Game`;
      }
    }
  } catch (err) {
    const msg = `An error occured while trying to get the steam game install directory: ${errToString(err)}`;
    error(msg, { hideDisplay: true });
    throw new Error(msg);
  }
  return null;
}

const handleCollectLogs = () => {
  console.log('Collecting logs');
};

const handleChangeModDir = () => {
  console.log('Changing mod directory');
};

export const template: MenuItemConstructorOptions[] = [
  {
    label: 'File',
    submenu: [
      {
        role: 'quit',
      },
    ],
  },
  {
    label: 'View',
    submenu: [
      {
        role: 'reload',
      },
      {
        role: 'forceReload',
      },
      {
        role: 'toggleDevTools',
      },
    ],
  },
  {
    label: 'Go',
    submenu: [
      {
        label: 'Elden Ring Folder',
        click: () => {
          const path = getSteamGameInstallDir('1245620');
          if (path) {
            shell.openPath(path);
          }
        },
      },
      {
        label: 'Mods Folder',
        click: () => {
          shell.openPath(`${INSTALL_DIR}\\mods`);
        },
      },
      {
        label: 'Install Folder',
        click: () => {
          shell.openPath(`${INSTALL_DIR}`);
        },
      },
      {
        label: 'ModEngine2 Folder',
        click: () => {
          shell.openPath(`${INSTALL_DIR}\\ModEngine2`);
        },
      },
      {
        label: 'AppData Folder',
        click: () => {
          shell.openPath(`${app.getPath('appData')}\\elden-mod-manager`);
        },
      },
    ],
  },
  {
    label: 'Help',
    submenu: [
      {
        label: 'Bug Report',
        click: () => {
          shell.openExternal('https://github.com/Mkeefeus/Elden-Mod-Manager/issues');
        },
      },
      {
        label: 'Releases',
        click: () => {
          shell.openExternal('https://github.com/Mkeefeus/Elden-Mod-Manager/releases');
        },
      },
      {
        label: 'Collect Logs',
        click: handleCollectLogs,
      },
    ],
  },
  {
    label: 'Settings',
    submenu: [
      {
        label: 'Change mod directory',
        click: handleChangeModDir,
      },
    ],
  },
];
