import { randomUUID } from 'crypto';
import { readdirSync, existsSync, cpSync, rmSync } from 'fs';
import { extname } from 'path';
import { errToString, CreateModPathFromName } from '../utils/utilities';
import { AddModFormValues, Mod } from 'types';
import { logger } from '../utils/mainLogger';
import { loadMods, saveMods } from './db/api';
import { findFile } from './fileSystem';
import MOD_SUBFOLDERS from './modSubfolders';

const { debug, error, warning } = logger;

const INSTALL_DIR = process.cwd();

const genUUID = (): string => {
  debug('Generating UUID');
  const uuid = randomUUID();
  debug(`UUID generated: ${uuid}, checking for duplicates`);
  const mods = loadMods();
  const existingUUIDs = mods.map((mod) => mod.uuid);
  const duplicate = existingUUIDs?.includes(uuid);
  if (duplicate) {
    debug('Duplicate UUID found, generating new UUID');
    return genUUID();
  }
  debug('No duplicates found, UUID generated successfully');
  return uuid;
};

const validateMod = (path: string, isDll: boolean) => {
  debug(`Validating path: ${path}`);
  debug(`Reading directory: ${path}`);
  let files;
  try {
    files = readdirSync(path);
  } catch (err) {
    const msg = `An error occured while reading directory: ${errToString(err)}`;
    error(msg);
    throw new Error(msg);
  }
  let hasDll = false;
  let hasValidSubfolder = false;
  if (isDll) {
    debug('Mod is dll');
    hasDll = files.some((file) => extname(file) === '.dll');
    if (!hasDll) {
      const msg = 'No DLL file was found in the directory, please select the folder that contains the mod DLL file.';
      warning(msg);
      return false;
    }
  } else {
    debug('Mod is not dll');
    hasValidSubfolder = files.some((file) => MOD_SUBFOLDERS.includes(file));
    if (!hasValidSubfolder) {
      const msg =
        'No valid subfolder was found in the directory, please select the folder that contains the mod files. It should have one or more of the following subfolders: chr, obj, parts, event, map, menu, msg, mtd, param, remo, script, or sfx.';
      warning(msg);
      return false;
    }
  }
  return hasDll || hasValidSubfolder;
};

export const handleAddMod = async (formData: AddModFormValues) => {
  const mods = loadMods();
  const uuid = genUUID();
  const newMod: Mod = {
    uuid: uuid,
    enabled: false,
    name: formData.modName,
    installDate: Date.now(),
    dllFile: undefined,
    exe: formData.exePath !== '' ? formData.exePath : undefined,
  };
  debug(`Adding new mod: ${JSON.stringify(newMod)}`);

  const source = formData.path;
  let tempPath;

  if (formData.isDll) {
    debug('Mod is dll');
    const dll = findFile('dll', source);
    if (!dll) {
      warning('Adding mod cancelled');
      return;
    }
    newMod.dllFile = dll;
  }

  if (!validateMod(source, formData.isDll)) {
    debug('Invalid path, cancelling mod addition');
    return;
  }

  const pathName = CreateModPathFromName(newMod.name);
  const installPath = `${INSTALL_DIR}\\mods\\${pathName}\\`;
  debug(`Installing mod to: ${installPath}`);

  if (existsSync(installPath)) {
    const msg = 'Mod path already exists';
    warning(msg);
    return;
  }

  debug(`Copying mod from ${source} to ${installPath}`);

  try {
    cpSync(source, installPath, {
      recursive: true,
    });
    debug('Mod copied successfully');
  } catch (err) {
    const msg = `An error occured while copying mod: ${errToString(err)}`;
    error(msg);
    throw new Error(msg);
  }

  if (tempPath) {
    debug(`Removing temp directory: ${tempPath}`);
    try {
      rmSync(tempPath, { recursive: true });
      debug('Temp directory removed');
    } catch (err) {
      const msg = `An error occured while removing temp directory: ${errToString(err)}`;
      warning(msg);
    }
  }

  if (formData.delete) {
    debug(`Deleting mod source: ${formData.path}`);
    if (existsSync(formData.path)) {
      try {
        rmSync(formData.path, { recursive: true });
        debug('Mod source deleted');
      } catch (err) {
        const msg = `An error occured while deleting mod source: ${errToString(err)}`;
        error(msg);
        throw new Error(msg);
      }
    }
  }

  debug('Saving new mod to DB');
  const newMods = [...(mods as Mod[]), newMod];
  saveMods(newMods);
  return true;
};

export const handleDeleteMod = (mod: Mod) => {
  debug(`Deleting mod: ${mod.name}`);
  const mods = loadMods();
  if (!mods) {
    const msg = 'No mods found';
    warning(msg);
    return;
  }
  const newMods = mods.filter((m) => m.uuid !== mod.uuid);
  const pathName = CreateModPathFromName(mod.name);
  debug(`Removing mod from: ${pathName}`);
  const installPath = `./mods/${pathName}/`;
  let foundPath = true;
  try {
    if (!existsSync(installPath)) {
      foundPath = false;
      warning('Mod path not found, removing from DB only', { hideDisplay: true });
    }
  } catch (err) {
    const msg = `An error occured while checking mod path: ${errToString(err)}`;
    error(msg);
    throw new Error(msg);
  }
  if (foundPath) {
    try {
      rmSync(installPath, { recursive: true });
    } catch (err) {
      const msg = `An error occured while deleting mod: ${errToString(err)}`;
      error(msg);
      throw new Error(msg);
    }
  }
  // loop through remaining mods and check for gaps in load order
  const enabledMods = newMods.filter((m) => m.enabled);
  const disabledMods = newMods.filter((m) => !m.enabled);
  const sortedMods = enabledMods.sort(
    (a, b) => (a.loadOrder || enabledMods.length) - (b.loadOrder || enabledMods.length)
  );
  sortedMods.forEach((mod, index) => {
    mod.loadOrder = index + 1;
  });
  debug('Mod deleted successfully');
  saveMods([...sortedMods, ...disabledMods]);
};
