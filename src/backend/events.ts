import tryCatch, { handleError } from './tryCatchHandler';
import { app, dialog, ipcMain, shell, OpenDialogOptions } from 'electron';
import { getModEnginePath, loadMods, saveModEnginePath, saveMods } from './db/api';
import { AddModFormValues, BrowseType, Mod } from 'types';
import { randomUUID } from 'crypto';
import { cpSync, existsSync, writeFileSync, readdirSync, readFileSync, rmSync } from 'fs';
import decompress from 'decompress';
import GenerateTomlString from './toml';
import { CreateModPathFromName } from '../util/utilities';
import { Octokit } from 'octokit';
import { execFile } from 'child_process';

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

const browse = tryCatch((type: BrowseType, title?: string, startingDir?: string) => {
  const options: OpenDialogOptions = {
    defaultPath: startingDir,
    properties: type === 'directory' ? ['openDirectory'] : ['openFile'],
    filters: getBrowseFilters(type),
  };
  const filePath = dialog.showOpenDialogSync(options)?.[0];
  if (!filePath) {
    throw new Error('Failed to select ' + type === 'directory' ? 'directory' : 'file');
  }
  return filePath;
});

const genUUID = (): string => {
  const uuid = randomUUID();
  const mods = loadMods();
  if (!mods) {
    throw new Error('Failed to load mods');
  }
  const existingUUIDs = mods.map((mod) => mod.uuid);
  return existingUUIDs?.includes(uuid) ? genUUID() : uuid;
};

function handleFile(fileType: 'exe' | 'dll', source: string) {
  const foundFiles: string[] = [];
  readdirSync(source, { recursive: true }).forEach((file) => {
    if (file.includes(`.${fileType}`) && typeof file === 'string') {
      foundFiles.push(file);
    }
  });
  if (foundFiles.length > 1) {
    const filePath = browse(fileType, `Select mod ${fileType}`, source);
    if (!filePath) {
      throw new Error('Failed to install mod');
    }
    const file = filePath.split('\\').pop();
    if (!file) {
      throw new Error('Failed to install mod');
    }
    return file;
  } else {
    return foundFiles[0];
  }
}

const handleAddMod = tryCatch(async (formData: AddModFormValues, fromZip: boolean) => {
  const mods = loadMods();
  if (!mods) {
    return false;
  }

  const newMod: Mod = {
    uuid: genUUID(),
    enabled: false,
    name: formData.modName,
    installDate: Date.now(),
    dllFile: undefined,
    exe: undefined,
  };

  let source = formData.path;
  let tempPath;

  if (fromZip) {
    tempPath = `${installDir}\\temp\\${newMod.uuid}`;
    await decompress(source, tempPath);
    const browseTarget: BrowseType = newMod.dllFile ? 'dll' : 'directory';
    const extractedPath = browse(browseTarget, undefined, tempPath);
    if (!extractedPath) {
      throw new Error('Failed to install mod');
    }
    source = extractedPath;
  }

  if (formData.hasExe) {
    newMod.exe = handleFile('exe', source);
  } else if (formData.isDll) {
    newMod.dllFile = handleFile('dll', source);
  }

  const pathName = CreateModPathFromName(newMod.name);
  const installPath = `${installDir}\\mods\\${pathName}\\`;

  if (existsSync(installPath)) {
    throw new Error('Mod already exists');
  }
  cpSync(source, installPath, {
    recursive: true,
  });

  if (tempPath) {
    rmSync(tempPath, { recursive: true });
  }

  if (formData.delete) {
    try {
      if (existsSync(formData.path)) {
        if (fromZip) {
          rmSync(formData.path);
        } else {
          rmSync(formData.path, { recursive: true });
        }
      }
    } catch (err) {
      handleError(err);
    }
  }

  const newMods = [...(mods as Mod[]), newMod];
  saveMods(newMods);
  return true;
});

const downloadModEngine = tryCatch(async (downloadURL: string, id: string) => {
  const response = await fetch(downloadURL);
  const buffer = await response.arrayBuffer();
  writeFileSync('./ModEngine2.zip', Buffer.from(buffer));
  await decompress('./ModEngine2.zip', './ModEngine2');
  rmSync('./ModEngine2.zip');
  const files = readdirSync('./ModEngine2', { recursive: true }) as string[];
  const path = `\\ModEngine2\\${files.find((file) => file.includes('modengine2_launcher.exe'))}`;
  const folder = path.split('\\').slice(0, -1).join('\\');
  writeFileSync(`${folder}\\version.txt`, id);
});

const checkForUpdates = tryCatch(async () => {
  const octokit = new Octokit();
  const release = await octokit.request('GET /repos/{owner}/{repo}/releases/latest', {
    owner: 'soulsmods',
    repo: 'ModEngine2',
  });
  const version = release.data.assets[0].id.toString();
  const downloadURL = release.data.assets[0].browser_download_url;

  const modEngineInstalled = existsSync('./ModEngine2');
  if (!modEngineInstalled) {
    await downloadModEngine(downloadURL, version);
  }
  let files = readdirSync('./ModEngine2', { recursive: true }) as string[];
  const foundLauncher = files.find((file) => file.includes('modengine2_launcher.exe'));
  if (!foundLauncher) {
    rmSync(`./ModEngine2`, { recursive: true });
    await downloadModEngine(downloadURL, version);
    files = readdirSync('./ModEngine2', { recursive: true }) as string[];
  }
  let versionPath = files.find((file) => file.includes('version.txt'));
  if (!versionPath) {
    rmSync(`./ModEngine2`, { recursive: true });
    await downloadModEngine(downloadURL, version);
    files = readdirSync('./ModEngine2', { recursive: true }) as string[];
    versionPath = files.find((file) => file.includes('version.txt'));
  }
  const currentVersion = readFileSync(`./ModEngine2/${versionPath}`).toString();
  if (currentVersion !== version) {
    rmSync(`./ModEngine2`, { recursive: true });
    await downloadModEngine(downloadURL, version);
  }
  const path = `${installDir}\\ModEngine2\\${files.find((file) => file.includes('modengine2_launcher.exe'))}`;
  saveModEnginePath(path);
});

app
  .whenReady()
  .then(async () => {
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
      const mods = loadMods();
      if (!mods) {
        return false;
      }
      const newMods = mods.filter((m) => m.uuid !== mod.uuid);
      const pathName = CreateModPathFromName(mod.name);
      const installPath = `./mods/${pathName}/`;
      if (!existsSync(installPath)) {
        throw new Error('Unable to remove mod: Mod not found');
      }
      rmSync(installPath, { recursive: true });
      saveMods(newMods);
      return true;
    });
    ipcMain.on('launch-game', (_, modded: boolean) => {
      console.log(modded);
      if (modded) {
        const mods = loadMods();
        if (!mods) {
          throw new Error('Failed to load mods');
        }
        const modEnginePath = getModEnginePath();
        if (!modEnginePath) {
          throw new Error('Failed to load mod engine path');
        }
        const modEngineFolder = modEnginePath?.split('\\').slice(0, -1).join('\\');
        const tomlString = GenerateTomlString(mods);
        writeFileSync(`${modEngineFolder}\\config_eldenring.toml`, tomlString);
        execFile('launchmod_eldenring.bat', { cwd: modEngineFolder });
      } else {
        shell.openExternal('steam://rungameid/1245620').catch(console.error);
      }
    });

    ipcMain.on('launch-mod-exe', (_, mod: Mod) => {
      shell.openPath(`${installDir}\\mods\\${CreateModPathFromName(mod.name)}\\${mod.exe}`);
    });

    checkForUpdates();
  })
  .catch(console.error);
