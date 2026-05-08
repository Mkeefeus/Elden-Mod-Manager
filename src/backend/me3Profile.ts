import { Mod } from 'types';
import { CreateModPathFromName, errToString } from '../utils/utilities';
import store from './db/init';
import { logger } from '../utils/mainLogger';
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { getProfilesFolder, getActiveProfile, getModsFolder, loadMods } from './db/api';
import { app } from 'electron';
import { ME3_PROFILE_FILENAME } from './constants';

const { debug, error } = logger;

let unsubMods: (() => void) | null = null;
let unsubProfiles: (() => void) | null = null;

const generateMe3ProfileString = (mods: Mod[], savefile: string, startOnline: boolean): string => {
  const nativeMods = mods.filter((m) => !!m.dllFile);
  const packageMods = mods.filter((m) => !m.dllFile);
  debug(
    `Generating ME3 profile: ${nativeMods.length} native mod(s), ${packageMods.length} package mod(s), savefile="${savefile}", startOnline=${startOnline}`
  );

  const sortLoadOrder = (list: Mod[]) => {
    const first = list.filter((m) => m.loadFirst);
    const last = list.filter((m) => m.loadLast);
    const middle = list.filter((m) => !m.loadFirst && !m.loadLast);
    return [...first, ...middle, ...last];
  };

  const natives = sortLoadOrder(nativeMods).map((mod) => {
    const modPath = path.join(getModsFolder(), CreateModPathFromName(mod.name, mod.version), mod.dllFile!);
    const entry: Record<string, unknown> = {
      path: modPath,
    };
    if (mod.loadEarly) entry.load_early = true;
    if (mod.optional !== undefined) entry.optional = mod.optional;
    if (mod.finalizer) entry.finalizer = mod.finalizer;
    if (mod.initializer) entry.initializer = mod.initializer;
    if (mod.loadBefore && mod.loadBefore.length > 0) entry.load_before = mod.loadBefore;
    if (mod.loadAfter && mod.loadAfter.length > 0) entry.load_after = mod.loadAfter;
    return entry;
  });

  const packages = sortLoadOrder(packageMods).map((mod) => {
    const modPath = path.join(getModsFolder(), CreateModPathFromName(mod.name, mod.version));
    const entry: Record<string, unknown> = {
      id: mod.uuid,
      path: `${modPath}/`,
    };
    if (mod.loadBefore && mod.loadBefore.length > 0) entry.load_before = mod.loadBefore;
    if (mod.loadAfter && mod.loadAfter.length > 0) entry.load_after = mod.loadAfter;
    return entry;
  });

  const profile: Record<string, unknown> = {
    profileVersion: 'v1',
    start_online: startOnline,
    supports: [{ game: 'eldenring' }],
  };
  if (savefile) profile.savefile = savefile;
  if (natives.length > 0) profile.natives = natives;
  if (packages.length > 0) profile.packages = packages;

  debug('ME3 profile string generated');
  return JSON.stringify(profile, null, 2);
};

export const writeMe3Profile = () => {
  try {
    const activeProfile = getActiveProfile();
    if (!activeProfile) {
      const msg = 'No active profile found, cannot write ME3 profile';
      error(msg);
      throw new Error(msg);
    }
    const sf = activeProfile.savefile ?? '';
    const so = activeProfile.startOnline ?? false;
    const enabledMods = loadMods().filter((mod) => activeProfile.mods.some((m) => m === mod.uuid));
    const profileString = generateMe3ProfileString(enabledMods, sf, so);
    const profilePath = path.join(getProfilesFolder(), ME3_PROFILE_FILENAME);
    debug(`Writing ME3 profile to: ${profilePath}`);
    mkdirSync(getProfilesFolder(), { recursive: true });
    writeFileSync(profilePath, profileString);
    debug('ME3 profile written');
  } catch (err) {
    const msg = `An error occured while writing ME3 profile: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};

export const initMe3ProfileWatchers = () => {
  if (unsubMods || unsubProfiles) return;

  debug('Initializing ME3 profile watchers');

  unsubMods = store.onDidChange('mods', () => {
    debug('Mods changed, regenerating ME3 profile');
    writeMe3Profile();
  });

  unsubProfiles = store.onDidChange('profiles', () => {
    debug('Profiles changed, regenerating ME3 profile');
    writeMe3Profile();
  });
};

app.on('before-quit', () => {
  if (!unsubMods && !unsubProfiles) return;

  debug('App quitting, unsubscribing ME3 profile watchers');
  unsubMods?.();
  unsubProfiles?.();
  unsubMods = null;
  unsubProfiles = null;
});
