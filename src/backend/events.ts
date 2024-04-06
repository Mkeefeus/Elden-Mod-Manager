import tryCatch, { handleError } from './tryCatchHandler';
import { app, dialog, ipcMain, shell, OpenDialogOptions } from 'electron';
import { getModEnginePath, loadMods, saveModEnginePath, saveMods } from './db/api';
import { AddModFormValues, Mod } from 'types';
import { randomUUID } from 'crypto';
import { cpSync, existsSync, writeFileSync, readdirSync, readFileSync, rmSync } from 'fs';
import decompress from 'decompress';
import GenerateTomlString from './toml';
import { CreateModPathFromName } from '../util/utilities';
import { Octokit } from 'octokit';
import { exec, execFile, spawn } from 'child_process';

const browseForMod = tryCatch((fromZip: boolean) => {
  const options: OpenDialogOptions = fromZip
    ? { properties: ['openFile'], filters: [{ name: 'Compressed Files', extensions: ['zip'] }] }
    : { properties: ['openDirectory'] };
  const filePath = dialog.showOpenDialogSync(options)?.[0];
  return filePath || false;
});

const browseForExe = tryCatch(() => {
  const options: OpenDialogOptions = {
    properties: ['openFile'],
    filters: [{ name: 'Executable Files', extensions: ['exe'] }],
  };
  const filePath = dialog.showOpenDialogSync(options)?.[0];
  return filePath || false;
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

const installMod = tryCatch(async (source: string, mod: Mod, fromZip: boolean) => {
  // const installPath = `./mods/${mod.uuid}/`;
  // const pathName = mod.name.replace(/\s/g, '-').toLowerCase();
  const pathName = CreateModPathFromName(mod.name);
  console.log(fromZip, pathName);
  const installPath = `./mods/${pathName}/`;
  if (existsSync(installPath)) {
    return false;
  }
  if (fromZip) {
    await decompress(source, installPath);
  } else
    cpSync(source, installPath, {
      recursive: true,
    });
});

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
    isDll: formData.isDll,
  };

  try {
    await installMod(formData.path, newMod, fromZip);
  } catch (err) {
    handleError(err);
    return false;
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
  const path = `.\\ModEngine2\\${files.find((file) => file.includes('modengine2_launcher.exe'))}`;
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
    console.log('missing modengine2 folder');
    await downloadModEngine(downloadURL, version);
  }
  let files = readdirSync('./ModEngine2', { recursive: true }) as string[];
  const foundLauncher = files.find((file) => file.includes('modengine2_launcher.exe'));
  if (!foundLauncher) {
    console.log('missing launcher');
    rmSync(`./ModEngine2`, { recursive: true });
    await downloadModEngine(downloadURL, version);
    files = readdirSync('./ModEngine2', { recursive: true }) as string[];
  }
  let versionPath = files.find((file) => file.includes('version.txt'));
  if (!versionPath) {
    console.log('missing version');
    rmSync(`./ModEngine2`, { recursive: true });
    await downloadModEngine(downloadURL, version);
    files = readdirSync('./ModEngine2', { recursive: true }) as string[];
    versionPath = files.find((file) => file.includes('version.txt'));
  }
  const currentVersion = readFileSync(`./ModEngine2/${versionPath}`).toString();
  if (currentVersion !== version) {
    console.log('outdated');
    rmSync(`./ModEngine2`, { recursive: true });
    await downloadModEngine(downloadURL, version);
  }
  console.log('up to date');
  const path = `.\\ModEngine2\\${files.find((file) => file.includes('modengine2_launcher.exe'))}`;
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
    ipcMain.handle('browse-mod', (_, fromZip: boolean) => browseForMod(fromZip));
    ipcMain.handle('browse-exe', browseForExe);
    ipcMain.handle('add-mod', (_, formData: AddModFormValues, fromZip: boolean) => {
      return handleAddMod(formData, fromZip);
    });
    ipcMain.handle('launch-game', (_, modded: boolean) => {
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
        // writeFileSync(`${modEngineFolder}\\config_eldenring.toml`, tomlString);
        const execString = 'launchmod_eldenring.bat'
        console.log(execString, modEngineFolder);
        // exec(`"${modEnginePath}" -t er -c .\\config_eldenring.toml`);
        execFile(execString, {cwd: modEngineFolder});
      } else {
        shell.openExternal('steam://rungameid/1245620').catch(console.error);
      }
    });

    checkForUpdates();
  })
  .catch(console.error);
