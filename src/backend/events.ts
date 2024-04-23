import { app, dialog, ipcMain, shell, OpenDialogOptions } from 'electron';
import { getModEnginePath, loadMods, saveModEnginePath, saveMods } from './db/api';
import { AddModFormValues, BrowseType, LogObject, Mod } from 'types';
import { randomUUID } from 'crypto';
import { cpSync, existsSync, writeFileSync, readdirSync, readFileSync, rmSync } from 'fs';
import decompress from 'decompress';
import GenerateTomlString from './toml';
import { CreateModPathFromName, errToString } from '../utils/utilities';
import { Octokit } from 'octokit';
import { execFile } from 'child_process';
import { handleLog, logger } from '../utils/mainLogger';

const { debug, error, warn } = logger;

const installDir = process.cwd();

const getBrowseFilters = (type: BrowseType) => {
  switch (type) {
    case 'zip':
      return [{ name: 'Zip Files', extensions: ['zip'] }];
    case 'dll':
      return [{ name: 'Dynamic Link Libraries', extensions: ['dll'] }];
    case 'exe':
      return [{ name: 'Executable Files', extensions: ['exe'] }];
    default:
      return undefined;
  }
};

const browse = (type: BrowseType, title?: string, startingDir?: string) => {
  debug(`Browsing for ${type} ${startingDir ? `starting at: ${startingDir}` : ''}`);
  const options: OpenDialogOptions = {
    defaultPath: startingDir,
    properties: type === 'directory' ? ['openDirectory'] : ['openFile'],
    title: title,
    filters: getBrowseFilters(type),
  };
  try {
    const filePath = dialog.showOpenDialogSync(options)?.[0];
    return filePath;
  } catch (err) {
    const msg = `An error occured while browsing for ${type}: ${errToString(err)}`;
    error(msg);
    throw new Error(msg);
  }
};

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

function findFile(fileType: 'exe' | 'dll', source: string) {
  debug(`Searching for ${fileType} file in ${source}`);
  let foundFiles: (string | Buffer)[];
  try {
    foundFiles = readdirSync(source, { recursive: true }).filter((file) => {
      return file.includes(`.${fileType}`) && typeof file === 'string';
    });
  } catch (err) {
    const msg = `An error occured while searching for ${fileType} file: ${errToString(err)}`;
    error(msg);
    throw new Error(msg);
  }
  if (foundFiles.length > 1) {
    debug(`Multiple ${fileType} files found, prompting user to select one`);
    const filePath = browse(fileType, `Select mod ${fileType}`, source);
    if (!filePath) {
      const msg = 'Failed to select file from user';
      error(msg);
      throw new Error(msg);
    }
    debug(`User selected ${fileType} file: ${filePath}`);
    const file = filePath.split('\\').pop();
    if (!file) {
      const msg = 'Failed to Determine filename';
      error(msg);
      throw new Error(msg);
    }
    debug(`Returning selected ${fileType} file: ${file}`);
    return file;
  } else if (foundFiles.length === 1 && typeof foundFiles[0] === 'string') {
    debug(`Single ${fileType} file found: ${foundFiles[0]}`);
    return foundFiles[0];
  } else {
    const msg = 'Failed to locate file';
    error(msg);
    throw new Error(msg);
  }
}

