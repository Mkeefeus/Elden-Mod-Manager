import { Mod } from 'types';
import { CreateModPathFromName, errToString } from '../utils/utilities';
import store from './db/init';
import { logger } from '../utils/mainLogger';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getProfilesFolder, getActiveProfile } from './db/api';
import { app } from 'electron';
import { ME3_PROFILE_FILENAME } from './constants';

const { debug, error } = logger;

const generateMe3ProfileString = (mods: Mod[], savefile: string, startOnline: boolean): string => {
  const nativeMods = mods.filter((m) => !!m.dllFile);
  const packageMods = mods.filter((m) => !m.dllFile);

  const sortLoadOrder = (list: Mod[]) => {
    const first = list.filter((m) => m.loadFirst);
    const last = list.filter((m) => m.loadLast);
    const middle = list.filter((m) => !m.loadFirst && !m.loadLast);
    return [...first, ...middle, ...last];
  };

  const natives = sortLoadOrder(nativeMods).map((mod) => {
    const modPath = CreateModPathFromName(mod.name);
    const entry: Record<string, unknown> = {
      path: `${modPath}/${mod.dllFile}`,
      enabled: mod.enabled,
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
    const modPath = CreateModPathFromName(mod.name);
    const entry: Record<string, unknown> = {
      id: mod.uuid,
      path: `${modPath}/`,
      enabled: mod.enabled,
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

  return JSON.stringify(profile, null, 2);
};

export const writeMe3Profile = (mods: Mod[], savefile?: string, startOnline?: boolean) => {
  try {
    const activeProfile = getActiveProfile();
    const sf = savefile !== undefined ? savefile : (activeProfile?.savefile ?? '');
    const so = startOnline !== undefined ? startOnline : (activeProfile?.startOnline ?? false);
    const profileString = generateMe3ProfileString(mods, sf, so);
    const profilePath = join(getProfilesFolder(), ME3_PROFILE_FILENAME);
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

const unsubMods = store.onDidChange('mods', (mods) => {
  if (!mods) return;
  writeMe3Profile(mods);
});

const unsubProfiles = store.onDidChange('profiles', () => {
  const mods = store.get('mods');
  writeMe3Profile(mods);
});

app.on('before-quit', () => {
  unsubMods();
  unsubProfiles();
});
