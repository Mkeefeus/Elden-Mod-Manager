import { execSync, spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/mainLogger';
import { getModEnginePath, getProfilesFolder, setModEnginePath } from './db/api';
import { errToString } from '../utils/utilities';
import { getMainWindow } from '../main';
import { ME3_PROFILE_FILENAME, ME3_DEFAULT_WIN_PATH, ME3_DEFAULT_LINUX_PATH } from './constants';

const { debug, error } = logger;

/**
 * Attempt to find the me3 executable from the system PATH or a known install location.
 * Returns the absolute path to the me3 binary, or null if not found.
 */
export const detectME3 = (): string | null => {
  const isLinux = process.platform === 'linux';

  // Try system PATH first
  try {
    const cmd = isLinux ? 'which me3' : 'where me3.exe';
    const result = execSync(cmd, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    if (result) {
      const firstLine = result.split('\n')[0].trim();
      if (existsSync(firstLine)) {
        debug(`ME3 found in PATH: ${firstLine}`);
        return firstLine;
      }
    }
  } catch {
    // not in PATH, continue
  }

  // Try known install location for this platform
  const defaultPath = isLinux ? ME3_DEFAULT_LINUX_PATH : ME3_DEFAULT_WIN_PATH;
  if (existsSync(defaultPath)) {
    debug(`ME3 found at default location: ${defaultPath}`);
    return defaultPath;
  }

  debug('ME3 not found');
  return null;
};

/**
 * Returns the path to the me3 executable.
 * Prefers the user-configured path; falls back to auto-detection.
 * Throws if ME3 cannot be found.
 */
export const getME3Executable = (): string => {
  const storedPath = getModEnginePath();
  if (storedPath && existsSync(storedPath)) {
    debug(`Using stored ME3 path: ${storedPath}`);
    return storedPath;
  }

  debug('No valid stored ME3 path, attempting auto-detection');

  const detected = detectME3();
  if (detected) {
    debug(`Auto-detected ME3 at ${detected}, persisting to store`);
    setModEnginePath(detected);
    return detected;
  }

  throw new Error(
    'ME3 executable not found. Please install ME3 or set the path manually in Settings.'
  );
};

export const launchEldenRingModded = () => {
  debug('Launching game with mods via ME3');
  try {
    const me3Exe = getME3Executable();
    const profilePath = join(getProfilesFolder(), ME3_PROFILE_FILENAME);
    debug(`Running: ${me3Exe} launch -p "${profilePath}"`);
    const proc = spawn(me3Exe, ['launch', '-p', profilePath], {
      detached: true,
      stdio: 'ignore',
    });
    proc.unref();
  } catch (err) {
    const msg = `An error occured while launching game with mods: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};

export const promptME3Install = () => {
  debug('Prompting user to install ME3');
  try {
    const window = getMainWindow();
    if (!window) {
      throw new Error('Main window not found');
    }
    window.webContents.send('prompt-me3-install');
  } catch (err) {
    const msg = `An error occured while prompting user to install ME3: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};

export const updateME3Path = (newPath: string) => {
  debug(`Updating ME3 path to: ${newPath}`);
  try {
    if (!existsSync(newPath)) {
      throw new Error(`ME3 executable not found at: ${newPath}`);
    }
    setModEnginePath(newPath);
    debug(`ME3 path updated to: ${newPath}`);
  } catch (err) {
    const msg = `An error occured while updating ME3 path: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};

/**
 * Returns the platform-appropriate default ME3 path if it exists, or null.
 */
export const findDefaultME3Path = (): string | null => {
  const defaultPath = process.platform === 'linux' ? ME3_DEFAULT_LINUX_PATH : ME3_DEFAULT_WIN_PATH;
  return existsSync(defaultPath) ? defaultPath : null;
};
