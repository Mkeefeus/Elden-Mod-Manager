import { OpenDialogOptions, app, dialog } from 'electron';
import { existsSync, readdirSync } from 'fs';
import { logger } from '../utils/mainLogger';
import { errToString } from '../utils/utilities';
import { BrowseType } from 'types';
import { randomUUID } from 'crypto';
import decompress from 'decompress';
import { MOD_SUBFOLDERS } from './constants';

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
    throw new Error(msg);
  }
};

export const extractModZip = async (zipPath: string) => {
  debug(`Extracting zip: ${zipPath}`);
  let tempPath = `${app.getPath('temp')}\\${randomUUID()}`;
  if (existsSync(tempPath)) {
    tempPath = `${app.getPath('temp')}\\${randomUUID()}`;
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
