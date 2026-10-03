import os from 'os';
import { join } from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getEldenRingFolder } from '@backend/db/api';
import { getEldenRingInstallDir } from '@backend/steam';
import { openTestStore } from '../helpers/store';
import { makeTempDir, writeTree } from '../helpers/tempDir';

// `which steam` would find the developer's real Steam install; make it fail so detection only sees the fake tree
vi.mock('child_process', async (importOriginal) => ({
  ...(await importOriginal<typeof import('child_process')>()),
  execSync: vi.fn(() => {
    throw new Error('not found');
  }),
}));

const ELDEN_RING_APP_ID = '1245620';

const libraryFoldersVdf = (libraries: { path: string; apps: string[] }[]) =>
  [
    '"libraryfolders"',
    '{',
    ...libraries.flatMap((library, index) => [
      `\t"${index}"`,
      '\t{',
      `\t\t"path"\t\t"${library.path}"`,
      '\t\t"apps"',
      '\t\t{',
      ...library.apps.map((appId) => `\t\t\t"${appId}"\t\t"1000"`),
      '\t\t}',
      '\t}',
    ]),
    '}',
  ].join('\n');

const appManifest = (installDir: string) =>
  ['"AppState"', '{', `\t"appid"\t\t"${ELDEN_RING_APP_ID}"`, `\t"installdir"\t\t"${installDir}"`, '}'].join('\n');

let home: string;
let steamDir: string;

beforeEach(() => {
  home = makeTempDir('emm-home-');
  steamDir = join(home, '.local', 'share', 'Steam');
  vi.spyOn(os, 'homedir').mockReturnValue(home);
});

// Detection on Windows goes through the registry and Program Files instead of the home directory
describe.skipIf(process.platform === 'win32')('getEldenRingInstallDir', () => {
  it('uses the remembered folder while it still contains the game', () => {
    const gameDir = writeTree(makeTempDir('emm-game-'), { 'eldenring.exe': '' });
    openTestStore({ eldenRingFolder: gameDir });

    expect(getEldenRingInstallDir()).toBe(gameDir);
  });

  it('finds the game in a secondary Steam library and remembers the folder', () => {
    const library = makeTempDir('emm-library-');
    writeTree(steamDir, {
      'steamapps/libraryfolders.vdf': libraryFoldersVdf([
        { path: steamDir, apps: ['228980'] },
        { path: library, apps: [ELDEN_RING_APP_ID] },
      ]),
    });
    writeTree(library, { [`steamapps/appmanifest_${ELDEN_RING_APP_ID}.acf`]: appManifest('ELDEN RING') });
    openTestStore();

    const expected = join(library, 'steamapps', 'common', 'ELDEN RING', 'Game');
    expect(getEldenRingInstallDir()).toBe(expected);
    expect(getEldenRingFolder()).toBe(expected);
  });

  it('re-detects when the remembered folder no longer contains the game', () => {
    writeTree(steamDir, {
      'steamapps/libraryfolders.vdf': libraryFoldersVdf([{ path: steamDir, apps: [ELDEN_RING_APP_ID] }]),
      [`steamapps/appmanifest_${ELDEN_RING_APP_ID}.acf`]: appManifest('ELDEN RING'),
    });
    openTestStore({ eldenRingFolder: makeTempDir('emm-moved-') });

    expect(getEldenRingInstallDir()).toBe(join(steamDir, 'steamapps', 'common', 'ELDEN RING', 'Game'));
  });

  it('looks in the main Steam folder when no library lists the game', () => {
    writeTree(steamDir, {
      'steamapps/libraryfolders.vdf': libraryFoldersVdf([{ path: steamDir, apps: ['228980'] }]),
      [`steamapps/appmanifest_${ELDEN_RING_APP_ID}.acf`]: appManifest('ELDEN RING'),
    });
    openTestStore();

    expect(getEldenRingInstallDir()).toBe(join(steamDir, 'steamapps', 'common', 'ELDEN RING', 'Game'));
  });

  it('returns null when Steam is not installed', () => {
    openTestStore();
    expect(getEldenRingInstallDir()).toBeNull();
  });

  it('fails when the library lists the game but its manifest is missing', () => {
    writeTree(steamDir, {
      'steamapps/libraryfolders.vdf': libraryFoldersVdf([{ path: steamDir, apps: [ELDEN_RING_APP_ID] }]),
    });
    openTestStore();

    expect(() => getEldenRingInstallDir()).toThrow(/steam game install directory/);
  });
});
