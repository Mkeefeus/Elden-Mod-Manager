import { randomUUID } from 'crypto';
import { readdirSync, existsSync, cpSync, rmSync, renameSync } from 'fs';
import { extname, join } from 'path';
import { errToString, CreateModPathFromName } from '../utils/utilities';
import { AddModFormValues, Mod } from 'types';
import { logger } from '../utils/mainLogger';
import { getModsFolder, getProfiles, loadMods, saveMods, saveProfiles, setModsFolder } from './db/api';
import { MOD_SUBFOLDERS } from './constants';
import { getMainWindow } from '../main';

const { debug, error, warning } = logger;

const normalizeOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;

  const trimmedValue = value.trim();
  return trimmedValue || undefined;
};

const genUUID = (): string => {
  debug('Generating UUID');
  const uuid = randomUUID();
  debug(`UUID generated: ${uuid}, checking for duplicates`);
  const mods = loadMods();
  const existingUUIDs = mods.map((mod) => mod.uuid);
  const duplicate = existingUUIDs.includes(uuid);
  if (duplicate) {
    debug('Duplicate UUID found, generating new UUID');
    return genUUID();
  }
  debug('No duplicates found, UUID generated successfully');
  return uuid;
};

const validateMod = (path: string, isDll: boolean, hasExe: boolean) => {
  debug(`Validating path: ${path}`);
  debug(`Reading directory: ${path}`);
  let files;
  try {
    files = readdirSync(path);
  } catch (err) {
    const msg = `An error occured while reading directory: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
  let hasDll;
  let hasValidSubfolder;
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
    if (!hasValidSubfolder && !hasExe) {
      const msg =
        'No valid subfolder was found in the directory, please select the folder that contains the mod files. It should have one or more of the following subfolders: chr, obj, parts, event, map, menu, msg, mtd, param, remo, script, or sfx.';
      warning(msg);
      return false;
    } else if (!hasValidSubfolder && hasExe) {
      debug('Mod does not have valid subfolder but has exe, skipping warning');
    }
  }
  return true;
};

export const handleAddMod = (formData: AddModFormValues) => {
  const mods = loadMods();
  const uuid = genUUID();
  const dllFileName = formData.dllPath ? formData.dllPath.split(/[/\\]/).pop() : undefined;
  const exeFileName = formData.exePath ? formData.exePath.split(/[/\\]/).pop() : undefined;
  const modVersion = normalizeOptionalString((formData as AddModFormValues & Record<string, unknown>).modVersion);
  const finalizer = normalizeOptionalString(formData.finalizer);

  const newMod: Mod = {
    uuid: uuid,
    name: formData.modName,
    installDate: Date.now(),
    // Note: enabled is NOT stored on Mod — it lives on ProfileModRef
    dllFile: dllFileName || undefined,
    exe: exeFileName || undefined,
    loadEarly: dllFileName && formData.loadEarly ? true : undefined,
    finalizer: dllFileName ? finalizer : undefined,
    initializer: dllFileName ? formData.initializer : undefined,
    version: modVersion,
    nexusModId: formData.nexusModId,
    nexusFileId: formData.nexusFileId,
    nexusGameDomain: formData.nexusGameDomain,
  };

  debug(`Adding new mod: ${JSON.stringify(newMod)}`);

  const source = formData.path;

  if (!validateMod(source, !!newMod.dllFile, !!newMod.exe)) {
    debug('Invalid path, cancelling mod addition');
    return;
  }

  const pathName = CreateModPathFromName(newMod.name, newMod.version);
  const installPath = join(getModsFolder(), pathName);
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
    throw new Error(msg, { cause: err });
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
        throw new Error(msg, { cause: err });
      }
    }
  }

  debug('Saving new mod to DB');
  const newMods = [...mods, newMod];
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
  const pathName = CreateModPathFromName(mod.name, mod.version);
  debug(`Removing mod from: ${pathName}`);
  const installPath = join(getModsFolder(), pathName);
  debug(`Checking if mod path exists: ${installPath}`);
  let foundPath = true;
  try {
    if (!existsSync(installPath)) {
      foundPath = false;
      warning('Mod path not found, removing from DB only');
    }
  } catch (err) {
    const msg = `An error occured while checking mod path: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
  if (foundPath) {
    try {
      rmSync(installPath, { recursive: true });
    } catch (err) {
      const msg = `An error occured while deleting mod: ${errToString(err)}`;
      error(msg);
      throw new Error(msg, { cause: err });
    }
  }
  debug('Mod deleted successfully');

  // After deleting the mod files, we need to remove it from any profiles that reference it.
  const profiles = getProfiles();
  debug('Removing mod from profiles');
  for (const profile of profiles) {
    const hadProfileMod = profile.mods.some((profileMod) => profileMod.modUuid === mod.uuid);
    const cleanedProfileMods = profile.mods
      .filter((profileMod) => profileMod.modUuid !== mod.uuid)
      .map((profileMod) => ({
        ...profileMod,
        loadBefore: profileMod.loadBefore?.filter((dependent) => dependent.id !== mod.uuid),
        loadAfter: profileMod.loadAfter?.filter((dependent) => dependent.id !== mod.uuid),
      }));

    if (hadProfileMod || cleanedProfileMods.length !== profile.mods.length) {
      debug(`Removing mod from profile: ${profile.name}`);
    }

    profile.mods = cleanedProfileMods;
  }
  saveProfiles(profiles);
  saveMods(newMods);
};

export const promptModsFolder = () => {
  try {
    const modsFolder = getModsFolder();
    if (existsSync(modsFolder)) {
      throw new Error('Mods folder found, skipping prompt');
    }
    debug('Prompting user to select mods folder');
    const window = getMainWindow();
    if (!window) {
      throw new Error('Main window not found');
    }
    window.once('ready-to-show', () => {
      window.webContents.send('prompt-mods-folder');
    });
  } catch (err) {
    const msg = `An error occured while prompting user to select mods folder: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};

export const updateModsFolder = (newPath: string) => {
  debug(`Updating mods folder to: ${newPath}`);
  try {
    const currentPath = getModsFolder();
    if (currentPath === newPath) {
      debug('mods folder unchanged');
      return;
    }
    if (readdirSync(newPath).length > 0) {
      warning('Destination path is not empty, please select an empty folder');
      return;
    }
    if (!existsSync(currentPath)) {
      throw new Error('Current mods folder not found');
    }
    const contents = readdirSync(currentPath);
    debug(`Moving mods contents to: ${newPath}`);
    contents.forEach((file) => {
      debug(`Moving: ${file}`);
      renameSync(`${currentPath}/${file}`, `${newPath}/${file}`);
    });
    debug('Removing old mods folder');
    rmSync(currentPath, { recursive: true });
    debug('Updating mods folder in database');
    setModsFolder(newPath);
    debug(`mods folder updated to: ${newPath}`);
  } catch (err) {
    const msg = `An error occured while updating mods folder: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};
