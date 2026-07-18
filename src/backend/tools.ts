import { Tool } from 'types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { getTools, saveTools } from './db/api';
import { generateUUID } from '~/utils/utilities';
import { logger } from '~/utils/mainLogger';
import { getEldenRingInstallDir } from './steam';
import { shell } from 'electron';

const { info, error, debug } = logger;

const STEAM_APP_ID = '1245620';

const getSteamClientCandidates = () => {
  const homeDir = process.env.HOME || os.homedir();
  const envClientPath = process.env.STEAM_COMPAT_CLIENT_INSTALL_PATH;
  const flatpakRoot = path.join(homeDir, '.var', 'app', 'com.valvesoftware.Steam');

  const candidates = [
    envClientPath,
    path.join(homeDir, '.steam', 'steam'),
    path.join(homeDir, '.steam', 'Steam'),
    path.join(homeDir, '.local', 'share', 'Steam'),
    path.join(flatpakRoot, '.local', 'share', 'Steam'),
    path.join(flatpakRoot, '.steam', 'steam'),
    path.join(flatpakRoot, '.steam', 'Steam'),
  ].filter((candidate): candidate is string => Boolean(candidate));

  return [...new Set(candidates)].filter((candidate) => fs.existsSync(path.join(candidate, 'steamapps')));
};

const getLibraryRootFromGameDir = (eldenRingInstallDir: string) => {
  const gameDirParts = path.normalize(eldenRingInstallDir).split(path.sep).filter(Boolean);
  const steamappsIndex = gameDirParts.lastIndexOf('steamapps');
  if (steamappsIndex === -1) {
    return '';
  }

  const rootParts = gameDirParts.slice(0, steamappsIndex);
  if (path.isAbsolute(eldenRingInstallDir)) {
    return path.join(path.sep, ...rootParts);
  }
  return path.join(...rootParts);
};

const resolveCompatDataPath = (eldenRingInstallDir: string, steamClientPaths: string[]) => {
  const explicitCompatPath = process.env.STEAM_COMPAT_DATA_PATH;
  const candidates = [
    explicitCompatPath,
    path.join(getLibraryRootFromGameDir(eldenRingInstallDir), 'steamapps', 'compatdata', STEAM_APP_ID),
    ...steamClientPaths.map((clientPath) => path.join(clientPath, 'steamapps', 'compatdata', STEAM_APP_ID)),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const compatPath of candidates) {
    if (fs.existsSync(path.join(compatPath, 'version'))) {
      return compatPath;
    }
  }

  return '';
};

const resolveProtonRoot = (steamClientPaths: string[], protonVersion: string) => {
  if (protonVersion.startsWith('GE-Proton') || protonVersion.startsWith('Proton-GE')) {
    for (const steamClientPath of steamClientPaths) {
      const gePath = path.join(steamClientPath, 'compatibilitytools.d', protonVersion);
      if (fs.existsSync(path.join(gePath, 'proton'))) {
        return gePath;
      }
    }
    return '';
  }

  for (const steamClientPath of steamClientPaths) {
    const steamCommonPath = path.join(steamClientPath, 'steamapps', 'common');
    if (!fs.existsSync(steamCommonPath)) {
      continue;
    }

    for (const entry of fs.readdirSync(steamCommonPath, { withFileTypes: true })) {
      if (!entry.isDirectory() || !entry.name.startsWith('Proton')) {
        continue;
      }

      const protonDir = path.join(steamCommonPath, entry.name);
      const protonScriptPath = path.join(protonDir, 'proton');
      if (!fs.existsSync(protonScriptPath)) {
        continue;
      }

      const protonScript = fs.readFileSync(protonScriptPath, 'utf8');
      if (protonScript.includes(`CURRENT_PREFIX_VERSION="${protonVersion}"`)) {
        return protonDir;
      }
    }
  }

  return '';
};

