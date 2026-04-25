import { errToString } from '../../utils/utilities';
import { logger } from '../../utils/mainLogger';
import store from './init';
import { Mod, ModProfile } from 'types';
import { join } from 'path';
import { app } from 'electron';

const { debug, error } = logger;

export const loadMods = () => {
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

export const saveModEnginePath = (path: string) => {
  debug(`Saving ME3 Path: ${path}`);
  try {
    store.set('modEnginePath', path);
    debug('ME3 Path saved');
    return true;
  } catch (err) {
    const msg = `An error occured while saving ME3 Path: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};

export const getModEnginePath = () => {
  debug('Getting ME3 Path');
  try {
    const path = store.get('modEnginePath');
    debug(`ME3 Path: ${path}`);
    return path;
  } catch (err) {
    const msg = `An error occured while getting ME3 Path: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};

export const setModEnginePath = (path: string) => {
  debug(`Setting ME3 Path: ${path}`);
  try {
    store.set('modEnginePath', path);
    debug('ME3 Path set');
    return true;
  } catch (err) {
    const msg = `An error occured while setting ME3 Path: ${errToString(err)}`;
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

export const getSavefile = () => {
  debug('Getting savefile');
  try {
    const savefile = store.get('savefile');
    debug(`Savefile: ${savefile}`);
    return savefile;
  } catch (err) {
    const msg = `An error occured while getting savefile: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};

export const setSavefile = (savefile: string) => {
  debug(`Setting savefile: ${savefile}`);
  try {
    store.set('savefile', savefile);
    debug('Savefile set');
    return true;
  } catch (err) {
    const msg = `An error occured while setting savefile: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};

export const getStartOnline = () => {
  debug('Getting startOnline');
  try {
    const startOnline = store.get('startOnline');
    debug(`StartOnline: ${startOnline}`);
    return startOnline;
  } catch (err) {
    const msg = `An error occured while getting startOnline: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};

export const setStartOnline = (startOnline: boolean) => {
  debug(`Setting startOnline: ${startOnline}`);
  try {
    store.set('startOnline', startOnline);
    debug('StartOnline set');
    return true;
  } catch (err) {
    const msg = `An error occured while setting startOnline: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};

export const getProfiles = (): ModProfile[] => {
  debug('Getting profiles');
  try {
    return store.get('profiles');
  } catch (err) {
    const msg = `An error occured while getting profiles: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
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
