import { execFile } from 'child_process';
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { logger } from '../utils/mainLogger';
import { getModEnginePath, loadMods, saveModEnginePath } from './db/api';
import { errToString } from '../utils/utilities';
import GenerateTomlString from './toml';
import { Octokit } from 'octokit';
import decompress from 'decompress';

const { debug, error } = logger;

const INSTALL_DIR = process.cwd();

export const launchEldenRingModded = () => {
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
};

const downloadModEngine2 = async (downloadURL: string, id: string) => {
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
    const path = `${INSTALL_DIR}\\ModEngine2\\${files.find((file) => file.includes('modengine2_launcher.exe'))}`;
    const folder = path.split('\\').slice(0, -1).join('\\');
    writeFileSync(`${folder}\\version.txt`, id);
  } catch (err) {
    const msg = `An error occured while saving Mod Engine version: ${errToString(err)}`;
    error(msg);
    throw new Error(msg);
  }
  debug('Mod Engine installed successfully');
};

export const checkForME2Updates = async () => {
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
      await downloadModEngine2(downloadURL, version);
    }
    files = readdirSync('./ModEngine2', { recursive: true }) as string[];
    const foundLauncher = files.find((file) => file.includes('modengine2_launcher.exe'));
    if (!foundLauncher) {
      debug('Mod Engine executable not found, attempting to aquire');
      rmSync(`./ModEngine2`, { recursive: true });
      await downloadModEngine2(downloadURL, version);
      files = readdirSync('./ModEngine2', { recursive: true }) as string[];
    }
    let versionPath = files.find((file) => file.includes('version.txt'));
    if (!versionPath) {
      debug('Mod Engine version file not found, attempting to download latest version');
      rmSync(`./ModEngine2`, { recursive: true });
      await downloadModEngine2(downloadURL, version);
      files = readdirSync('./ModEngine2', { recursive: true }) as string[];
      versionPath = files.find((file) => file.includes('version.txt'));
    }
    const currentVersion = readFileSync(`./ModEngine2/${versionPath}`).toString();
    if (currentVersion !== version) {
      debug('Mod Engine out of date, attempting to update');
      rmSync(`./ModEngine2`, { recursive: true });
      await downloadModEngine2(downloadURL, version);
    }
  } catch (err) {
    const msg = `An error occured while updating Mod Engine: ${errToString(err)}`;
    error(msg);
    throw new Error(msg);
  }
  debug('Mod Engine up to date');
  const path = `${INSTALL_DIR}\\ModEngine2\\${files.find((file) => file.includes('modengine2_launcher.exe'))}`;
  saveModEnginePath(path);
};
