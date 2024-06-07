import { errToString } from '../../utils/utilities';
import { logger } from '../../utils/mainLogger';
import store from './init';
import { Mod } from 'types';

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
    throw new Error(msg);
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
    throw new Error(msg);
  }
};

export const saveModEnginePath = (path: string) => {
  debug(`Saving Mod Engine Path: ${path}`);
  try {
    store.set('modEnginePath', path);
    debug('Mod Engine Path saved');
    return true;
  } catch (err) {
    const msg = `An error occured while saving Mod Engine Path: ${errToString(err)}`;
    error(msg);
    throw new Error(msg);
  }
};

export const getModEnginePath = () => {
  debug('Getting Mod Engine Path');
  try {
    const path = store.get('modEnginePath');
    debug(`Mod Engine Path: ${path}`);
    return path;
  } catch (err) {
    const msg = `An error occured while getting Mod Engine Path: ${errToString(err)}`;
    error(msg);
    throw new Error(msg);
  }
};

export const setModEnginePath = (path: string) => {
  debug(`Setting Mod Engine Path: ${path}`);
  try {
    store.set('modEnginePath', path);
    debug('Mod Engine Path set');
    return true;
  } catch (err) {
    const msg = `An error occured while setting Mod Engine Path: ${errToString(err)}`;
    error(msg);
    throw new Error(msg);
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
    throw new Error(msg);
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
    throw new Error(msg);
  }
};

export const getModFolderPath = () => {
  debug('Getting Mod Folder Path');
  try {
    const path = store.get('modFolderPath');
    debug(`Mod Folder Path: ${path}`);
    return path;
  } catch (err) {
    const msg = `An error occured while getting Mod Folder Path: ${errToString(err)}`;
    error(msg);
    throw new Error(msg);
  }
};

export const setModFolderPath = (path: string) => {
  debug(`Saving Mod Folder Path: ${path}`);
  try {
    store.set('modFolderPath', path);
    debug('Mod Folder Path saved');
    return true;
  } catch (err) {
    const msg = `An error occured while saving Mod Folder Path: ${errToString(err)}`;
    error(msg);
    throw new Error(msg);
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
    throw new Error(msg);
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
    throw new Error(msg);
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
    throw new Error(msg);
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
    throw new Error(msg);
  }
};
