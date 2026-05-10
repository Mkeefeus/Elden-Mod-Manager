import { Dependent, Mod } from 'types';
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

type ResolvedProfileMod = Mod & {
  loadBefore?: Dependent[];
  loadAfter?: Dependent[];
};

const getMe3ReferenceId = (mod: Mod) => (mod.dllFile ? mod.dllFile : mod.uuid);

const translateDependents = (
  dependents: Dependent[] | undefined,
  enabledModsByUuid: Map<string, ResolvedProfileMod>
): Dependent[] | undefined => {
  if (!dependents?.length) return undefined;

  const translated = dependents
    .map((dependent) => {
      const targetMod = enabledModsByUuid.get(dependent.id);
      if (!targetMod) return undefined;

      return {
        ...dependent,
        id: getMe3ReferenceId(targetMod),
      };
    })
    .filter((dependent): dependent is Dependent => !!dependent);

  return translated.length > 0 ? translated : undefined;
};

const generateMe3ProfileString = (mods: ResolvedProfileMod[], savefile: string, startOnline: boolean): string => {
  const nativeMods = mods.filter((m) => !!m.dllFile);
  const packageMods = mods.filter((m) => !m.dllFile);
  const enabledModsByUuid = new Map(mods.map((mod) => [mod.uuid, mod]));
  debug(
    `Generating ME3 profile: ${nativeMods.length} native mod(s), ${packageMods.length} package mod(s), savefile="${savefile}", startOnline=${startOnline}`
  );

  const natives = nativeMods.map((mod) => {
    const modPath = path.join(getModsFolder(), CreateModPathFromName(mod.name, mod.version), mod.dllFile!);
    const entry: Record<string, unknown> = {
      path: modPath,
    };
    const loadBefore = translateDependents(mod.loadBefore, enabledModsByUuid);
    const loadAfter = translateDependents(mod.loadAfter, enabledModsByUuid);
    if (mod.loadEarly) entry.load_early = true;
    if (mod.finalizer) entry.finalizer = mod.finalizer;
    if (mod.initializer) entry.initializer = mod.initializer;
    if (loadBefore) entry.load_before = loadBefore;
    if (loadAfter) entry.load_after = loadAfter;
    return entry;
  });

  const packages = packageMods.map((mod) => {
    const modPath = path.join(getModsFolder(), CreateModPathFromName(mod.name, mod.version));
    const entry: Record<string, unknown> = {
      id: mod.uuid,
      path: `${modPath}/`,
    };
    const loadBefore = translateDependents(mod.loadBefore, enabledModsByUuid);
    const loadAfter = translateDependents(mod.loadAfter, enabledModsByUuid);
    if (loadBefore) entry.load_before = loadBefore;
    if (loadAfter) entry.load_after = loadAfter;
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
    const installedModsByUuid = new Map(loadMods().map((mod) => [mod.uuid, mod]));
    const enabledMods = activeProfile.mods
      .map<ResolvedProfileMod | undefined>((profileMod) => {
        const installedMod = installedModsByUuid.get(profileMod.modUuid);
        if (!installedMod) return undefined;

        const resolvedMod: ResolvedProfileMod = {
          ...installedMod,
          loadBefore: profileMod.loadBefore,
          loadAfter: profileMod.loadAfter,
        };

        return resolvedMod;
      })
      .filter((mod): mod is ResolvedProfileMod => mod !== undefined);
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
