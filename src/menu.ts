import { MenuItemConstructorOptions, shell, app } from 'electron';
import { getSteamGameInstallDir } from './backend/steam';

const INSTALL_DIR = process.cwd();

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
