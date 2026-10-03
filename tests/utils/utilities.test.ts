import { describe, expect, it, vi } from 'vitest';
import { CreateModPathFromName, errToString, formatUsShortDate, generateUUID, normalizePath } from '@utils/utilities';

describe('CreateModPathFromName', () => {
  // This slug is the mod's folder name on disk, so changing its output orphans every installed mod's folder
  it.each([
    ['Seamless Co-op', '1.9.1', 'seamless-co-op-1.9.1'],
    ['Seamless Co-op', undefined, 'seamless-co-op'],
    ['Seamless Co-op', '   ', 'seamless-co-op'],
    ['  My   Mod  ', ' 1.0 ', 'my-mod-1.0'],
    ['Mod', 'v1.2', 'mod-v1.2'],
  ])('builds the folder name for %j version %j', (name, version, expected) => {
    expect(CreateModPathFromName(name, version)).toBe(expected);
  });

  it.each([
    ['Mod 1.2', '1.2', 'mod-1.2'],
    ['Mod v1.2', '1.2', 'mod-v1.2'],
    ['Mod V1.2', 'v1.2', 'mod-v1.2'],
    ['Mod version 2', '2', 'mod-version-2'],
  ])('does not repeat a version already at the end of the name (%j, %j)', (name, version, expected) => {
    expect(CreateModPathFromName(name, version)).toBe(expected);
  });

  it('only skips the version when it is a separate trailing word', () => {
    expect(CreateModPathFromName('Mod11.2', '1.2')).toBe('mod11.2-1.2');
  });
});

describe('errToString', () => {
  it('returns the message of an Error', () => {
    expect(errToString(new Error('boom'))).toBe('boom');
  });

  it('passes a thrown string through', () => {
    expect(errToString('plain failure')).toBe('plain failure');
  });
});

describe('generateUUID', () => {
  it('draws again when the first UUID is already taken', () => {
    const taken = '00000000-0000-0000-0000-000000000001';
    const fresh = '00000000-0000-0000-0000-000000000002';
    vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce(taken).mockReturnValueOnce(fresh);

    expect(generateUUID([taken])).toBe(fresh);
  });

  it('returns a UUID when no existing IDs are given', () => {
    expect(generateUUID()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});

describe('formatUsShortDate', () => {
  it('formats as MM/DD/YYYY', () => {
    expect(formatUsShortDate(new Date(2024, 0, 5))).toBe('01/05/2024');
  });
});

describe('normalizePath', () => {
  it('uses backslashes on Windows', () => {
    vi.stubGlobal('window', { electronAPI: { platform: 'win32' } });
    expect(normalizePath('C:/Games/ELDEN RING/Game')).toBe('C:\\Games\\ELDEN RING\\Game');
  });

  it('uses forward slashes elsewhere', () => {
    vi.stubGlobal('window', { electronAPI: { platform: 'linux' } });
    expect(normalizePath('mods\\seamless-co-op\\ersc.dll')).toBe('mods/seamless-co-op/ersc.dll');
  });
});
