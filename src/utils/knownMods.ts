import { FormRulesRecord, UseFormReturnType } from '@mantine/form';
import { ModConfigFormValues } from 'types';
import { sendLog } from '@utils/rendererLogger';
import { normalizePath } from '@utils/utilities';

type FormType = UseFormReturnType<ModConfigFormValues, ModConfigFormValues, FormRulesRecord<ModConfigFormValues>>;
type NexusModID = number;

const debug = (msg: string) =>
  sendLog({
    level: 'debug',
    message: `${msg}`,
  });

const KNOWN_MODS: Record<NexusModID, Partial<ModConfigFormValues>> = {
  428: {
    modName: 'Item and Enemy Randomizer',
    hasTool: true,
    toolName: 'Item and Enemy Randomizer',
    exePath: 'EldenRingRandomizer.exe',
    path: '%s/randomizer',
  },
  510: {
    modName: 'Seamless Co-op',
    isDll: true,
    dllPath: 'ersc.dll',
    path: '%s/SeamlessCoop',
  },
  3295: {
    modName: 'Fog Gate Randomizer',
    hasTool: true,
    toolName: 'Fog Gate Randomizer',
    exePath: 'FogMod.exe',
    path: '%s/fog',
  },
  6983: {
    modName: 'Bingo Brawlers Season 4 Mod',
    hasTool: true,
    toolName: 'Bingo Brawlers Season 4 Mod',
    exePath: 'ERBingo Randomizer.exe',
    path: '%s/Bingo Season 4 with Optional Fog Wall',
  },
  8811: {
    modName: 'Bingo Brawlers Season 5 Mod',
    hasTool: true,
    toolName: 'Bingo Brawlers Season 5 Mod',
    exePath: 'ERBingo Randomizer.exe',
    path: '%s/Bingo Season 6 Release Candidate 69420',
  },
  9972: {
    modName: 'Bingo Brawlers Season 6 Mod',
    hasTool: true,
    toolName: 'Bingo Brawlers Season 6 Mod',
    exePath: 'ERBingoRandomizerUI.exe',
    path: '%s/Bingo Randomizer',
  },
};

export const processKnownMod = (modId: NexusModID, form: FormType, basePath?: string) => {
  const knownModTemplate = KNOWN_MODS[modId];
  if (!knownModTemplate) {
    debug(`No known mod configuration found for mod ID: ${modId}`);
    return;
  }

  // Clone the known-mod config so we never mutate the shared template.
  const knownMod: Partial<ModConfigFormValues> = { ...knownModTemplate };

  if (knownModTemplate.path) {
    const currentPath = basePath?.trim() || form.values.path?.trim();
    if (currentPath) {
      const resolvedPath = normalizePath(knownModTemplate.path).replace(/%s/g, currentPath);
      if (currentPath !== resolvedPath) {
        debug(`Overriding existing path "${currentPath}" with known mod path "${resolvedPath}" for mod ID: ${modId}`);
      }
      knownMod.path = resolvedPath;
    } else {
      delete knownMod.path;
    }
  }

  debug(`Processing known mod configuration for ${knownMod.modName} (ID: ${modId})`);
  form.setValues({
    ...form.values,
    ...knownMod,
  });
};

export const isKnownMod = (modId: NexusModID): boolean => {
  return modId in KNOWN_MODS;
};
