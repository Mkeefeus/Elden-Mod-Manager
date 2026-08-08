import { Tool, ToolFormValues } from 'types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { getTools, getToolsDirectory, saveTools, setToolsDirectory } from './db/api';
import { CreateModPathFromName, generateUUID } from '~/utils/utilities';
import { logger } from '~/utils/mainLogger';
import { getEldenRingInstallDir } from './steam';
import { shell } from 'electron';

const { info, error, debug, warning } = logger;

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

export const handleAddTool = (toolData: ToolFormValues, modID?: string): string | false => {
  try {
    if (!toolData.name || !toolData.path) {
      const msg = 'Tool must have a name and executable path';
      error(msg);
      throw new Error(msg);
    }
    if (!fs.existsSync(toolData.path)) {
      const msg = `Executable path does not exist: ${toolData.path}`;
      error(msg);
      throw new Error(msg);
    }

    let executablePath = toolData.path;
    if (toolData.copy) {
      const destinationDir = getToolsDirectory();
      fs.mkdirSync(destinationDir, { recursive: true });

      const sourceToolDir = path.dirname(toolData.path);
      const sourceExecutableName = path.basename(toolData.path);
      const copiedToolDir = path.join(destinationDir, CreateModPathFromName(toolData.name, toolData.version));
      const copiedExecutablePath = path.join(copiedToolDir, sourceExecutableName);

      if (fs.existsSync(copiedToolDir)) {
        const msg = `A copied tool directory already exists at: ${copiedToolDir}`;
        error(msg);
        throw new Error(msg);
      }

      fs.cpSync(sourceToolDir, copiedToolDir, { recursive: true, force: false, errorOnExist: true });
      if (!fs.existsSync(copiedExecutablePath)) {
        const msg = `Copied tool executable not found at: ${copiedExecutablePath}`;
        error(msg);
        throw new Error(msg);
      }
      executablePath = copiedExecutablePath;

      if (toolData.deleteSource) {
        const cleanupPath = toolData.cleanupPath?.trim() || sourceToolDir;
        fs.rmSync(cleanupPath, { recursive: true, force: true });
      }
    }

    const tools = getTools();
    const uuids = tools.map((tool) => tool.id);
    const newUUID = generateUUID(uuids);

    const newTool: Tool = {
      name: toolData.name,
      executablePath,
      version: toolData.version || undefined,
      id: newUUID,
      modUuid: modID || undefined,
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

export const updateToolsFolder = (newPath: string) => {
  debug(`Updating tools folder to: ${newPath}`);
  try {
    const currentPath = getToolsDirectory();
    if (currentPath === newPath) {
      debug('tools folder unchanged');
      return;
    }

    fs.mkdirSync(newPath, { recursive: true });
    if (fs.readdirSync(newPath).length > 0) {
      warning('Destination path is not empty, please select an empty folder');
      return;
    }

    if (fs.existsSync(currentPath)) {
      const contents = fs.readdirSync(currentPath);
      debug(`Moving tools contents to: ${newPath}`);
      contents.forEach((entry) => {
        fs.renameSync(path.join(currentPath, entry), path.join(newPath, entry));
      });
    }

    const normalizedCurrentPath = path.resolve(currentPath);
    const normalizedCurrentPrefix = `${normalizedCurrentPath}${path.sep}`;
    const tools = getTools();
    let updatedPathCount = 0;

    const updatedTools = tools.map((tool) => {
      const normalizedToolPath = path.resolve(tool.executablePath);
      if (!normalizedToolPath.startsWith(normalizedCurrentPrefix)) {
        return tool;
      }

      const relativeToolPath = path.relative(normalizedCurrentPath, normalizedToolPath);
      const updatedExecutablePath = path.join(newPath, relativeToolPath);
      updatedPathCount += 1;
      return { ...tool, executablePath: updatedExecutablePath };
    });

    if (updatedPathCount > 0) {
      saveTools(updatedTools);
      debug(`Updated ${updatedPathCount} tool executable path(s) to new tools folder`);
    }

    setToolsDirectory(newPath);
    debug(`tools folder updated to: ${newPath}`);
  } catch (err) {
    const msg = `An error occured while updating tools folder: ${err instanceof Error ? err.message : String(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};

export const handleDeleteTool = (toolId: string, force = false, deleteFiles = false) => {
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

  if (deleteFiles && fs.existsSync(toolToDelete.executablePath)) {
    try {
      const toolExecutablePath = path.resolve(toolToDelete.executablePath);
      const managedToolsDir = path.resolve(getToolsDirectory());
      const managedToolsPrefix = `${managedToolsDir}${path.sep}`;

      if (toolExecutablePath.startsWith(managedToolsPrefix)) {
        const relativePath = path.relative(managedToolsDir, toolExecutablePath);
        const topLevelDir = relativePath.split(path.sep)[0];
        const topLevelPath = path.join(managedToolsDir, topLevelDir);

        if (topLevelDir && fs.existsSync(topLevelPath) && fs.statSync(topLevelPath).isDirectory()) {
          fs.rmSync(topLevelPath, { recursive: true, force: true });
          info(`Deleted tool directory from disk: ${topLevelPath}`);
        } else {
          fs.rmSync(toolExecutablePath, { force: true });
          info(`Deleted tool executable from disk: ${toolExecutablePath}`);
        }
      } else {
        fs.rmSync(toolExecutablePath, { force: true });
        info(`Deleted external tool executable from disk: ${toolExecutablePath}`);
      }
    } catch (err) {
      const msg = `Failed to delete tool files for ${toolToDelete.name}: ${err instanceof Error ? err.message : String(err)}`;
      error(msg);
      throw new Error(msg, { cause: err });
    }
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
