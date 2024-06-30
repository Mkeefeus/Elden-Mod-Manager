import { getModsFolder } from "./db/api";
export const MOD_SUBFOLDERS = ['chr', 'obj', 'parts', 'event', 'map', 'menu', 'msg', 'mtd', 'param', 'remo', 'script', 'sfx'];
export const INI_PATH = `${getModsFolder()}mod_loader_config.ini`;