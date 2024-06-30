import { stringify } from 'ini';
import store from './db/init';
import { app } from 'electron';
import { Mod } from 'types';
import { writeFileSync } from 'fs';
import { INI_PATH } from './constants';

interface Ini {
  modloader: {
    load_delay: number;
    show_terminal: number;
  };
  disabled_mods?: {
    [key: string]: number;
  };
  loadorder?: {
    [key: string]: number;
  };
}

const writeIniFile = (mods: Mod[]) => {
  const ini: Ini = {
    modloader: {
      load_delay: 5000,
      show_terminal: 1,
    },
  };
  mods.sort((a, b) => (a.loadOrder || 0) - (b.loadOrder || 0));
  let loadOrder = 1;
  mods.forEach((mod) => {
    if (!mod.dllFile) return;
    if (!mod.enabled) {
      ini.disabled_mods = ini.disabled_mods || {};
      ini.disabled_mods[mod.dllFile.split('.')[0]] = 1;
      return;
    }
    ini.loadorder = ini.loadorder || {};
    ini.loadorder[mod.dllFile.split('.')[0]] = loadOrder++;
  });
  const iniString = stringify(ini);
  writeFileSync(INI_PATH, iniString);
};

const unsubscribe = store.onDidChange('mods', (mods) => {
  if (!mods) return;
  writeIniFile(mods);
});

app.on('before-quit', () => {
  unsubscribe();
});
