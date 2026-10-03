import store from '../init';
import { Migration } from './types';
import { getGeneralSettings, setGeneralSettings } from '../api';

/**
 * rememberLastPage used to live as a single, account-wide value at the top level of the store. It's since moved
 * into a `generalSettings` object so that other general settings can be added in the future. This migrates any
 * config that predates the change by seeding it from the old top-level value, then removes that now-unused
 * top-level key.
 */
export const addGeneralSettings: Migration = {
  id: 'add-general-settings',
  description: 'Add general settings to the store',
  run: () => {
    // These top-level keys no longer exist on DBSchema; read/delete them loosely for this one-time migration.
    const legacyStore = store as unknown as {
      get: (key: string) => unknown;
      has: (key: string) => boolean;
      delete: (key: string) => void;
    };
    const needsMigration = legacyStore.has('rememberLastPage');
    if (!needsMigration) return false;
    const rememberLastPage = legacyStore.get('rememberLastPage');
    setGeneralSettings({
      ...getGeneralSettings(),
      rememberLastPage: Boolean(rememberLastPage),
    });
    legacyStore.delete('rememberLastPage');
    return true;
  },
};