const launchToolViaProton = (executablePath: string) => {
  const steamClientPaths = getSteamClientCandidates();
  const steamCompatClientInstallPath = steamClientPaths[0] || '';
  const eldenRingInstallDir = getEldenRingInstallDir();
  if (!eldenRingInstallDir) {
    const msg = 'Elden Ring installation directory not found. Please ensure the game is installed via Steam.';
    error(msg);
    throw new Error(msg);
  }

  const steamCompatDataPath = resolveCompatDataPath(eldenRingInstallDir, steamClientPaths);
  if (!steamCompatDataPath) {
    const msg = `Could not locate compatdata for app ${STEAM_APP_ID} in standard or Flatpak Steam locations.`;
    error(msg);
    throw new Error(msg);
  }

  const protonVersionFile = path.join(steamCompatDataPath, 'version');
  const protonVersion = fs.readFileSync(protonVersionFile, 'utf8').trim();
  const protonRoot = resolveProtonRoot(steamClientPaths, protonVersion);
  const protonExecutable = path.join(protonRoot, 'proton');

  if (!protonRoot || !fs.existsSync(protonExecutable)) {
    throw new Error(`Could not find Proton installation for version ${protonVersion}`);
  }

  debug(`Using compatdata path: ${steamCompatDataPath}`);
  debug(`Using Proton root: ${protonRoot}`);

  const env = { ...process.env };
  delete env.DOTNET_ROOT;
  delete env.DOTNET_ROOT_X64;
  delete env.DOTNET_ROOT_X86;
  delete env.DOTNET_MULTILEVEL_LOOKUP;
  if (steamCompatClientInstallPath) {
    env.STEAM_COMPAT_CLIENT_INSTALL_PATH = steamCompatClientInstallPath;
  }
  env.STEAM_COMPAT_DATA_PATH = steamCompatDataPath;
  env.ELDEN_RING_INSTALL_DIR = eldenRingInstallDir;

  const executableDir = path.dirname(executablePath);
  const executableName = path.basename(executablePath);
  const child = spawn(protonExecutable, ['runinprefix', `./${executableName}`], {
    cwd: executableDir,
    env,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
};

export const handleAddTool = (toolData: Partial<Tool>): string | false => {
  try {
    if (!toolData.name || !toolData.executablePath) {
      const msg = 'Tool must have a name and executable path';
      error(msg);
      throw new Error(msg);
    }
    if (!fs.existsSync(toolData.executablePath)) {
      const msg = `Executable path does not exist: ${toolData.executablePath}`;
      error(msg);
      throw new Error(msg);
    }
    const tools = getTools();
    const newTool: Tool = {
      name: toolData.name,
      executablePath: toolData.executablePath,
      version: toolData.version || undefined,
      id: generateUUID(tools.map((tool) => tool.id)),
      modUuid: toolData.modUuid || undefined,
      installDate: Date.now(),
    };
    tools.push(newTool);
    saveTools(tools);
    info(`Added new tool: ${newTool.name} at ${newTool.executablePath}`);
    return newTool.id;
  } catch (err) {
    const msg = `An error occurred while adding tool: ${err instanceof Error ? err.message : String(err)}`;
    error(msg);
    return false;
  }
};

export const handleDeleteTool = (toolId: string, force = false) => {
  const tools = getTools();
  const toolIndex = tools.findIndex((tool) => tool.id === toolId);
  const toolToDelete = tools[toolIndex];
  if (toolIndex === -1) {
    throw new Error(`Tool with ID ${toolId} not found`);
  }
  if (toolToDelete.modUuid && !force) {
    const msg = `Cannot delete tool ${toolToDelete.name} (ID: ${toolId}) because it is associated with a mod`;
    error(msg);
    throw new Error(msg);
  }
  tools.splice(toolIndex, 1);
  saveTools(tools);
  info(`Deleted tool: ${toolToDelete.name}`);
};

export const handleEditTool = (toolId: string, updatedData: Partial<Tool>) => {
  const tools = getTools();
  const toolIndex = tools.findIndex((tool) => tool.id === toolId);
  if (toolIndex === -1) {
    const msg = `Tool with ID ${toolId} not found`;
    error(msg);
    throw new Error(msg);
  }
  const toolToEdit = tools[toolIndex];
  const updatedTool = { ...toolToEdit, ...updatedData };
  tools[toolIndex] = updatedTool;
  saveTools(tools);
};

export const openToolExecutable = async (toolId: string) => {
  const tools = getTools();
  const tool = tools.find((t) => t.id === toolId);
  if (!tool) {
    const msg = `Tool with ID ${toolId} not found`;
    error(msg);
    throw new Error(msg);
  }
  if (!fs.existsSync(tool.executablePath)) {
    const msg = `Executable path does not exist: ${tool.executablePath}`;
    error(msg);
    throw new Error(msg);
  }
  if (process.platform === 'win32') {
    const result = await shell.openPath(tool.executablePath);
    if (result) {
      const msg = `Failed to launch tool executable: ${result}`;
      error(msg);
      throw new Error(msg);
    }
  } else if (process.platform === 'linux') {
    if (tool.executablePath.toLowerCase().endsWith('.exe')) {
      launchToolViaProton(tool.executablePath);
      return;
    }

    const child = spawn(tool.executablePath, [], { detached: true, stdio: 'ignore' });
    child.unref();
  } else {
    const child = spawn(tool.executablePath, [], { detached: true, stdio: 'ignore' });
    child.unref();
  }
};

export const openToolFolder = async (executablePath: string) => {
  if (!fs.existsSync(executablePath)) {
    const msg = `Executable path does not exist: ${executablePath}`;
    error(msg);
    throw new Error(msg);
  }
  const folderPath = path.dirname(executablePath);
  const result = await shell.openPath(folderPath);
  if (result) {
    const msg = `Failed to open folder: ${result}`;
    error(msg);
    throw new Error(msg);
  }
};
