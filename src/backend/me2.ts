import { execFile } from 'child_process';
import { existsSync, readdirSync, renameSync, rmSync, writeFileSync } from 'fs';
import { logger } from '../utils/mainLogger';
import { getModEnginePath, loadMods, setModEnginePath } from './db/api';
import { errToString } from '../utils/utilities';
import { Octokit } from 'octokit';
import decompress from 'decompress';
import { writeTomlFile } from './toml';
import { getMainWindow } from '../main';
import { app } from 'electron';

const { debug, warning, error } = logger;

export const launchEldenRingModded = () => {
  const modEnginePath = getModEnginePath();
  debug('Launching game with mods');
  try {
    execFile('launchmod_eldenring.bat', { cwd: modEnginePath });
  } catch (err) {
    const msg = `An error occured while launching game with mods: ${errToString(err)}`;
    error(msg);
    throw new Error(msg);
  }
};

export const downloadModEngine2 = async () => {
  debug('Checking for Mod Engine updates');
  let downloadURL: string;
  let version: string;
  const tempDir = app.getPath('temp');
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
    const msg = `An error occured while getting ModEngine2 download url: ${errToString(err)}`;
    error(msg);
    throw new Error(msg);
  }
  let modEnginePath: string;
  try {
    debug(`Downloading Mod Engine release from: ${downloadURL}`);
    modEnginePath = getModEnginePath();
    if (!modEnginePath) {
      throw new Error('Mod Engine path not found');
    }
    debug(`ModEngine2 Path: ${modEnginePath}`);
    if (existsSync(modEnginePath)) {
      debug('Mod Engine folder found, removing');
      rmSync(modEnginePath, { recursive: true });
    }
    const response = await fetch(downloadURL);
    const buffer = await response.arrayBuffer();
    writeFileSync(`${tempDir}\\ModEngine2.zip`, Buffer.from(buffer));
  } catch (err) {
    const msg = `An error occured while downloading Mod Engine release: ${errToString(err)}`;
    error(msg);
    throw new Error(msg);
  }
  try {
    debug(`Decompressing Mod Engine release to ${modEnginePath}`);
    await decompress(`${tempDir}\\ModEngine2.zip`, modEnginePath);
  } catch (err) {
    const msg = `An error occured while decompressing Mod Engine release: ${errToString(err)}`;
    error(msg);
    throw new Error(msg);
  }
  try {
    debug('Removing Mod Engine zip');
    rmSync(`${tempDir}\\ModEngine2.zip`);
  } catch (err) {
    const msg = `An error occured while removing Mod Engine zip: ${errToString(err)}`;
    error(msg);
    throw new Error(msg);
  }
  try {
    debug('Cleaning Mod Engine folder');
    const files = ['config_eldenring.toml', 'modengine2_launcher.exe', 'launchmod_eldenring.bat', 'modengine2'];
    const folderContents = readdirSync(modEnginePath) as string[];
    const subfolder = folderContents.find((file) => file.toLowerCase().includes('modengine'));
    const subfolderContents = readdirSync(`${modEnginePath}/${subfolder}`) as string[];
    subfolderContents.forEach((file) => {
      if (files.includes(file)) {
        const newPath = `${modEnginePath}/${file}`;
        renameSync(`${modEnginePath}/${subfolder}/${file}`, newPath);
      }
    });
    rmSync(`${modEnginePath}/${subfolder}`, { recursive: true });
  } catch (err) {
    const msg = `An error occured while cleaning Mod Engine folder: ${errToString(err)}`;
    error(msg);
    throw new Error(msg);
  }
  try {
    debug('Updating Mod Engine toml file');
    const mods = loadMods();
    writeTomlFile(mods);
  } catch (err) {
    const msg = `An error occured while updating Mod Engine toml file during ME2 installation: ${errToString(err)}`;
    error(msg);
    throw new Error(msg);
  }
  debug('Mod Engine installed successfully');
};

export const promptME2Install = async () => {
  debug('Prompting user to install Mod Engine');
  try {
    const window = getMainWindow();
    if (!window) {
      throw new Error('Main window not found');
    }
    window.webContents.send('prompt-me2-install');
  } catch (err) {
    const msg = `An error occured while prompting user to install Mod Engine: ${errToString(err)}`;
    error(msg);
    throw new Error(msg);
  }
};

export const updateME2Path = (newPath: string) => {
  debug(`Updating ME2 path to: ${newPath}`);
  try {
    const currentPath = getModEnginePath();
    if (currentPath === newPath) {
      debug('ME2 path unchanged');
      return;
    }
    if (readdirSync(newPath).length > 0) {
      warning('Destination path is not empty, please select an empty folder');
      return;
    }
    if (!existsSync(currentPath)) {
      throw new Error('Current ME2 path not found');
    }
    const contents = readdirSync(currentPath);
    debug(`Moving ME2 contents to: ${newPath}`);
    contents.forEach((file) => {
      debug(`Moving: ${file}`);
      renameSync(`${currentPath}/${file}`, `${newPath}/${file}`);
    });
    debug('Removing old ME2 path');
    rmSync(currentPath, { recursive: true });
    debug('Updating ME2 path in database');
    setModEnginePath(newPath);
    debug(`ME2 path updated to: ${newPath}`);
  } catch (err) {
    const msg = `An error occured while updating ME2 path: ${errToString(err)}`;
    error(msg);
    throw new Error(msg);
  }
};
