import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import Store from 'electron-store';
import schema, { type DBSchema } from '@backend/db/schema';
import { makeTempDir } from './tempDir';

// A real electron-store instance using the real schema, so tests exercise the actual defaults and validation.
// tests/setup.ts mocks `@backend/db/init` with `storeProxy`, so everything that imports the app's store
// (db/api.ts, migrations) reads and writes whichever test store is currently open.

let current: Store<DBSchema> | undefined;
let currentDir: string | undefined;

export const storeProxy = new Proxy(
  {},
  {
    get: (_target, prop) => {
      // Tolerate probes that happen without a store open (e.g. module interop checking for `then`)
      if (typeof prop === 'symbol' || prop === 'then') return undefined;
      if (!current) throw new Error(`Test store accessed (${prop}) before openTestStore() was called`);
      const target = current as unknown as Record<string, unknown>;
      const value = target[prop];
      return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(current) : value;
    },
  }
);

/**
 * Opens a store in a fresh temp directory for the current test. `initial` becomes the existing config.json
 * contents (use it to simulate configs saved by older versions); omit it to simulate a fresh install.
 */
export const openTestStore = (initial?: Record<string, unknown>): Store<DBSchema> => {
  currentDir = makeTempDir('emm-store-');
  if (initial) writeFileSync(join(currentDir, 'config.json'), JSON.stringify(initial));
  current = new Store<DBSchema>({ schema, cwd: currentDir });
  return current;
};

/** The config.json exactly as it is on disk, without schema defaults applied. */
export const readTestConfig = (): Record<string, unknown> => {
  if (!currentDir) throw new Error('No test store is open');
  return JSON.parse(readFileSync(join(currentDir, 'config.json'), 'utf-8')) as Record<string, unknown>;
};

export const closeTestStore = () => {
  current = undefined;
  currentDir = undefined;
};
