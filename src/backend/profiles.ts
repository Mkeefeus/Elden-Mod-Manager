import { randomUUID } from 'crypto';
import { Dependent, ImportModResult, Mod, ModProfile, NativeInitializerCondition, ProfileImportAnalysis } from 'types';
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
import { readFileSync, writeFileSync } from 'fs';

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

const normalizeString = (value: string): string => value.trim().toLowerCase();

const normalizeOptionalString = (value?: string): string | undefined => {
  if (typeof value !== 'string') return undefined;

  const trimmedValue = value.trim().toLowerCase();
  return trimmedValue || undefined;
};

const findInstalledModMatch = (
  installedMods: Mod[],
  mod: Pick<ImportModResult, 'name' | 'version' | 'nexusModId' | 'nexusFileId'>
): Mod | undefined => {
  if (mod.nexusModId && mod.nexusFileId) {
    return installedMods.find((installedMod) => {
      return installedMod.nexusModId === mod.nexusModId && installedMod.nexusFileId === mod.nexusFileId;
    });
  }

  const normalizedName = normalizeString(mod.name);
  const normalizedVersion = normalizeOptionalString(mod.version);

  return installedMods.find((installedMod) => {
    if (normalizeString(installedMod.name) !== normalizedName) return false;

    if (normalizedVersion) {
      return normalizeOptionalString(installedMod.version) === normalizedVersion;
    }

    return true;
  });
};

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

export const getProfileById = (uuid: string): ModProfile => {
  const profiles = getProfiles();
  const profile = profiles.find((p) => p.uuid === uuid);
  if (!profile) throw new Error(`Profile not found: ${uuid}`);
  return profile;
};

export const analyzeProfileImport = (srcPath: string): ProfileImportAnalysis => {
  try {
    const raw = readFileSync(srcPath, 'utf-8');
    const parsed = JSON.parse(raw) as ProfileExport;
    const installedMods = loadMods();

    const mods: ImportModResult[] = parsed.mods.map((mod): ImportModResult => {
      const installed = findInstalledModMatch(installedMods, mod);

      if (installed) {
        return {
          status: 'installed',
          name: mod.name,
          version: mod.version,
          nexusModId: mod.nexusModId,
          nexusFileId: mod.nexusFileId,
          nexusGameDomain: mod.nexusGameDomain,
          installedModUuid: installed.uuid,
          loadBefore: mod.loadBefore,
          loadAfter: mod.loadAfter,
        };
      }

      if (mod.nexusModId && mod.nexusFileId) {
        return {
          status: 'needs_install',
          name: mod.name,
          version: mod.version,
          nexusModId: mod.nexusModId,
          nexusFileId: mod.nexusFileId,
          nexusGameDomain: mod.nexusGameDomain,
          loadBefore: mod.loadBefore,
          loadAfter: mod.loadAfter,
        };
      }

      return {
        status: 'no_nexus_info',
        name: mod.name,
        version: mod.version,
        loadBefore: mod.loadBefore,
        loadAfter: mod.loadAfter,
      };
    });

    return {
      profileName: parsed.name,
      savefile: parsed.savefile,
      startOnline: parsed.startOnline,
      disableArxan: parsed.disableArxan,
      noMemPatch: parsed.noMemPatch,
      mods,
    };
  } catch (err) {
    const msg = `An error occurred while analyzing profile import: ${errToString(err)}`;
    throw new Error(msg, { cause: err });
  }
};

export const completeProfileImport = (
  analysis: ProfileImportAnalysis,
  manualMatches: Record<number, string>,
  profileName: string
): ModProfile => {
  try {
    // Re-fetch installed mods in case new ones were installed since the analysis
    const installedMods = loadMods();

    const profileMods = analysis.mods.flatMap((mod, index) => {
      if (mod.status === 'installed' && mod.installedModUuid) {
        return [{ modUuid: mod.installedModUuid, loadBefore: mod.loadBefore, loadAfter: mod.loadAfter }];
      }
      if (mod.status === 'needs_install' || mod.status === 'no_nexus_info') {
        // Manual override takes priority
        const manualUuid = manualMatches[index];
        if (manualUuid) {
          return [{ modUuid: manualUuid, loadBefore: mod.loadBefore, loadAfter: mod.loadAfter }];
        }
        const nowInstalled = findInstalledModMatch(installedMods, mod);
        if (nowInstalled) {
          return [{ modUuid: nowInstalled.uuid, loadBefore: mod.loadBefore, loadAfter: mod.loadAfter }];
        }
        return [];
      }
      return [];
    });

    const profiles = getProfiles();

    // Deduplicate name: if "Foo" exists, try "Foo (2)", "Foo (3)", ...
    let finalName = profileName;
    if (profiles.some((p) => p.name === finalName)) {
      let n = 1;
      while (profiles.some((p) => p.name === `${profileName} (${n})`)) n++;
      finalName = `${profileName} (${n})`;
    }

    const profile: ModProfile = {
      uuid: randomUUID(),
      name: finalName,
      createdAt: Date.now(),
      mods: profileMods,
      savefile: analysis.savefile,
      startOnline: analysis.startOnline,
      disableArxan: analysis.disableArxan,
      noMemPatch: analysis.noMemPatch,
    };

    profiles.push(profile);
    saveProfiles(profiles);
    setActiveProfileId(profile.uuid);
    debug(`Profile imported: ${profile.uuid} (${profile.name})`);
    return profile;
  } catch (err) {
    const msg = `An error occurred while completing profile import: ${errToString(err)}`;
    throw new Error(msg, { cause: err });
  }
};
