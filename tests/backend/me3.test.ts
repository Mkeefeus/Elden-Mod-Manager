import { spawn } from 'child_process';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getProfilesFolder } from '@backend/db/api';
import { getME3Executable, launchEldenRingModded } from '@backend/me3';
import { writeMe3Profile } from '@backend/me3Profile';
import { makeProfile } from '../helpers/fixtures';
import { openTestStore } from '../helpers/store';
import { makeTempDir, writeTree } from '../helpers/tempDir';
// The same module the source gets when it imports 'electron' (see the alias in vitest.config.ts)
import { app } from '../mocks/electron';

vi.mock('child_process', async (importOriginal) => ({
  ...(await importOriginal<typeof import('child_process')>()),
  spawn: vi.fn(() => ({ unref: vi.fn() })),
}));

// Building the profile file is covered by me3Profile.test.ts
vi.mock('@backend/me3Profile', () => ({ writeMe3Profile: vi.fn() }));

const platformDir = process.platform === 'win32' ? 'win32' : 'linux';
const binaryName = process.platform === 'win32' ? 'me3.exe' : 'me3';

let resourcesDir: string;
let cwdDir: string;

beforeEach(() => {
  // Electron sets process.resourcesPath; plain Node doesn't
  resourcesDir = makeTempDir('emm-resources-');
  Object.defineProperty(process, 'resourcesPath', { value: resourcesDir, configurable: true, writable: true });
  // Keep the repo's own resources/me3 (staged for local dev) out of the lookup
  cwdDir = makeTempDir('emm-cwd-');
  vi.spyOn(process, 'cwd').mockReturnValue(cwdDir);
  const userRoot = makeTempDir('emm-user-');
  app.getPath.mockImplementation((name: string) => join(userRoot, name));
});

afterEach(() => {
  delete (process as { resourcesPath?: string }).resourcesPath;
  delete process.env['ME3_PROTON_LAUNCH_VERB'];
});

const stagePackagedMe3 = (extraFiles: Record<string, string> = {}) => {
  writeTree(resourcesDir, { [`me3/${platformDir}/${binaryName}`]: '', ...extraFiles });
  return join(resourcesDir, 'me3', platformDir, binaryName);
};

const lastSpawn = () => {
  const [command, args, options] = vi.mocked(spawn).mock.lastCall as unknown as [string, string[], object];
  return { command, args, options };
};

describe.skipIf(process.platform === 'darwin')('getME3Executable', () => {
  it('uses the binary bundled in the packaged app resources', () => {
    const packaged = stagePackagedMe3();
    expect(getME3Executable()).toBe(packaged);
  });

  it('falls back to the dev copy staged under resources/me3 in the working directory', () => {
    writeTree(cwdDir, { [`resources/me3/${platformDir}/${binaryName}`]: '' });
    expect(getME3Executable()).toBe(join(cwdDir, 'resources', 'me3', platformDir, binaryName));
  });

  it('throws when no bundled binary exists', () => {
    expect(() => getME3Executable()).toThrow(/Bundled ME3 executable not found/);
  });
});

describe.skipIf(process.platform === 'darwin')('launchEldenRingModded', () => {
  const openStoreWithProfile = (profile: Parameters<typeof makeProfile>[0] | object = {}) =>
    openTestStore({ activeProfileId: 'p1', profiles: [makeProfile({ uuid: 'p1', name: 'Default', ...profile })] });

  it('writes the profile, then launches me3 with it', () => {
    const me3 = stagePackagedMe3();
    openStoreWithProfile();

    launchEldenRingModded();

    expect(writeMe3Profile).toHaveBeenCalledOnce();
    const { command, args, options } = lastSpawn();
    expect(command).toBe(me3);
    expect(args).toEqual(['launch', '-p', join(getProfilesFolder(), 'eldenring-mods.json')]);
    expect(options).toMatchObject({ detached: true });
    expect(vi.mocked(writeMe3Profile).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(spawn).mock.invocationCallOrder[0]
    );
  });

  it('passes a flag for each launch setting turned on in the profile', () => {
    stagePackagedMe3();
    openStoreWithProfile({
      disableArxan: true,
      noMemPatch: true,
      noBootBoost: true,
      showLogos: true,
      skipSteamInit: true,
      overrideExe: 'C:\\Games\\start_protected_game.exe',
    });

    launchEldenRingModded();

    expect(lastSpawn().args.slice(3)).toEqual([
      '--disable-arxan',
      '--no-mem-patch',
      '--no-boot-boost',
      '--show-logos',
      '--skip-steam-init',
      '--exe',
      'C:\\Games\\start_protected_game.exe',
    ]);
  });

  it.runIf(process.platform === 'linux')('launches through me3_verb on Linux when it is bundled', () => {
    stagePackagedMe3({ [`me3/linux/me3_verb`]: '' });
    openStoreWithProfile();

    launchEldenRingModded();

    expect(lastSpawn().command).toBe(join(resourcesDir, 'me3', 'linux', 'me3_verb'));
  });

  it.runIf(process.platform === 'linux')('asks Proton to use the run verb when the profile overrides it', () => {
    stagePackagedMe3();
    openStoreWithProfile({ overrideProtonVerb: true });

    launchEldenRingModded();

    expect(process.env['ME3_PROTON_LAUNCH_VERB']).toBe('run');
  });

  it('does not launch without an active profile', () => {
    stagePackagedMe3();
    openTestStore({ activeProfileId: 'missing', profiles: [] });

    expect(() => launchEldenRingModded()).toThrow(/No active profile/);
    expect(spawn).not.toHaveBeenCalled();
  });

  it('does not launch when me3 is missing', () => {
    openStoreWithProfile();

    expect(() => launchEldenRingModded()).toThrow(/Bundled ME3 executable not found/);
    expect(writeMe3Profile).not.toHaveBeenCalled();
    expect(spawn).not.toHaveBeenCalled();
  });
});
