import { beforeEach, describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { makeMod } from '../helpers/fixtures';
import { countFileListRequests, makeNexusFile, stubNexusApi } from '../helpers/nexus';

type NexusModule = typeof import('@backend/nexus');

// nexus.ts caches file lists for the whole session at module level, so load a fresh copy for each test
let nexus: NexusModule;
beforeEach(async () => {
  vi.resetModules();
  nexus = await import('@backend/nexus');
});

const nexusMod = (uuid: string, nexusFileId: number | undefined, extra: Parameters<typeof makeMod>[0] | object = {}) =>
  makeMod({ uuid, name: `Mod ${uuid}`, nexusModId: 510, nexusGameDomain: 'eldenring', nexusFileId, ...extra });

describe('parseNexusMetadata', () => {
  it('reads the game, mod and file from the mod page URL', () => {
    expect(
      nexus.parseNexusMetadata('https://www.nexusmods.com/eldenring/mods/510?tab=files&file_id=50243', [])
    ).toEqual({ modId: 510, gameDomain: 'eldenring', fileId: 50243 });
  });

  it('leaves fileId undefined when the page URL has none', () => {
    expect(nexus.parseNexusMetadata('https://www.nexusmods.com/eldenring/mods/510', [])).toEqual({
      modId: 510,
      gameDomain: 'eldenring',
      fileId: undefined,
    });
  });

  it('prefers the page URL over the download URL chain', () => {
    const result = nexus.parseNexusMetadata('https://www.nexusmods.com/eldenring/mods/510', [
      'https://cf-files.nexus-cdn.com/4333/999/file.zip',
    ]);
    expect(result?.modId).toBe(510);
  });

  it('falls back to a legacy CDN URL shaped like /<gameId>/<modId>/<file>', () => {
    expect(
      nexus.parseNexusMetadata('https://www.google.com', [
        'https://example.com/redirect',
        'https://cf-files.nexus-cdn.com/4333/3295/Fog%20Gate.zip?md5=abc',
      ])
    ).toEqual({ modId: 3295, gameDomain: 'eldenring' });
  });

  it.each([
    ['a page for an unsupported game', 'https://www.nexusmods.com/skyrimspecialedition/mods/266', []],
    ['a content-hash CDN URL', undefined, ['https://supporter-files.nexus-cdn.com/f8/06/b4/0f3c1e2a']],
    ['malformed URLs', 'not a url', ['also not a url']],
    ['nothing at all', undefined, []],
  ])('returns undefined for %s', (_label, pageUrl, chain) => {
    expect(nexus.parseNexusMetadata(pageUrl, chain)).toBeUndefined();
  });
});

describe('checkModsForUpdates', () => {
  it('skips mods that were not installed from Nexus', async () => {
    const fetchMock = stubNexusApi({});
    const result = await nexus.checkModsForUpdates([makeMod({ uuid: 'local', name: 'Local Mod' })]);

    expect(result).toEqual({});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports no update when the installed file is the newest in its group', async () => {
    stubNexusApi({
      files: { 510: [makeNexusFile({ fileId: 1, date: 200 }), makeNexusFile({ fileId: 2, date: 100 })] },
    });

    expect(await nexus.checkModsForUpdates([nexusMod('a', 1)])).toEqual({ a: { hasUpdate: false } });
  });

  it('reports the newest file in the same group as the update', async () => {
    stubNexusApi({
      files: {
        510: [
          makeNexusFile({ fileId: 1, version: '1.0', date: 100 }),
          makeNexusFile({ fileId: 2, version: '1.1', date: 200 }),
          makeNexusFile({ fileId: 3, version: '1.2', date: 300 }),
        ],
      },
    });

    expect(await nexus.checkModsForUpdates([nexusMod('a', 1)])).toEqual({
      a: { hasUpdate: true, latestVersion: '1.2', latestFileId: 3 },
    });
  });

  it('ignores newer files from a different group, like optional add-ons', async () => {
    stubNexusApi({
      files: {
        510: [
          makeNexusFile({ fileId: 1, groupId: 1, date: 100 }),
          makeNexusFile({ fileId: 2, groupId: 2, category: 'OPTIONAL', date: 500 }),
          makeNexusFile({ fileId: 3, groupId: 2, category: 'MAIN', date: 600 }),
        ],
      },
    });

    expect(await nexus.checkModsForUpdates([nexusMod('a', 1)])).toEqual({ a: { hasUpdate: false } });
  });

  it('never offers archived or removed files', async () => {
    stubNexusApi({
      files: {
        510: [
          makeNexusFile({ fileId: 1, date: 100 }),
          makeNexusFile({ fileId: 2, category: 'ARCHIVED', date: 200 }),
          makeNexusFile({ fileId: 3, category: 'REMOVED', date: 300 }),
        ],
      },
    });

    expect(await nexus.checkModsForUpdates([nexusMod('a', 1)])).toEqual({ a: { hasUpdate: false } });
  });

  it("falls back to the page's main files when the installed file's group was retired", async () => {
    stubNexusApi({
      files: {
        510: [
          makeNexusFile({ fileId: 1, groupId: 1, category: 'ARCHIVED', date: 100 }),
          makeNexusFile({ fileId: 2, groupId: 9, category: 'MAIN', version: '2.0', date: 200 }),
          makeNexusFile({ fileId: 3, groupId: 8, category: 'OPTIONAL', version: 'extra', date: 300 }),
        ],
      },
    });

    expect(await nexus.checkModsForUpdates([nexusMod('a', 1)])).toEqual({
      a: { hasUpdate: true, latestVersion: '2.0', latestFileId: 2 },
    });
  });

  it('compares against main files when the installed file has no group', async () => {
    stubNexusApi({
      files: {
        510: [
          makeNexusFile({ fileId: 1, groupId: null, date: 100 }),
          makeNexusFile({ fileId: 2, groupId: null, version: '2.0', date: 200 }),
        ],
      },
    });

    expect((await nexus.checkModsForUpdates([nexusMod('a', 1)])).a).toMatchObject({ hasUpdate: true, latestFileId: 2 });
  });

  it('finds the installed file by version when the file id is unknown', async () => {
    stubNexusApi({
      files: {
        510: [
          makeNexusFile({ fileId: 1, version: '1.0', date: 100 }),
          makeNexusFile({ fileId: 2, version: '1.1', date: 200 }),
        ],
      },
    });

    expect((await nexus.checkModsForUpdates([nexusMod('a', undefined, { version: '1.0' })])).a).toMatchObject({
      hasUpdate: true,
      latestFileId: 2,
    });
  });

  it('reports no update when the installed file is no longer on Nexus', async () => {
    stubNexusApi({ files: { 510: [makeNexusFile({ fileId: 2, date: 200 })] } });

    expect(await nexus.checkModsForUpdates([nexusMod('a', 1)])).toEqual({ a: { hasUpdate: false } });
  });

  it('does not flag an old version when the newest is already installed alongside it', async () => {
    stubNexusApi({
      files: { 510: [makeNexusFile({ fileId: 1, date: 100 }), makeNexusFile({ fileId: 2, date: 200 })] },
    });

    expect(await nexus.checkModsForUpdates([nexusMod('old', 1), nexusMod('new', 2)])).toEqual({
      old: { hasUpdate: false },
      new: { hasUpdate: false },
    });
  });

  it('makes one request for mods that share a Nexus page', async () => {
    const fetchMock = stubNexusApi({ files: { 510: [makeNexusFile({ fileId: 1 }), makeNexusFile({ fileId: 2 })] } });

    await nexus.checkModsForUpdates([nexusMod('a', 1), nexusMod('b', 2)]);
    await nexus.checkModsForUpdates([nexusMod('a', 1)]);

    expect(countFileListRequests(fetchMock)).toBe(1);
  });

  it('treats a failed request as no update, without affecting other mod pages', async () => {
    stubNexusApi({
      files: {
        77: [makeNexusFile({ fileId: 10, modId: 77, date: 100 }), makeNexusFile({ fileId: 11, modId: 77, date: 200 })],
      },
      failingMods: [510],
    });

    const result = await nexus.checkModsForUpdates([nexusMod('broken', 1), nexusMod('ok', 10, { nexusModId: 77 })]);

    expect(result.broken).toEqual({ hasUpdate: false });
    expect(result.ok).toMatchObject({ hasUpdate: true, latestFileId: 11 });
  });

  it('retries a failed request on the next check instead of caching the failure', async () => {
    const fetchMock = stubNexusApi({ failingMods: [510] });

    await nexus.checkModsForUpdates([nexusMod('a', 1)]);
    await nexus.checkModsForUpdates([nexusMod('a', 1)]);

    expect(countFileListRequests(fetchMock)).toBe(2);
  });

  it('treats an unsupported game as no update without calling Nexus', async () => {
    const fetchMock = stubNexusApi({});

    expect(await nexus.checkModsForUpdates([nexusMod('a', 1, { nexusGameDomain: 'skyrim' })])).toEqual({
      a: { hasUpdate: false },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('resolveNexusFileDetails', () => {
  it('matches the downloaded filename to a file, ignoring encoding, + signs and the archive extension', async () => {
    stubNexusApi({
      files: {
        510: [makeNexusFile({ fileId: 7, version: ' 1.9.1 ', uri: 'Seamless Co-op-510-1-9-1-1700000000.zip' })],
      },
      modNames: { 510: '  Seamless Co-op ' },
    });

    expect(await nexus.resolveNexusFileDetails('eldenring', 510, 'Seamless+Co-op-510-1-9-1-1700000000.7z')).toEqual({
      fileId: 7,
      suggestedModName: 'Seamless Co-op',
      modVersion: '1.9.1',
    });
  });

  it('returns nothing when the filename matches more than one file', async () => {
    stubNexusApi({
      files: { 510: [makeNexusFile({ fileId: 1, uri: 'Mod.zip' }), makeNexusFile({ fileId: 2, uri: 'Mod.7z' })] },
    });

    expect(await nexus.resolveNexusFileDetails('eldenring', 510, 'Mod.zip')).toBeUndefined();
  });

  it('still resolves the file when the mod name lookup fails', async () => {
    stubNexusApi({ files: { 510: [makeNexusFile({ fileId: 1, uri: 'Mod.zip', version: '' })] }, failDetails: true });

    expect(await nexus.resolveNexusFileDetails('eldenring', 510, 'Mod.zip')).toEqual({
      fileId: 1,
      suggestedModName: undefined,
      modVersion: undefined,
    });
  });
});

describe('resolveNexusFileById', () => {
  it('picks the file with the given id', async () => {
    stubNexusApi({
      files: { 510: [makeNexusFile({ fileId: 1, version: '1.0' }), makeNexusFile({ fileId: 2, version: '2.0' })] },
    });

    expect(await nexus.resolveNexusFileById('eldenring', 510, 2)).toMatchObject({ fileId: 2, modVersion: '2.0' });
  });

  it('returns nothing for an unknown id', async () => {
    stubNexusApi({ files: { 510: [makeNexusFile({ fileId: 1 })] } });

    expect(await nexus.resolveNexusFileById('eldenring', 510, 99)).toBeUndefined();
  });
});
