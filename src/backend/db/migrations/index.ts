import { logger } from '@utils/mainLogger';
import { errToString } from '@utils/utilities';
import { Migration } from './types';
import { launcherSettingsToProfiles } from './001-launcher-settings-to-profiles';

const { debug, error } = logger;

/**
 * All registered migrations, run in order on every startup. Each one must be idempotent (safe to
 * run again on a store that's already been migrated) — there's no separate version tracking, a
 * migration's own `run()` decides whether it still has anything to do.
 *
 * To add a new migration:
 * 1. Create a new file here, e.g. `002-my-migration.ts`, exporting a `Migration` (see `types.ts`).
 * 2. Add it to this list, after any migrations it depends on.
 */
const migrations: Migration[] = [launcherSettingsToProfiles];

// User-facing messages from migrations that actually ran this session — see getMigrationNotices.
const appliedNotices: string[] = [];

export const runMigrations = () => {
  for (const migration of migrations) {
    try {
      const didMigrate = migration.run();
      if (didMigrate) {
        debug(`Migration applied: ${migration.id} (${migration.description})`);
        if (migration.userNotice) appliedNotices.push(migration.userNotice);
      }
    } catch (err) {
      const msg = `An error occured while running migration "${migration.id}": ${errToString(err)}`;
      error(msg);
      throw new Error(msg, { cause: err });
    }
  }
};

/**
 * Messages from migrations that ran this session, meant to be shown to the user once the
 * renderer is ready (see `get-migration-notices` in mainEvents.ts). Read once at startup by the
 * renderer, so there's no need to track whether they've been "seen" — they only exist for the one
 * session in which their migration actually ran.
 */
export const getMigrationNotices = (): string[] => appliedNotices;
