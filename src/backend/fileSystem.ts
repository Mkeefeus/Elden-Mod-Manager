import { OpenDialogOptions, dialog } from 'electron';
import { existsSync, readdirSync } from 'fs';
import { logger } from '../utils/mainLogger';
import { errToString } from '../utils/utilities';
import { BrowseType } from 'types';
import { randomUUID } from 'crypto';
import decompress from 'decompress';
import MOD_SUBFOLDERS from './modSubfolders';

const INSTALL_DIR = process.cwd();

const { debug, error, warning } = logger;

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

export const browse = (type: BrowseType, title?: string, startingDir?: string) => {
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

export const findFile = (fileType: 'exe' | 'dll', source: string) => {
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
      debug('User cancelled file selection');
      return;
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
};

export const extractModZip = async (zipPath: string) => {
  debug(`Extracting zip: ${zipPath}`);
  let tempPath = `${INSTALL_DIR}\\temp\\${randomUUID()}`;
  if (existsSync(tempPath)) {
    tempPath = `${INSTALL_DIR}\\temp\\${randomUUID()}`;
  }
  try {
    debug(`Extracting zip to temp directory: ${tempPath} from ${zipPath}`);
    await decompress(zipPath, tempPath);
  } catch (err) {
    const msg = `An error occured while extracting zip: ${errToString(err)}`;
    error(msg);
    throw new Error(msg);
  }
  debug('Zip extracted successfully');
  const files = readdirSync(tempPath, { recursive: true });
  let validPath = '';
  let subfolder = '';
  let index = 0;
  while (!validPath && !subfolder) {
    if (index >= files.length) {
      break;
    }
    const file = files[index] as string;
    // if file contains any of the subfolders
    const pathChunks = file.split('\\');
    for (const chunk of pathChunks) {
      if (MOD_SUBFOLDERS.includes(chunk) || chunk.includes('.dll')) {
        subfolder = chunk;
        validPath = pathChunks.slice(0, -1).join('\\');
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
  tempPath = `${tempPath}\\${validPath}`;

  return tempPath;
};
