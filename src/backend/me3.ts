import { execSync, spawn } from 'child_process';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { app } from 'electron';
import { logger } from '@utils/mainLogger';
import { getModEnginePath, getProfilesFolder, setModEnginePath, getActiveProfile, getLauncherSettings } from './db/api';
import { errToString } from '@utils/utilities';
import { ME3_PROFILE_FILENAME, ME3_DEFAULT_WIN_PATH, ME3_DEFAULT_LINUX_PATH } from './constants';
import { writeMe3Profile } from './me3Profile';

const { debug, error } = logger;

const getBundledME3Executable = (): string | null => {
  const platform = process.platform;
  if (platform !== 'linux' && platform !== 'win32') {
    return null;
  }

  const platformDir = platform === 'win32' ? 'me3-windows-amd64' : 'me3-linux-amd64';
  const binaryName = platform === 'win32' ? 'me3.exe' : 'me3';

  // In packaged builds, extra resources are copied under process.resourcesPath.
  const packagedCandidate = join(process.resourcesPath, 'me3', platformDir, 'bin', binaryName);
  if (existsSync(packagedCandidate)) {
    debug(`ME3 found in packaged resources: ${packagedCandidate}`);
    return packagedCandidate;
  }

  // In development, allow testing with project-local staged resources.
  const devCandidates = [
    join(app.getAppPath(), 'resources', 'me3', platformDir, 'bin', binaryName),
    join(process.cwd(), 'resources', 'me3', platformDir, 'bin', binaryName),
  ];

  for (const candidate of devCandidates) {
    if (existsSync(candidate)) {
      debug(`ME3 found in dev resources: ${candidate}`);
      return candidate;
    }
  }

  return null;
};

/**
 * Attempt to find the me3 executable from the system PATH or a known install location.
 * Returns the absolute path to the me3 binary, or null if not found.
 */
export const detectME3 = (): string | null => {
  const isLinux = process.platform === 'linux';

  const bundled = getBundledME3Executable();
  if (bundled) {
    return bundled;
  }

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
  // const storedPath = getModEnginePath();
  // if (storedPath && existsSync(storedPath)) {
  //   debug(`Using stored ME3 path: ${storedPath}`);
  //   return storedPath;
  // }

  // debug('No valid stored ME3 path, attempting auto-detection');

  const detected = detectME3();
  if (detected) {
    debug(`Auto-detected ME3 at ${detected}, persisting to store`);
    setModEnginePath(detected);
    return detected;
  }

  throw new Error('ME3 executable not found. Please install ME3 or set the path manually in Settings.');
};

export const launchEldenRingModded = () => {
  debug('Launching game with mods via ME3');
  try {
    const me3Exe = getME3Executable();
    const me3ExeDir = dirname(me3Exe);
    const me3VerbName = process.platform === 'win32' ? 'me3_verb.exe' : 'me3_verb';
    const me3VerbPath = join(me3ExeDir, me3VerbName);
    const launchCommand = process.platform === 'linux' && existsSync(me3VerbPath) ? me3VerbPath : me3Exe;

    if (process.platform === 'linux') {
      process.env['ME3_PROTON_LAUNCH_VERB'] = 'run';
    }

    writeMe3Profile();
    const profilePath = join(getProfilesFolder(), ME3_PROFILE_FILENAME);
    const args = ['launch', '-p', profilePath];
    const activeProfile = getActiveProfile();
    if (activeProfile?.disableArxan) args.push('--disable-arxan');
    if (activeProfile?.noMemPatch) args.push('--no-mem-patch');
    const launcherSettings = getLauncherSettings();
    if (launcherSettings.noBootBoost) args.push('--no-boot-boost');
    if (launcherSettings.showLogos) args.push('--show-logos');
    if (launcherSettings.skipSteamInit) args.push('--skip-steam-init');
    debug(`Running: ${launchCommand} ${args.join(' ')}`);
    const proc = spawn(launchCommand, args, {
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
