import store from './init';
import { Mod } from 'types';

export const loadMods = () => {
  return store.get('mods');
};

export const saveMods = (mods: Mod[]): [boolean, Error?] => {
  try {
    store.set('mods', mods);
    return [true];
  } catch (e) {
    const error = e as Error;
    console.error(error.message);
    return [false, error];
  }
};
