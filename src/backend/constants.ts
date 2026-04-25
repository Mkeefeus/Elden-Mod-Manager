import { join } from 'path';
import os from 'os';

export const MOD_SUBFOLDERS = [
  'chr',
  'obj',
  'parts',
  'event',
  'map',
  'menu',
  'msg',
  'mtd',
  'param',
  'remo',
  'script',
  'sfx',
];

export const ME3_PROFILE_FILENAME = 'eldenring-mods.me3';

export const ME3_DEFAULT_WIN_PATH = join(
  process.env.LOCALAPPDATA || '',
  'garyttierney',
  'me3',
  'bin',
  'me3.exe'
);

export const ME3_DEFAULT_LINUX_PATH = join(
  process.env.XDG_DATA_HOME || join(os.homedir(), '.local', 'share'),
  'garyttierney',
  'me3',
  'bin',
  'me3'
);
