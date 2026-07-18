import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { app } from 'electron';
import { logger } from '@utils/mainLogger';
import { getProfilesFolder, getActiveProfile, getLauncherSettings } from './db/api';
import { errToString } from '@utils/utilities';
import { ME3_PROFILE_FILENAME } from './constants';
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
 * Returns the path to the me3 executable.
 * Uses the bundled me3 executable.
 * Throws if ME3 cannot be found.
 */
export const getME3Executable = (): string => {
  const detected = getBundledME3Executable();
  if (detected) {
    debug(`Using bundled ME3 at ${detected}`);
    return detected;
  }

  throw new Error('Bundled ME3 executable not found in app resources.');
};

export const launchEldenRingModded = () => {
  debug('Launching game with mods via ME3');
  try {
    const me3Exe = getME3Executable();
    const me3ExeDir = dirname(me3Exe);
    const me3VerbName = process.platform === 'win32' ? 'me3_verb.exe' : 'me3_verb';
    const me3VerbPath = join(me3ExeDir, me3VerbName);
    const launchCommand = process.platform === 'linux' && existsSync(me3VerbPath) ? me3VerbPath : me3Exe;
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
    if (process.platform === 'linux' && activeProfile?.overrideProtonVerb) {
      process.env['ME3_PROTON_LAUNCH_VERB'] = 'run';
    }
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
