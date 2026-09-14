import { logger } from '@utils/mainLogger';
import store from '../init';
import { getRawProfiles, saveProfiles } from '../api';
import { Migration } from './types';

const { debug } = logger;

/**
 * Launcher settings (noBootBoost/showLogos/skipSteamInit/overrideExe) used to live as single,
 * account-wide values at the top level of the store. They've since moved onto `ModProfile` so
 * each profile can have its own. This migrates any profile that predates the change by seeding
 * it from the old top-level values, then removes those now-unused top-level keys.
 *
 * These fields are deliberately left out of the store schema's `required` list (see schema.ts) so
 * old configs can still load before this migration gets a chance to run.
 *
 * Reads `getRawProfiles()`, not `getProfiles()`: the latter fills in defaults for any missing
 * setting (see db/api.ts), which would make every profile look already-migrated and this
 * migration would never run — it needs to see a genuinely missing field to know it has work to do.
 */
export const launcherSettingsToProfiles: Migration = {
  id: 'launcher-settings-to-profiles',
  description: 'Copy account-wide launcher settings onto every profile',
  userNotice:
    'Launcher settings (Disable Boot Boost, Show Intro Logos, Skip Steam Init, Override Elden Ring Executable) used to apply to every profile — now each profile has its own. Your old settings were copied onto all of them, so check Show Advanced on the Mods page to make sure they still look right for each profile.',
  run: () => {
    const profiles = getRawProfiles();
    const needsMigration = profiles.some((p) => p.noBootBoost === undefined);
    if (!needsMigration) return false;

    // These top-level keys no longer exist on DBSchema; read/delete them loosely for this one-time migration.
    const legacyStore = store as unknown as {
      get: (key: string) => unknown;
      has: (key: string) => boolean;
      delete: (key: string) => void;
    };
    const legacyNoBootBoost = legacyStore.has('noBootBoost') ? Boolean(legacyStore.get('noBootBoost')) : false;
    const legacyShowLogos = legacyStore.has('showLogos') ? Boolean(legacyStore.get('showLogos')) : false;
    const legacySkipSteamInit = legacyStore.has('skipSteamInit') ? Boolean(legacyStore.get('skipSteamInit')) : false;
    const legacyOverrideExe = legacyStore.has('overrideExe')
      ? (legacyStore.get('overrideExe') as string | undefined)
      : undefined;

    const migrated = profiles.map((p) =>
      p.noBootBoost !== undefined
        ? p
        : {
            ...p,
            noBootBoost: legacyNoBootBoost,
            showLogos: legacyShowLogos,
            skipSteamInit: legacySkipSteamInit,
            overrideExe: legacyOverrideExe,
          }
    );
    saveProfiles(migrated);

    legacyStore.delete('noBootBoost');
    legacyStore.delete('showLogos');
    legacyStore.delete('skipSteamInit');
    legacyStore.delete('overrideExe');

    debug(`Migrated launcher settings onto ${migrated.length} profile(s)`);
    return true;
  },
};
