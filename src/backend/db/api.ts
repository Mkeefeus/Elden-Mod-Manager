import store from './init';
import tryCatch from '../tryCatchHandler';
import { randomUUID } from 'crypto';
import { Mod, AddModFormValues } from 'types';

export const loadMods = tryCatch(() => store.get('mods'));

export const saveMods = tryCatch((mods: Mod[]) => {
  store.set('mods', mods);
  return true;
});

export const addMod = tryCatch((formData: AddModFormValues) => {
  const mods = loadMods();
  if (!mods) {
    return false;
  }
  const newMod: Mod = {
    uuid: randomUUID(),
    enabled: false,
    name: formData.modName,
    installDate: Date.now(),
    isDll: formData.isDll,
  };
  const newMods = [...(mods as Mod[]), newMod];
  saveMods(newMods);
  return true;
});
