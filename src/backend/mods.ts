import { readdirSync, existsSync, cpSync, rmSync, renameSync } from 'fs';
import { basename, extname, join } from 'path';
import { errToString, CreateModPathFromName, generateUUID } from '@utils/utilities';
import { AddModFormValues, EditModFormValues, Mod } from 'types';
import { logger } from '@utils/mainLogger';
import {
  getModsFolder,
  getProfiles,
  getTools,
  loadMods,
  saveMods,
  saveProfiles,
  saveTools,
  setModsFolder,
} from './db/api';
import { handleAddTool, handleDeleteTool } from './tools';
import { safeRemove } from './downloadManager';
import { getMainWindow } from '~/main';

const { debug, error, warning } = logger;

const normalizeOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;

  const trimmedValue = value.trim();
  return trimmedValue || undefined;
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
    throw new Error(msg, { cause: err });
  }
  let hasDll;
  if (isDll) {
    debug('Mod is dll');
    hasDll = files.some((file) => extname(file) === '.dll');
    if (!hasDll) {
      const msg = 'No DLL file was found in the directory, please select the folder that contains the mod DLL file.';
      warning(msg);
      return false;
    }
  }
  return true;
};

export const handleAddMod = async (formData: AddModFormValues) => {
  const mods = loadMods();
  const uuid = generateUUID(mods.map((mod) => mod.uuid));
  const dllFileName = formData.isDll && formData.dllPath ? formData.dllPath.split(/[/\\]/).pop() : undefined;
  const exeFileName = formData.hasTool && formData.exePath ? formData.exePath.split(/[/\\]/).pop() : undefined;
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

  if (!validateMod(source, !!newMod.dllFile)) {
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
        await safeRemove(formData.path);
        debug('Mod source deleted');
      } catch (err) {
        // Non-fatal: the mod was already copied successfully, so just log and move on.
        error(`An error occured while deleting mod source: ${errToString(err)}`);
      }
    }
  }

  if (newMod.exe) {
    const executablePath = join(installPath, newMod.exe);
    const toolId = handleAddTool(
      {
        name: newMod.name,
        version: newMod.version || '',
        path: executablePath,
        copy: false,
        deleteSource: false,
      },
      newMod.uuid
    );

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

export const handleDeleteMod = async (mod: Mod) => {
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
      await safeRemove(installPath);
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

export const getModInstallPath = (mod: Pick<Mod, 'name' | 'version'>) =>
  join(getModsFolder(), CreateModPathFromName(mod.name, mod.version));

// Mod.dllFile/exe are bare filenames resolved against the mod's install directory, matching handleAddMod.
// The picked value may be a bare filename (from an auto-scan) or a full path (from the file browser) — only
// the basename is kept, mirroring how the Add Mod form already handles its own dll/exe pickers.
const resolvePickedFile = (installPath: string, pickedPath: string, label: string) => {
  const fileName = basename(pickedPath);
  if (!existsSync(join(installPath, fileName))) {
    const msg = `${label} not found in the mod's folder: ${fileName}`;
    error(msg);
    throw new Error(msg);
  }
  return fileName;
};

export const handleEditMod = (mod: Mod, formData: EditModFormValues): boolean => {
  debug(`Editing mod: ${mod.name}`);
  const mods = loadMods();
  const modIndex = mods.findIndex((m) => m.uuid === mod.uuid);
  if (modIndex === -1) {
    const msg = `Mod with UUID ${mod.uuid} not found`;
    error(msg);
    throw new Error(msg);
  }

  const newName = normalizeOptionalString(formData.name);
  if (!newName) {
    const msg = 'Mod name is required';
    warning(msg);
    throw new Error(msg);
  }
  const newVersion = normalizeOptionalString(formData.version);

  const oldPathName = CreateModPathFromName(mod.name, mod.version);
  const newPathName = CreateModPathFromName(newName, newVersion);
  const modsFolder = getModsFolder();
  const oldInstallPath = join(modsFolder, oldPathName);
  const newInstallPath = join(modsFolder, newPathName);

  const isRenaming = oldPathName !== newPathName;
  if (isRenaming) {
    if (!existsSync(oldInstallPath)) {
      const msg = `Mod folder not found: ${oldInstallPath}`;
      error(msg);
      throw new Error(msg);
    }
    if (existsSync(newInstallPath)) {
      const msg = 'A mod with this name and version already exists';
      warning(msg);
      throw new Error(msg);
    }
  }

  // Resolve/validate picked files against the folder's current (pre-rename) location — the file browser was
  // pointed there, and this must happen before any rename so a validation failure never leaves the mod folder
  // renamed on disk while the DB record (and its old-name-derived path) is left out of sync.
  let newDllFile: string | undefined;
  if (formData.isDll) {
    if (formData.dllPath) {
      newDllFile = resolvePickedFile(oldInstallPath, formData.dllPath, 'DLL file');
    } else if (mod.dllFile) {
      newDllFile = mod.dllFile;
    } else {
      const msg = 'DLL file is required';
      warning(msg);
      throw new Error(msg);
    }
  }
  // Advanced DLL loading hooks only make sense while the mod stays native; clear them if DLL support is turned off.
  const wasDllTurnedOff = mod.dllFile && !formData.isDll;

  let newExe: string | undefined;
  if (formData.hasTool) {
    if (formData.exePath) {
      newExe = resolvePickedFile(oldInstallPath, formData.exePath, 'Executable');
    } else if (mod.exe) {
      newExe = mod.exe;
    } else {
      const msg = 'Executable is required';
      warning(msg);
      throw new Error(msg);
    }
  }

  // All validation has passed — safe to rename the folder now, then finish up using the new location.
  if (isRenaming) {
    debug(`Renaming mod folder from ${oldInstallPath} to ${newInstallPath}`);
    try {
      renameSync(oldInstallPath, newInstallPath);
    } catch (err) {
      const msg = `An error occured while renaming mod folder: ${errToString(err)}`;
      error(msg);
      throw new Error(msg, { cause: err });
    }
  }

  let newToolId = mod.toolId;
  if (formData.hasTool) {
    const toolName = normalizeOptionalString(formData.toolName) || newName;
    const toolVersion = normalizeOptionalString(formData.toolVersion) ?? newVersion;
    const executablePath = join(newInstallPath, newExe as string);

    if (mod.toolId) {
      const tools = getTools();
      const toolIndex = tools.findIndex((tool) => tool.id === mod.toolId);
      if (toolIndex !== -1) {
        tools[toolIndex] = { ...tools[toolIndex], name: toolName, version: toolVersion, executablePath };
        saveTools(tools);
      }
    } else {
      const createdToolId = handleAddTool(
        { name: toolName, version: toolVersion || '', path: executablePath, copy: false, deleteSource: false },
        mod.uuid
      );
      if (!createdToolId) {
        const msg = 'Failed to create tool for mod executable';
        error(msg);
        throw new Error(msg);
      }
      newToolId = createdToolId;
    }
  } else if (mod.toolId) {
    // The tool was auto-created for this mod's executable, so turning off "has tool" removes it entirely
    // rather than just unlinking (its files live inside the mod's own folder, same as handleDeleteMod).
    handleDeleteTool(mod.toolId, true, false);
    newToolId = undefined;
  }

  const updatedMod: Mod = {
    ...mods[modIndex],
    name: newName,
    version: newVersion,
    dllFile: newDllFile,
    loadEarly: wasDllTurnedOff ? undefined : mods[modIndex].loadEarly,
    finalizer: wasDllTurnedOff ? undefined : mods[modIndex].finalizer,
    initializer: wasDllTurnedOff ? undefined : mods[modIndex].initializer,
    exe: newExe,
    toolId: newToolId,
  };
  mods[modIndex] = updatedMod;
  saveMods(mods);
  debug('Mod edited successfully');
  return true;
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
