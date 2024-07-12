import { MenuItemConstructorOptions, shell, app } from 'electron';
import { getEldenRingInstallDir } from './backend/steam';
import archiver from 'archiver';
import { createWriteStream, readdirSync, unlinkSync } from 'fs';
import { logger } from './utils/mainLogger';
import { errToString } from './utils/utilities';
import { getModEnginePath, getModsFolder } from './backend/db/api';
import createDesktopShortcut from 'create-desktop-shortcuts';
import path from 'path';

const { debug, warning, error } = logger;

const INSTALL_DIR = app.getPath('exe');
const VBSCRIPT_PATH = path.join(process.resourcesPath, 'windows.vbs');

const handleCollectLogs = () => {
  // if ./logs.zip exists, delete it
  const desktop = app.getPath('desktop');
  const logsZipPath = `${desktop}\\emm-logs.zip`;
  if (readdirSync(desktop).includes('emm-logs.zip')) {
    debug('Deleting old logs.zip');
    try {
      unlinkSync(logsZipPath);
    } catch (err) {
      const msg = `Error deleting old logs.zip: ${errToString(err)}`;
      error(msg);
      throw err;
    }
  }

  const logFolder = app.getPath('logs');
  debug('Collecting logs');
  // require modules

  // create a file to stream archive data to.
  const output = createWriteStream(logsZipPath);
  const archive = archiver('zip');

  // This event is fired when the data source is drained no matter what was the data source.
  // It is not part of this library but rather from the NodeJS Stream API.
  // @see: https://nodejs.org/api/stream.html#stream_event_end
  output.on('end', function () {
    debug('Data has been drained');
  });

  // good practice to catch warnings (ie stat failures and other non-blocking errors)
  archive.on('warning', function (err) {
    if (err.code === 'ENOENT') {
      // log warning
      warning(err);
    } else {
      throw err;
    }
  });

  // good practice to catch this error explicitly
  archive.on('error', function (err) {
    const msg = `An error occured while archiving logs: ${errToString(err)}`;
    error(msg);
    throw err;
  });

  // pipe archive data to the file
  archive.pipe(output);

  // append log folder
  debug('Appending log folder');
  try {
    archive.directory(logFolder, false);
  } catch (err) {
    const msg = `An error occured while appending log folder: ${errToString(err)}`;
    error(msg);
    throw err;
  }

  // grab toml file
  debug('Appending config_eldenring.toml');
  try {
    const tomlPath = `${getModEnginePath().split('\\').slice(0, -1).join('\\')}\\config_eldenring.toml`;
    archive.file(tomlPath, { name: 'config_eldenring.toml' });
  } catch (err) {
    const msg = `An error occured while appending config_eldenring.toml: ${errToString(err)}`;
    error(msg);
    throw err;
  }

  // grab config.json from appdata
  debug('Appending config.json');
  try {
    const appDataPath = `${app.getPath('appData')}\\elden-mod-manager\\config.json`;
    archive.file(appDataPath, { name: 'config.json' });
  } catch (err) {
    const msg = `An error occured while appending config.json: ${errToString(err)}`;
    error(msg);
    throw err;
  }

  // save eldenring file list
  try {
    const eldenRingPath = getEldenRingInstallDir();
    if (!eldenRingPath) {
      throw new Error('Could not find Elden Ring install directory');
    }
    const eldenRingFiles = readdirSync(eldenRingPath, { recursive: true });
    archive.append(eldenRingFiles.join('\n'), { name: 'eldenring_files.txt' });
  } catch (err) {
    const msg = `An error occured while appending eldenring_files.txt: ${errToString(err)}`;
    error(msg);
    throw err;
  }

  archive.finalize();
  debug('Logs collected');
};

export const createLaunchShortcut = () => {
  const me2Path = getModEnginePath();
  createDesktopShortcut({
    windows: {
      filePath: `${me2Path}ModEngine2_launcher.exe`,
      arguments: `-t er -c ${me2Path}config_eldenring.toml`,
      outputPath: `${app.getPath('desktop')}`,
      name: 'Launch Modded Elden Ring',
      comment: 'Launch Elden Ring with mods',
      icon: INSTALL_DIR,
      windowMode: 'minimized',
      VBScriptPath: VBSCRIPT_PATH,
    },
  });
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
          const path = getEldenRingInstallDir();
          if (path) {
            shell.openPath(path);
          }
        },
      },
      {
        label: 'Mods Folder',
        click: () => {
          shell.openPath(getModsFolder());
        },
      },
      {
        label: 'Install Folder',
        click: () => {
          shell.openPath(INSTALL_DIR);
        },
      },
      {
        label: 'ModEngine2 Folder',
        click: () => {
          shell.openPath(getModEnginePath());
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
    label: 'Tools',
    submenu: [
      {
        label: 'Add Elden Mod Manager desktop shortcut',
        click: () => {
          createDesktopShortcut({
            windows: {
              filePath: INSTALL_DIR,
              outputPath: app.getPath('desktop'),
              name: 'Elden Mod Manager',
              comment: 'Launch Elden Mod Manager',
              icon: INSTALL_DIR,
              windowMode: 'minimized',
              VBScriptPath: VBSCRIPT_PATH,
            },
          });
        },
      },
      {
        label: 'Add Launch Modded Elden Ring desktop shortcut',
        click: createLaunchShortcut,
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
];
