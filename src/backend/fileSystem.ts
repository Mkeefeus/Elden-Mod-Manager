import { OpenDialogOptions, app, dialog } from 'electron';
import { chmodSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, normalize, sep } from 'path';
import { logger } from '../utils/mainLogger';
import { errToString } from '../utils/utilities';
import { BrowseType } from 'types';
import { randomUUID } from 'crypto';
import Seven from 'node-7z';
import { MOD_SUBFOLDERS } from './constants';

// Resolve the path to the 7za binary at runtime so it works in both dev
// (where Vite bundles the JS to .vite/build/ and __dirname is wrong for node_modules)
// and in the packaged app (where the binary lives in process.resourcesPath).
const get7zaPath = (): string => {
  const platform = process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'mac' : 'linux';
  const ext = process.platform === 'win32' ? '7za.exe' : '7za';
  const binRelPath = join(platform, process.arch, ext);
  if (app.isPackaged) {
    return join(process.resourcesPath, '7zip-bin', binRelPath);
  }
  return join(app.getAppPath(), 'node_modules', '7zip-bin', binRelPath);
};

// Ensure the 7-Zip binary is executable on POSIX systems
if (process.platform !== 'win32') {
  try {
    chmodSync(get7zaPath(), 0o755);
  } catch {
    // May already be executable or in a read-only location — ignore
  }
}

const { debug, error, warning } = logger;

const getBrowseFilters = (type: BrowseType) => {
  switch (type) {
    case 'archive':
      return [{ name: 'Archive Files', extensions: ['zip', '7z', 'rar', 'tar', 'gz', 'bz2'] }];
    case 'dll':
      return [{ name: 'Dynamic Link Libraries', extensions: ['dll'] }];
    case 'exe':
      return process.platform === 'linux' ? undefined : [{ name: 'Executable Files', extensions: ['exe'] }];
    case 'binary':
      return undefined;
    default:
      return undefined;
  }
};

export const browse = (type: BrowseType, title?: string, startingDir?: string) => {
  startingDir = startingDir || app.getPath('downloads');
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
    throw new Error(msg, { cause: err });
  }
};

export const extractModArchive = async (archivePath: string): Promise<string | undefined> => {
  debug(`Extracting archive: ${archivePath}`);
  let tempPath = join(app.getPath('temp'), randomUUID());
  try {
    debug(`Extracting archive to temp directory: ${tempPath} from ${archivePath}`);
    await new Promise<void>((resolve, reject) => {
      const stream = Seven.extractFull(archivePath, tempPath, {
        $bin: get7zaPath(),
        recursive: true,
      });
      stream.on('end', resolve);
      stream.on('error', reject);
    });
  } catch (err) {
    const msg = `An error occured while extracting archive: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
  debug('Archive extracted successfully');
  const files = readdirSync(tempPath, { recursive: true });
  let validPath = '';
  let subfolder = '';
  let index = 0;
  while (!validPath && !subfolder) {
    if (index >= files.length) {
      break;
    }
    const file = files[index] as string;
    // Normalize to platform separators so splitting works on all OSes
    const pathChunks = normalize(file).split(sep);
    for (const chunk of pathChunks) {
      if (MOD_SUBFOLDERS.includes(chunk) || chunk.includes('.dll')) {
        subfolder = chunk;
        validPath = pathChunks.slice(0, -1).join(sep);
        break;
      }
    }
    index++;
  }
  if (!validPath) {
    const msg = 'Zip file does not appear to be a valid Elden Ring mod. Are you sure you selected the correct file?';
    warning(msg);
    return;
  }
  tempPath = join(tempPath, validPath);

  return tempPath;
};

export const scanDirForFile = (dirPath: string, extension: string): string | undefined => {
  debug(`Scanning directory for .${extension} files: ${dirPath}`);
  try {
    const entries = readdirSync(dirPath, { withFileTypes: true });
    const matches = entries
      .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(`.${extension.toLowerCase()}`))
      .map((e) => e.name);
    if (matches.length === 1) {
      debug(`Found exactly one .${extension} file: ${matches[0]}`);
      return matches[0];
    }
    debug(`Found ${matches.length} .${extension} files — skipping auto-fill`);
    return undefined;
  } catch (err) {
    error(`Failed to scan directory ${dirPath}: ${errToString(err)}`);
    return undefined;
  }
};

export const listIniFiles = (dirPath: string): string[] => {
  debug(`Listing INI files in: ${dirPath}`);
  try {
    if (!existsSync(dirPath)) return [];
    const entries = readdirSync(dirPath, { withFileTypes: true });
    return entries.filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.ini')).map((e) => e.name);
  } catch (err) {
    error(`Failed to list INI files in ${dirPath}: ${errToString(err)}`);
    return [];
  }
};

export const readIniFile = (filePath: string): string => {
  debug(`Reading INI file: ${filePath}`);
  try {
    return readFileSync(filePath, 'utf-8');
  } catch (err) {
    const msg = `Failed to read INI file ${filePath}: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};

export const writeIniFile = (filePath: string, content: string): void => {
  debug(`Writing INI file: ${filePath}`);
  try {
    writeFileSync(filePath, content, 'utf-8');
  } catch (err) {
    const msg = `Failed to write INI file ${filePath}: ${errToString(err)}`;
    error(msg);
    throw new Error(msg, { cause: err });
  }
};