const handleAddMod = async (formData: AddModFormValues, fromZip: boolean) => {
  const mods = loadMods();
  const uuid = genUUID();
  const newMod: Mod = {
    uuid: uuid,
    enabled: false,
    name: formData.modName,
    installDate: Date.now(),
    dllFile: undefined,
    exe: undefined,
  };
  debug(`Adding new mod: ${JSON.stringify(newMod)}`);

  let source = formData.path;
  let tempPath;

  if (fromZip) {
    tempPath = `${installDir}\\temp\\${newMod.uuid}`;
    try {
      debug(`Extracting zip to temp directory: ${tempPath} from ${source}`);
      await decompress(source, tempPath);
    } catch (err) {
      const msg = `An error occured while extracting zip: ${errToString(err)}`;
      error(msg);
      throw new Error(msg);
    }
    const browseTarget: BrowseType = newMod.dllFile ? 'dll' : 'directory';
    const extractedPath = browse(browseTarget, undefined, tempPath);
    if (!extractedPath) {
      return;
    }
    source = extractedPath;
  }

  if (formData.hasExe) {
    debug('Mod has exe');
    newMod.exe = findFile('exe', source);
  } else if (formData.isDll) {
    debug('Mod is dll');
    newMod.dllFile = findFile('dll', source);
  }

  const pathName = CreateModPathFromName(newMod.name);
  const installPath = `${installDir}\\mods\\${pathName}\\`;
  debug(`Installing mod to: ${installPath}`);

  if (existsSync(installPath)) {
    const msg = 'Mod path already exists';
    warn(msg);
    // throw new Error(msg);
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
      warn(msg);
      // throw new Error(msg);
    }
  }

  if (formData.delete) {
    debug(`Deleting mod source: ${formData.path}`);
    if (existsSync(formData.path)) {
      try {
        if (fromZip) {
          rmSync(formData.path);
        } else {
          rmSync(formData.path, { recursive: true });
        }
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

const downloadModEngine = async (downloadURL: string, id: string) => {
  try {
    debug(`Downloading Mod Engine release from: ${downloadURL}`);
    const response = await fetch(downloadURL);
    const buffer = await response.arrayBuffer();
    writeFileSync('./ModEngine2.zip', Buffer.from(buffer));
  } catch (err) {
    const msg = `An error occured while downloading Mod Engine release: ${errToString(err)}`;
    error(msg);
    throw new Error(msg);
  }
  try {
    debug('Decompressing Mod Engine release');
    await decompress('./ModEngine2.zip', './ModEngine2');
  } catch (err) {
    const msg = `An error occured while decompressing Mod Engine release: ${errToString(err)}`;
    error(msg);
    throw new Error(msg);
  }
  try {
    debug('Removing Mod Engine zip');
    rmSync('./ModEngine2.zip');
  } catch (err) {
    const msg = `An error occured while removing Mod Engine zip: ${errToString(err)}`;
    error(msg);
    throw new Error(msg);
  }
  try {
    debug('Saving Mod Engine version');
    const files = readdirSync('./ModEngine2', { recursive: true }) as string[];
    const path = `\\ModEngine2\\${files.find((file) => file.includes('modengine2_launcher.exe'))}`;
    const folder = path.split('\\').slice(0, -1).join('\\');
    writeFileSync(`${folder}\\version.txt`, id);
  } catch (err) {
    const msg = `An error occured while saving Mod Engine version: ${errToString(err)}`;
    error(msg);
    throw new Error(msg);
  }
  debug('Mod Engine installed successfully');
};

const checkForUpdates = async () => {
  debug('Checking for Mod Engine updates');
  let downloadURL: string;
  let version: string;
  try {
    const octokit = new Octokit();
    const release = await octokit.request('GET /repos/{owner}/{repo}/releases/latest', {
      owner: 'soulsmods',
      repo: 'ModEngine2',
    });
    version = release.data.assets[0].id.toString();
    debug(`Latest Mod Engine version: ${version}`);
    downloadURL = release.data.assets[0].browser_download_url;
  } catch (err) {
    const msg = `An error occured while checking for Mod Engine updates: ${errToString(err)}`;
    error(msg);
    throw new Error(msg);
  }

  let files: (string | Buffer)[];
  try {
    const modEngineInstalled = existsSync('./ModEngine2');
    if (!modEngineInstalled) {
      debug('Mod Engine folder not found, attempting to aquire');
      await downloadModEngine(downloadURL, version);
    }
    files = readdirSync('./ModEngine2', { recursive: true }) as string[];
    const foundLauncher = files.find((file) => file.includes('modengine2_launcher.exe'));
    if (!foundLauncher) {
      debug('Mod Engine executable not found, attempting to aquire');
      rmSync(`./ModEngine2`, { recursive: true });
      await downloadModEngine(downloadURL, version);
      files = readdirSync('./ModEngine2', { recursive: true }) as string[];
    }
    let versionPath = files.find((file) => file.includes('version.txt'));
    if (!versionPath) {
      debug('Mod Engine version file not found, attempting to download latest version');
      rmSync(`./ModEngine2`, { recursive: true });
      await downloadModEngine(downloadURL, version);
      files = readdirSync('./ModEngine2', { recursive: true }) as string[];
      versionPath = files.find((file) => file.includes('version.txt'));
    }
    const currentVersion = readFileSync(`./ModEngine2/${versionPath}`).toString();
    if (currentVersion !== version) {
      debug('Mod Engine out of date, attempting to update');
      rmSync(`./ModEngine2`, { recursive: true });
      await downloadModEngine(downloadURL, version);
    }
  } catch (err) {
    const msg = `An error occured while updating Mod Engine: ${errToString(err)}`;
    error(msg);
    throw new Error(msg);
  }
  debug('Mod Engine up to date');
  const path = `${installDir}\\ModEngine2\\${files.find((file) => file.includes('modengine2_launcher.exe'))}`;
  saveModEnginePath(path);
};

app
  .whenReady()
  .then(async () => {
    debug('Registering IPC events');
    ipcMain.on('open-external-link', (_, href: string) => {
      shell.openExternal(href).catch(console.error);
    });
    ipcMain.handle('load-mods', loadMods);
    ipcMain.handle('set-mods', (_, mods: Mod[]) => saveMods(mods));
    ipcMain.handle('browse', (_, type: BrowseType, title?: string, startingDir?: string) =>
      browse(type, title, startingDir)
    );
    ipcMain.handle('add-mod', (_, formData: AddModFormValues, fromZip: boolean) => {
      return handleAddMod(formData, fromZip);
    });
    ipcMain.handle('delete-mod', (_, mod: Mod) => {
      debug(`Deleting mod: ${mod.name}`);
      const mods = loadMods();
      if (!mods) {
        return false;
      }
      const newMods = mods.filter((m) => m.uuid !== mod.uuid);
      const pathName = CreateModPathFromName(mod.name);
      debug(`Removing mod from: ${pathName}`);
      try {
        const installPath = `./mods/${pathName}/`;
        if (!existsSync(installPath)) {
          throw new Error('Unable to remove mod: Mod not found');
        }
        rmSync(installPath, { recursive: true });
      } catch (err) {
        const msg = `An error occured while deleting mod: ${errToString(err)}`;
        error(msg);
        throw new Error(msg);
      }
      debug('Mod deleted successfully');
      saveMods(newMods);
      return true;
    });
    ipcMain.on('launch-game', (_, modded: boolean) => {
      if (modded) {
        debug('Starting modded launch sequence');
        const mods = loadMods();
        const modEnginePath = getModEnginePath();
        const modEngineFolder = modEnginePath?.split('\\').slice(0, -1).join('\\');
        const tomlString = GenerateTomlString(mods);
        try {
          debug('Writing toml file');
          writeFileSync;
          writeFileSync(`${modEngineFolder}\\config_eldenring.toml`, tomlString);
        } catch (err) {
          const msg = `An error occured while writing toml file: ${errToString(err)}`;
          error(msg);
          throw new Error(msg);
        }
        debug('Launching game with mods');
        try {
          execFile('launchmod_eldenring.bat', { cwd: modEngineFolder });
        } catch (err) {
          const msg = `An error occured while launching game with mods: ${errToString(err)}`;
          error(msg);
          throw new Error(msg);
        }
      } else {
        debug('Launching game without mods');
        try {
          shell.openExternal('steam://rungameid/1245620').catch(console.error);
        } catch (err) {
          const msg = `An error occured while launching game without mods: ${errToString(err)}`;
          error(msg);
          throw new Error(msg);
        }
      }
    });

    ipcMain.on('launch-mod-exe', (_, mod: Mod) => {
      debug(`Launching mod executable: ${mod.exe}`);
      try {
        shell.openPath(`${installDir}\\mods\\${CreateModPathFromName(mod.name)}\\${mod.exe}`);
      } catch (err) {
        const msg = `An error occured while launching mod executable: ${errToString(err)}`;
        error(msg);
        throw new Error(msg);
      }
    });

    ipcMain.on('log', (_, log: LogObject) => {
      handleLog(log);
    });

    checkForUpdates();
    debug('App started');
  })
  .catch((err) => {
    error(`An error occured while starting app: ${errToString(err)}`);
  });
process;
