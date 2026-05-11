import { randomUUID } from 'crypto';
import { Dependent, ModProfile, NativeInitializerCondition } from 'types';
import { logger } from '../utils/mainLogger';
import { errToString } from '../utils/utilities';
import {
  getActiveProfile,
  getActiveProfileId,
  getProfiles,
  loadMods,
  saveProfiles,
  setActiveProfileId,
} from './db/api';
import { writeMe3Profile } from './me3Profile';
import { writeFileSync } from 'fs';

type ModExport = {
  name: string;
  dllFile?: string;
  exe?: string;
  loadBefore?: Dependent[];
  loadAfter?: Dependent[];
  loadEarly?: boolean;
  finalizer?: string;
  initializer?: NativeInitializerCondition;
  version?: string;
  nexusModId?: number;
  nexusFileId?: number;
  nexusGameDomain?: string;
};

type ProfileExport = {
  name: string;
  mods: ModExport[];
  savefile: string;
  startOnline: boolean;
  disableArxan: boolean;
  noMemPatch: boolean;
};

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

export const handleExportProfile = (profile: ModProfile, destPath: string) => {
  try {
    const mods = loadMods();
    const exportMods: ModExport[] = profile.mods.map((profileMod) => {
      const mod = mods.find((m) => m.uuid === profileMod.modUuid);
      if (!mod) {
        debug(`Mod not found for profile mod ref: ${profileMod.modUuid}`);
        return {
          name: `Unknown Mod (${profileMod.modUuid})`,
        };
      }
      return {
        name: mod.name,
        dllFile: mod.dllFile,
        exe: mod.exe,
        loadBefore: profileMod.loadBefore,
        loadAfter: profileMod.loadAfter,
        loadEarly: mod.loadEarly,
        finalizer: mod.finalizer,
        initializer: mod.initializer,
        version: mod.version,
        nexusModId: mod.nexusModId,
        nexusFileId: mod.nexusFileId,
        nexusGameDomain: mod.nexusGameDomain,
      };
    });

    const exportData: ProfileExport = {
      name: profile.name,
      mods: exportMods,
      savefile: profile.savefile,
      startOnline: profile.startOnline,
      disableArxan: profile.disableArxan,
      noMemPatch: profile.noMemPatch,
    };

    writeFileSync(destPath, JSON.stringify(exportData, null, 2), 'utf-8');
  } catch (err) {
    const msg = `An error occurred while exporting profile: ${errToString(err)}`;
    throw new Error(msg, { cause: err });
  }
};
