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
