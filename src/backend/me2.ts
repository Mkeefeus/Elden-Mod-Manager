import { execSync } from 'child_process';
import { existsSync, readdirSync, renameSync, rmSync } from 'fs';
import { logger } from '../utils/mainLogger';
import { getModEnginePath, getModsFolder, setModEnginePath } from './db/api';
import { errToString } from '../utils/utilities';
import { getMainWindow } from '../main';
import { app } from 'electron';
import { INI_PATH } from './constants';

const { debug, warning, error } = logger;

export const launchEldenRingModded = () => {
  const modEnginePath = getModEnginePath();
  debug('Launching game with mods');
  try {
    debug(`Executing ${modEnginePath}\\launchmod_eldenring.bat`);
    execSync('launchmod_eldenring.bat', {
      cwd: modEnginePath,
      env: {
        ...process.env,
        MODS_PATH: `${getModsFolder()}dlls`,
        INI_PATH: INI_PATH,
        LOG_PATH: `${app.getPath('logs')}\\elden_mod_loader.txt`,
      },
    });
  } catch (err) {
    const msg = `An error occured while launching game with mods: ${errToString(err)}`;
    error(msg);
    throw new Error(msg);
  }
};

export const promptME2Install = async () => {
  debug('Prompting user to install Mod Engine');
  try {
    const window = getMainWindow();
    if (!window) {
      throw new Error('Main window not found');
    }
    window.webContents.send('prompt-me2-install');
  } catch (err) {
    const msg = `An error occured while prompting user to install Mod Engine: ${errToString(err)}`;
    error(msg);
    throw new Error(msg);
  }
};

export const updateME2Path = (newPath: string) => {
  debug(`Updating ME2 path to: ${newPath}`);
  try {
    const currentPath = getModEnginePath();
    if (currentPath === newPath) {
      debug('ME2 path unchanged');
      return;
    }
    if (readdirSync(newPath).length > 0) {
      warning('Destination path is not empty, please select an empty folder');
      return;
    }
    if (!existsSync(currentPath)) {
      throw new Error('Current ME2 path not found');
    }
    const contents = readdirSync(currentPath);
    debug(`Moving ME2 contents to: ${newPath}`);
    contents.forEach((file) => {
      debug(`Moving: ${file}`);
      renameSync(`${currentPath}/${file}`, `${newPath}/${file}`);
    });
    debug('Removing old ME2 path');
    rmSync(currentPath, { recursive: true });
    debug('Updating ME2 path in database');
    setModEnginePath(newPath);
    debug(`ME2 path updated to: ${newPath}`);
  } catch (err) {
    const msg = `An error occured while updating ME2 path: ${errToString(err)}`;
    error(msg);
    throw new Error(msg);
  }
};
