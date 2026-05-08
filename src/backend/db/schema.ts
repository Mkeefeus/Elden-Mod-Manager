import { Mod, ModProfile, WindowState } from 'types';
import { Schema } from 'electron-store';
import { app } from 'electron';
import { join } from 'path';

export type DBSchema = {
  mods: Mod[];
  modEnginePath: string;
  eldenRingFolder: string;
  modFolderPath: string;
  firstRun: boolean;
  promptedModsFolder: boolean;
  profiles: ModProfile[];
  activeProfileId: string;
  noBootBoost: boolean;
  showLogos: boolean;
  skipSteamInit: boolean;
  windowSate: WindowState;
  nexusApiKey?: string;
};

const schema: Schema<DBSchema> = {
  mods: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        uuid: { type: 'string' },
        name: { type: 'string' },
        installDate: { type: 'number' },
        dllFile: { type: 'string' },
        exe: { type: 'string' },
        loadEarly: { type: 'boolean' },
        loadFirst: { type: 'boolean' },
        loadLast: { type: 'boolean' },
        optional: { type: 'boolean' },
        finalizer: { type: 'string' },
        initializer: { type: 'object' },
        version: { type: 'string' },
        loadBefore: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              optional: { type: 'boolean' },
            },
          },
        },
        loadAfter: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              optional: { type: 'boolean' },
            },
          },
        },
        nexusModId: { type: 'number' },
        nexusFileId: { type: 'number' },
        nexusGameDomain: { type: 'string' },
      },
      required: ['uuid', 'name', 'installDate'],
    },
    default: [],
  },
  modEnginePath: {
    type: 'string',
    default: '',
  },
  eldenRingFolder: {
    type: 'string',
    default: '',
  },
  modFolderPath: {
    type: 'string',
    default: join(app.getPath('userData'), 'mods'),
  },
  firstRun: {
    type: 'boolean',
    default: true,
  },
  promptedModsFolder: {
    type: 'boolean',
    default: false,
  },
  profiles: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        uuid: { type: 'string' },
        name: { type: 'string' },
        createdAt: { type: 'number' },
        mods: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
        savefile: { type: 'string' },
        startOnline: { type: 'boolean' },
        disableArxan: { type: 'boolean' },
        noMemPatch: { type: 'boolean' },
      },
      required: ['uuid', 'name', 'createdAt', 'mods', 'savefile', 'startOnline', 'disableArxan', 'noMemPatch'],
    },
    default: [],
  },
  activeProfileId: {
    type: 'string',
    default: '',
  },
  noBootBoost: {
    type: 'boolean',
    default: false,
  },
  showLogos: {
    type: 'boolean',
    default: false,
  },
  skipSteamInit: {
    type: 'boolean',
    default: false,
  },
  windowSate: {
    type: 'object',
    properties: {
      width: { type: 'number' },
      height: { type: 'number' },
      x: { type: 'number' },
      y: { type: 'number' },
      displayId: { type: 'number' },
    },
    default: { width: 1280, height: 720, x: 0, y: 0, displayId: 0 },
  },
  nexusApiKey: {
    type: 'string',
    default: '',
  },
};

export default schema;
