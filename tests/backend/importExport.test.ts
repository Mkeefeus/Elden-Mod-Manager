import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GeneralSettings } from 'types';
import { exportSettings, importSettings } from '@backend/importExport';
import { setGeneralSettings } from '@backend/db/api';
import { makeTempDir } from '../helpers/tempDir';

const state = vi.hoisted(() => ({
  settings: {
    rememberLastPage: true,
    checkForModUpdatesOnStartup: true,
    checkForAppUpdatesOnStartup: true,
  },
  folder: '',
}));

// Folders are pointed at a real temp directory so the import's "does this path exist" checks pass
vi.mock('@backend/db/api', () => ({
  getModsFolder: () => state.folder,
  getToolsDirectory: () => state.folder,
  getEldenRingFolder: () => state.folder,
  setModsFolder: vi.fn(),
  setToolsDirectory: vi.fn(),
  setEldenRingFolder: vi.fn(),
  getGeneralSettings: () => ({ ...state.settings }),
  setGeneralSettings: vi.fn((value: GeneralSettings) => {
    state.settings = value;
  }),
}));

let dir: string;

// Writes a settings export file (valid folders/version unless overridden) and returns its path
const writeExportFile = (overrides: Record<string, unknown> = {}) => {
  const file = join(dir, 'import.json');
  writeFileSync(
    file,
    JSON.stringify({ version: 1, modFolderPath: dir, toolFolderPath: dir, eldenRingFolder: dir, ...overrides })
  );
  return file;
};

beforeEach(() => {
  dir = makeTempDir('emm-import-');
  state.folder = dir;
  state.settings = {
    rememberLastPage: true,
    checkForModUpdatesOnStartup: true,
    checkForAppUpdatesOnStartup: true,
  };
});

describe('exportSettings', () => {
  it('writes the current general settings to the file', () => {
    state.settings = { ...state.settings, checkForModUpdatesOnStartup: false };
    const dest = join(dir, 'export.json');

    exportSettings(dest);

    const exported = JSON.parse(readFileSync(dest, 'utf-8')) as { version: number; generalSettings: GeneralSettings };
    expect(exported.version).toBe(1);
    expect(exported.generalSettings).toEqual(state.settings);
  });
});

describe('importSettings: general settings', () => {
  it('applies every imported setting', () => {
    const imported = {
      rememberLastPage: false,
      checkForModUpdatesOnStartup: false,
      checkForAppUpdatesOnStartup: false,
    };

    importSettings(writeExportFile({ generalSettings: imported }));

    expect(state.settings).toEqual(imported);
  });

  it('leaves current settings alone when the file has no generalSettings (older export)', () => {
    state.settings = { ...state.settings, rememberLastPage: false };

    importSettings(writeExportFile());

    expect(setGeneralSettings).not.toHaveBeenCalled();
    expect(state.settings.rememberLastPage).toBe(false);
  });

  it('merges a partial generalSettings with the current settings', () => {
    state.settings = { ...state.settings, checkForAppUpdatesOnStartup: false };

    importSettings(writeExportFile({ generalSettings: { rememberLastPage: false } }));

    expect(state.settings).toEqual({
      rememberLastPage: false,
      checkForModUpdatesOnStartup: true,
      checkForAppUpdatesOnStartup: false,
    });
  });

  it('ignores values of the wrong type but still applies the valid ones', () => {
    importSettings(
      writeExportFile({ generalSettings: { rememberLastPage: 'yes', checkForModUpdatesOnStartup: false } })
    );

    expect(state.settings).toEqual({
      rememberLastPage: true,
      checkForModUpdatesOnStartup: false,
      checkForAppUpdatesOnStartup: true,
    });
  });

  it('ignores keys that are not general settings', () => {
    importSettings(writeExportFile({ generalSettings: { rememberLastPage: false, somethingElse: true } }));

    expect(state.settings).toEqual({
      rememberLastPage: false,
      checkForModUpdatesOnStartup: true,
      checkForAppUpdatesOnStartup: true,
    });
    expect(state.settings).not.toHaveProperty('somethingElse');
  });

  it('does not change anything for an array', () => {
    importSettings(writeExportFile({ generalSettings: [false, false, false] }));

    expect(state.settings).toEqual({
      rememberLastPage: true,
      checkForModUpdatesOnStartup: true,
      checkForAppUpdatesOnStartup: true,
    });
  });

  it.each([
    ['null', null],
    ['a string', 'rememberLastPage'],
    ['a number', 1],
  ])('rejects the file when generalSettings is %s', (_label, value) => {
    expect(() => importSettings(writeExportFile({ generalSettings: value }))).toThrow(/not a valid settings export/);
    expect(setGeneralSettings).not.toHaveBeenCalled();
  });
});
