import store from './init';
import tryCatch from '../tryCatchHandler';
import { Mod } from 'types';

export const loadMods = tryCatch(() => store.get('mods'));
export const saveMods = tryCatch((mods: Mod[]) => {
  store.set('mods', mods);
  return true;
});

export const saveEldenRingPath = tryCatch((path: string) => {
  store.set('eldenRingPath', path);
  return true;
});

export const loadEldenRingPath = tryCatch(() => store.get('eldenRingPath'));

export const saveModEnginePath = tryCatch((path: string) => {
  store.set('modEnginePath', path);
  return true;
});

export const getModEnginePath = tryCatch(() => store.get('modEnginePath'));
