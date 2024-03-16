import store from './init';
import tryCatch from '../tryCatchHandler';
import { Mod } from 'types';

export const loadMods = tryCatch(() => store.get('mods'));

export const saveMods = tryCatch((mods: Mod[]) => {
  store.set('mods', mods);
  return true;
});
