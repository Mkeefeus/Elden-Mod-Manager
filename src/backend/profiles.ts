import { randomUUID } from 'crypto';
import { ModProfile } from 'types';
import { logger } from '../utils/mainLogger';
import { errToString } from '../utils/utilities';
import { getActiveProfile, getActiveProfileId, getProfiles, saveProfiles, setActiveProfileId } from './db/api';
import { writeMe3Profile } from './me3Profile';

const { debug } = logger;

export const handleCreateProfile = (name: string): ModProfile => {
  debug(`Creating profile: ${name}`);
  try {
    const activeProfile = getActiveProfile();
    const profile: ModProfile = {
      uuid: randomUUID(),
      name,
      createdAt: Date.now(),
      mods: [],
      savefile: activeProfile?.savefile ?? '',
      startOnline: activeProfile?.startOnline ?? false,
      disableArxan: activeProfile?.disableArxan ?? false,
      noMemPatch: activeProfile?.noMemPatch ?? false,
    };
    const profiles = getProfiles();
    profiles.push(profile);
    saveProfiles(profiles);
    setActiveProfileId(profile.uuid);
    writeMe3Profile();
    debug(`Profile created: ${profile.uuid}`);
    return profile;
  } catch (err) {
    const msg = `An error occurred while creating profile: ${errToString(err)}`;
    throw new Error(msg, { cause: err });
  }
};

export const handleApplyProfile = (uuid: string) => {
  debug(`Applying profile: ${uuid}`);
  try {
    const profiles = getProfiles();
    const profile = profiles.find((p) => p.uuid === uuid);
    if (!profile) throw new Error(`Profile not found: ${uuid}`);
    setActiveProfileId(uuid);
    writeMe3Profile();
    debug(`Profile applied: ${uuid}`);
  } catch (err) {
    const msg = `An error occurred while applying profile: ${errToString(err)}`;
    throw new Error(msg, { cause: err });
  }
};

export const handleUpdateProfile = (uuid: string) => {
  debug(`Updating profile: ${uuid}`);
  try {
    const profiles = getProfiles();
    const index = profiles.findIndex((p) => p.uuid === uuid);
    if (index === -1) throw new Error(`Profile not found: ${uuid}`);

    profiles[index] = {
      ...profiles[index],
      savefile: getActiveProfile()?.savefile ?? '',
      startOnline: getActiveProfile()?.startOnline ?? false,
      disableArxan: getActiveProfile()?.disableArxan ?? false,
      noMemPatch: getActiveProfile()?.noMemPatch ?? false,
    };
    saveProfiles(profiles);
    debug(`Profile updated: ${uuid}`);
  } catch (err) {
    const msg = `An error occurred while updating profile: ${errToString(err)}`;
    throw new Error(msg, { cause: err });
  }
};

export const handleDeleteProfile = (uuid: string): string => {
  debug(`Deleting profile: ${uuid}`);
  try {
    const profiles = getProfiles();
    const profile = profiles.find((p) => p.uuid === uuid);
    if (!profile) throw new Error(`Profile not found: ${uuid}`);
    if (profile?.name === 'Default') throw new Error('The Default profile cannot be deleted.');
    const updated = profiles.filter((p) => p.uuid !== uuid);

    if (updated.length === 0) {
      throw new Error('The last remaining profile cannot be deleted.');
    }

    let nextActiveId = getActiveProfileId();
    if (nextActiveId === uuid) {
      nextActiveId = updated[0].uuid;
      setActiveProfileId(nextActiveId);
    }

    saveProfiles(updated);
    debug(`Profile deleted: ${uuid}`);
    return nextActiveId;
  } catch (err) {
    const msg = `An error occurred while deleting profile: ${errToString(err)}`;
    throw new Error(msg, { cause: err });
  }
};

export const handleRenameProfile = (uuid: string, name: string) => {
  debug(`Renaming profile ${uuid} to: ${name}`);
  try {
    const profiles = getProfiles();
    const index = profiles.findIndex((p) => p.uuid === uuid);
    if (index === -1) throw new Error(`Profile not found: ${uuid}`);
    if (profiles[index].name === 'Default') throw new Error('The Default profile cannot be renamed.');
    profiles[index] = { ...profiles[index], name };
    saveProfiles(profiles);
    debug(`Profile renamed: ${uuid}`);
  } catch (err) {
    const msg = `An error occurred while renaming profile: ${errToString(err)}`;
    throw new Error(msg, { cause: err });
  }
};
