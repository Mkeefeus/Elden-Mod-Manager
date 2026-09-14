import { errToString } from '@utils/utilities';
import { logger } from '@utils/mainLogger';
import store from './init';
import { Mod, ModProfile, ProfileModRef, ProfileSettingsPatch, Tool, WindowState } from 'types';
import { join } from 'path';
import { app } from 'electron';

const { debug, error } = logger;

export const loadMods = (): Mod[] => {
  debug('Loading mods from DB');
  try {
    const mods = store.get('mods');
    debug(`Mods loaded from DB`);
    return mods;
  } catch (err) {
    const msg = `An error occured while loading mods: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};

export const saveMods = (mods: Mod[]) => {
  debug(`Saving mods to DB`);
  try {
    store.set('mods', mods);
    debug('Mods saved to DB');
    return true;
  } catch (err) {
    const msg = `An error occured while saving mods: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};

export const saveProfileMods = (profileId: string, refs: ProfileModRef[]) => {
  debug(`Saving profile mods for: ${profileId}`);
  try {
    const profiles = store.get('profiles');
    const index = profiles.findIndex((p) => p.uuid === profileId);
    if (index === -1) throw new Error(`Profile not found: ${profileId}`);
    profiles[index] = { ...profiles[index], mods: refs };
    store.set('profiles', profiles);
    return true;
  } catch (err) {
    const msg = `An error occured while saving profile mods: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};

export const getEldenRingFolder = () => {
  debug('Getting Elden Ring Path');
  try {
    const path = store.get('eldenRingFolder');
    debug(`Elden Ring Path: ${path}`);
    return path;
  } catch (err) {
    const msg = `An error occured while getting Elden Ring Path: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};

export const setEldenRingFolder = (path: string) => {
  debug(`Saving Elden Ring Path: ${path}`);
  try {
    store.set('eldenRingFolder', path);
    debug('Elden Ring Path saved');
    return true;
  } catch (err) {
    const msg = `An error occured while saving Elden Ring Path: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};

export const getModsFolder = () => {
  debug('Getting Mod Folder Path');
  try {
    const rawPath = store.get('modFolderPath');
    // Normalize Windows-style backslashes when running on Linux/macOS
    const path = process.platform !== 'win32' ? rawPath.replace(/\\/g, '/') : rawPath;
    debug(`Mod Folder Path: ${path}`);
    return path;
  } catch (err) {
    const msg = `An error occured while getting Mod Folder Path: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};

export const setModsFolder = (path: string) => {
  debug(`Saving Mod Folder Path: ${path}`);
  try {
    store.set('modFolderPath', path);
    debug('Mod Folder Path saved');
    return true;
  } catch (err) {
    const msg = `An error occured while saving Mod Folder Path: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};

export const getToolsDirectory = (): string => {
  debug('Getting Tool Folder Path');
  try {
    const rawPath = store.get('toolFolderPath');
    // Normalize Windows-style backslashes when running on Linux/macOS
    const path = process.platform !== 'win32' ? rawPath.replace(/\\/g, '/') : rawPath;
    debug(`Tool Folder Path: ${path}`);
    return path;
  } catch (err) {
    const msg = `An error occured while getting Tool Folder Path: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};

export const setToolsDirectory = (path: string): boolean => {
  debug(`Saving Tool Folder Path: ${path}`);
  try {
    store.set('toolFolderPath', path);
    debug('Tool Folder Path saved');
    return true;
  } catch (err) {
    const msg = `An error occured while saving Tool Folder Path: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};

export const isFirstRun = () => {
  debug('Checking if first run');
  try {
    const firstRun = store.get('firstRun');
    debug(`First Run: ${firstRun}`);
    return firstRun;
  } catch (err) {
    const msg = `An error occured while checking if first run: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};

export const clearFirstRun = () => {
  debug('Clearing first run flag');
  try {
    store.set('firstRun', false);
    debug('First run cleared');
    return true;
  } catch (err) {
    const msg = `An error occured while clearing first run: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};

export const getPromptedModsFolder = () => {
  debug('Checking if prompted for mods folder');
  try {
    const prompted = store.get('promptedModsFolder');
    debug(`Prompted for mods folder: ${prompted}`);
    return prompted;
  } catch (err) {
    const msg = `An error occured while checking if prompted for mods folder: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};

export const clearPromptedModsFolder = () => {
  debug('Setting prompted for mods folder');
  try {
    store.set('promptedModsFolder', true);
    debug('Prompted for mods folder set');
    return true;
  } catch (err) {
    const msg = `An error occured while setting prompted for mods folder: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};

// Defaults for the ModProfile settings that are typed as required booleans but, per the store
// schema (see schema.ts), aren't guaranteed to actually be present on every stored profile — a
// profile can predate a given setting, or predate the migration meant to backfill it.
const DEFAULT_PROFILE_SETTINGS: Pick<
  ModProfile,
  'startOnline' | 'disableArxan' | 'noMemPatch' | 'noBootBoost' | 'showLogos' | 'skipSteamInit'
> = {
  startOnline: false,
  disableArxan: false,
  noMemPatch: false,
  noBootBoost: false,
  showLogos: false,
  skipSteamInit: false,
};

const withProfileDefaults = (profile: ModProfile): ModProfile => ({
  ...DEFAULT_PROFILE_SETTINGS,
  ...profile,
});

/**
 * Profiles exactly as stored, with no defaulting applied — a setting missing from the store stays
 * missing here, even though `ModProfile` claims it's always a `boolean`. This exists only for code
 * that needs to tell "genuinely missing" apart from "present" — i.e. a migration deciding whether
 * it still has something to backfill (see db/migrations). Everything else should use getProfiles().
 */
export const getRawProfiles = (): ModProfile[] => {
  debug('Getting raw profiles');
  try {
    return store.get('profiles');
  } catch (err) {
    const msg = `An error occured while getting raw profiles: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};

/**
 * Profiles with any missing settings filled in with their defaults (see DEFAULT_PROFILE_SETTINGS),
 * so every `ModProfile` handed out from here actually satisfies its type — callers never need to
 * fall back on a possibly-missing setting themselves.
 */
export const getProfiles = (): ModProfile[] => {
  debug('Getting profiles');
  return getRawProfiles().map(withProfileDefaults);
};

export const saveProfiles = (profiles: ModProfile[]) => {
  debug('Saving profiles');
  try {
    store.set('profiles', profiles);
    return true;
  } catch (err) {
    const msg = `An error occured while saving profiles: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};

export const getActiveProfileId = (): string => {
  debug('Getting active profile id');
  try {
    return store.get('activeProfileId');
  } catch (err) {
    const msg = `An error occured while getting active profile id: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};

export const setActiveProfileId = (id: string) => {
  debug(`Setting active profile id: ${id}`);
  try {
    store.set('activeProfileId', id);
    return true;
  } catch (err) {
    const msg = `An error occured while setting active profile id: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};

export const getProfilesFolder = () => {
  return join(app.getPath('userData'), 'profiles');
};

export const getActiveProfile = (): ModProfile | undefined => {
  const profiles = getProfiles();
  const activeId = getActiveProfileId();
  return profiles.find((p) => p.uuid === activeId);
};

export const updateActiveProfile = (fields: ProfileSettingsPatch) => {
  debug(`Updating active profile fields: ${JSON.stringify(fields)}`);
  try {
    const profiles = getProfiles();
    const activeId = getActiveProfileId();
    const index = profiles.findIndex((p) => p.uuid === activeId);
    if (index === -1) throw new Error('No active profile found');
    profiles[index] = { ...profiles[index], ...fields };
    store.set('profiles', profiles);
    return true;
  } catch (err) {
    const msg = `An error occured while updating active profile: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};

export const getWindowState = (): WindowState => {
  debug('Getting window state');
  try {
    const savedState = store.get('windowState');
    if (savedState) return savedState;
    return store.get('windowState');
  } catch (err) {
    const msg = `An error occured while getting window state: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};

export const setWindowState = (state: WindowState) => {
  debug(`Setting window state: ${JSON.stringify(state)}`);
  try {
    store.set('windowState', state);
    return true;
  } catch (err) {
    const msg = `An error occured while setting window state: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};

export const getLastPage = (): string => {
  debug('Getting last page');
  try {
    return store.get('lastPage');
  } catch (err) {
    const msg = `An error occured while getting last page: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};

export const setLastPage = (route: string) => {
  debug(`Setting last page: ${route}`);
  try {
    store.set('lastPage', route);
    return true;
  } catch (err) {
    const msg = `An error occured while setting last page: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};

export const getTools = (): Tool[] => {
  debug('Loading tools from DB');
  try {
    const tools = store.get('tools');
    debug(`Tools loaded from DB`);
    return tools;
  } catch (err) {
    const msg = `An error occured while loading tools: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};

export const saveTools = (tools: Tool[]) => {
  debug(`Saving tools to DB`);
  try {
    store.set('tools', tools);
    debug('Tools saved to DB');
    return true;
  } catch (err) {
    const msg = `An error occured while saving tools: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};
