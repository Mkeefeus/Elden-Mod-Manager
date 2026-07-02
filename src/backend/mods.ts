import { readdirSync, existsSync, cpSync, rmSync, renameSync } from 'fs';
import { extname, join } from 'path';
import { errToString, CreateModPathFromName, generateUUID } from '@utils/utilities';
import { AddModFormValues, Mod } from 'types';
import { logger } from '@utils/mainLogger';
import { getModsFolder, getProfiles, loadMods, saveMods, saveProfiles, setModsFolder } from './db/api';
import { MOD_SUBFOLDERS } from './constants';
import { handleAddTool, handleDeleteTool } from './tools';
import { getMainWindow } from '~/main';

const { debug, error, warning } = logger;

const normalizeOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;

  const trimmedValue = value.trim();
  return trimmedValue || undefined;
};

const validateMod = (path: string, isDll: boolean, hasTool: boolean) => {
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
    if (!hasValidSubfolder && !hasTool) {
      const msg =
        'No valid subfolder was found in the directory, please select the folder that contains the mod files. It should have one or more of the following subfolders: chr, obj, parts, event, map, menu, msg, mtd, param, remo, script, or sfx.';
      warning(msg);
      return false;
    } else if (!hasValidSubfolder && hasTool) {
      debug('Mod does not have valid subfolder but has exe, skipping warning');
    }
  }
  return true;
};

export const handleAddMod = (formData: AddModFormValues) => {
  const mods = loadMods();
  const uuid = generateUUID(mods.map((mod) => mod.uuid));
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

  if (newMod.exe) {
    const executablePath = join(installPath, newMod.exe);
    const toolId = handleAddTool({
      name: newMod.name,
      version: newMod.version,
      executablePath,
      modUuid: newMod.uuid,
    });

    if (!toolId) {
      warning(`Failed to register tool for executable mod: ${newMod.name}`);
    }
    newMod.toolId = toolId || undefined;
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
  if (mod.toolId) {
    debug(`Removing linked tool for mod: ${mod.name}`);
    handleDeleteTool(mod.toolId, true);
    const window = getMainWindow();
    window?.webContents.send('invalidate-tool', mod.toolId);
  }

  saveProfiles(profiles);
  saveMods(newMods);
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
