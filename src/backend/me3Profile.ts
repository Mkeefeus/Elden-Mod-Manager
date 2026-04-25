import { Mod } from 'types';
import { CreateModPathFromName, errToString } from '../utils/utilities';
import store from './db/init';
import { logger } from '../utils/mainLogger';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getProfilesFolder, getSavefile, getStartOnline } from './db/api';
import { app } from 'electron';
import { ME3_PROFILE_FILENAME } from './constants';

const { debug, error } = logger;

const generateMe3ProfileString = (mods: Mod[], savefile: string, startOnline: boolean): string => {
  const lines: string[] = [];

  lines.push('profileVersion = "v1"');
  if (savefile) {
    lines.push(`savefile = "${savefile}"`);
  }
  lines.push(`start_online = ${startOnline}`);
  lines.push('');
  lines.push('[[supports]]');
  lines.push('game = "eldenring"');

  for (const mod of mods) {
    const modPath = CreateModPathFromName(mod.name);

    if (mod.dllFile) {
      // Native / DLL mod
      lines.push('');
      lines.push('[[natives]]');
      lines.push(`path = '${modPath}/${mod.dllFile}'`);
      lines.push(`enabled = ${mod.enabled}`);
      if (mod.loadEarly) {
        lines.push('load_early = true');
      }
      if (mod.loadBefore && mod.loadBefore.length > 0) {
        lines.push(`load_before = [${mod.loadBefore.map((id) => `"${id}"`).join(', ')}]`);
      }
      if (mod.loadAfter && mod.loadAfter.length > 0) {
        lines.push(`load_after = [${mod.loadAfter.map((id) => `"${id}"`).join(', ')}]`);
      }
    } else {
      // Package / folder mod
      lines.push('');
      lines.push('[[packages]]');
      lines.push(`id = "${mod.uuid}"`);
      lines.push(`path = '${modPath}/'`);
      lines.push(`enabled = ${mod.enabled}`);
      if (mod.loadBefore && mod.loadBefore.length > 0) {
        lines.push(`load_before = [${mod.loadBefore.map((id) => `"${id}"`).join(', ')}]`);
      }
      if (mod.loadAfter && mod.loadAfter.length > 0) {
        lines.push(`load_after = [${mod.loadAfter.map((id) => `"${id}"`).join(', ')}]`);
      }
    }
  }

  return lines.join('\n');
};

export const writeMe3Profile = (mods: Mod[], savefile?: string, startOnline?: boolean) => {
  try {
    const sf = savefile !== undefined ? savefile : getSavefile();
    const so = startOnline !== undefined ? startOnline : getStartOnline();
    const profileString = generateMe3ProfileString(mods, sf, so);
    const profilePath = join(getProfilesFolder(), ME3_PROFILE_FILENAME);
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

const unsubMods = store.onDidChange('mods', (mods) => {
  if (!mods) return;
  writeMe3Profile(mods);
});

const unsubSavefile = store.onDidChange('savefile', (savefile) => {
  const mods = store.get('mods');
  writeMe3Profile(mods, savefile ?? '');
});

const unsubStartOnline = store.onDidChange('startOnline', (startOnline) => {
  const mods = store.get('mods');
  writeMe3Profile(mods, undefined, startOnline ?? false);
});

app.on('before-quit', () => {
  unsubMods();
  unsubSavefile();
  unsubStartOnline();
});
