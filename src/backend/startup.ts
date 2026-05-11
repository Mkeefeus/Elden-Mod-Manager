import { BrowserWindow } from 'electron';
import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { ModProfile } from 'types';
import { logger } from '../utils/mainLogger';
import {
  clearFirstRun,
  getActiveProfileId,
  getModEnginePath,
  getProfiles,
  isFirstRun,
  saveProfiles,
  setActiveProfileId,
  setModEnginePath,
} from './db/api';
import { detectME3 } from './me3';

const { debug } = logger;

const queueMissingMe3Prompt = (getMainWindow: () => BrowserWindow | null) => {
  const window = getMainWindow();
  if (!window) return;

  window.once('ready-to-show', () => {
    window.webContents.send('prompt-me3-install');
  });
};

export const runStartupTasks = (getMainWindow: () => BrowserWindow | null) => {
  const storedPath = getModEnginePath();
  const me3Available =
    (storedPath && existsSync(storedPath)) ||
    (() => {
      const detected = detectME3();
      if (detected) {
        setModEnginePath(detected);
        return true;
      }
      return false;
    })();

  if (!me3Available) {
    queueMissingMe3Prompt(getMainWindow);
  }

  const profiles = getProfiles();
  if (profiles.length === 0) {
    const defaultProfile: ModProfile = {
      uuid: randomUUID(),
      name: 'Default',
      createdAt: Date.now(),
      mods: [],
      savefile: '',
      startOnline: false,
      disableArxan: false,
      noMemPatch: false,
    };
    saveProfiles([defaultProfile]);
    setActiveProfileId(defaultProfile.uuid);
    debug(`Created default profile: ${defaultProfile.uuid}`);
  } else if (!profiles.some((profile) => profile.uuid === getActiveProfileId())) {
    setActiveProfileId(profiles[0].uuid);
    debug(`Recovered missing active profile: ${profiles[0].uuid}`);
  }

  if (isFirstRun()) {
    clearFirstRun();
  }
};
