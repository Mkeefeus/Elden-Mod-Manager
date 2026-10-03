import type { GeneralSettings, Mod, ModProfile, Tool } from 'types';

// Minimal valid records for tests. Pass only the fields a test cares about.

export const makeMod = (overrides: Partial<Mod> & Pick<Mod, 'uuid' | 'name'>): Mod => ({
  installDate: 1_700_000_000_000,
  ...overrides,
});

export const makeProfile = (overrides: Partial<ModProfile> & Pick<ModProfile, 'uuid' | 'name'>): ModProfile => ({
  createdAt: 1_700_000_000_000,
  mods: [],
  startOnline: false,
  disableArxan: false,
  noMemPatch: false,
  noBootBoost: false,
  showLogos: false,
  skipSteamInit: false,
  ...overrides,
});

export const makeTool = (overrides: Partial<Tool> & Pick<Tool, 'id' | 'name' | 'executablePath'>): Tool => ({
  installDate: 1_700_000_000_000,
  ...overrides,
});

export const ALL_GENERAL_SETTINGS_ON: GeneralSettings = {
  rememberLastPage: true,
  checkForModUpdatesOnStartup: true,
  checkForAppUpdatesOnStartup: true,
};
