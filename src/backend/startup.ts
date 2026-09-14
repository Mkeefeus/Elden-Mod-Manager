import { randomUUID } from 'crypto';
import { ModProfile } from 'types';
import { logger } from '@utils/mainLogger';
import { clearFirstRun, getActiveProfileId, getProfiles, isFirstRun, saveProfiles, setActiveProfileId } from './db/api';
import { runMigrations } from './db/migrations';

const { debug } = logger;

export const runStartupTasks = () => {
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
      noBootBoost: false,
      showLogos: false,
      skipSteamInit: false,
    };
    saveProfiles([defaultProfile]);
    setActiveProfileId(defaultProfile.uuid);
    debug(`Created default profile: ${defaultProfile.uuid}`);
  } else if (!profiles.some((profile) => profile.uuid === getActiveProfileId())) {
    setActiveProfileId(profiles[0].uuid);
    debug(`Recovered missing active profile: ${profiles[0].uuid}`);
  }

  runMigrations();

  if (isFirstRun()) {
    clearFirstRun();
  }
};
