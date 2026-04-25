import { Mod, ModProfile } from 'types';
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
  savefile: string;
  startOnline: boolean;
  profiles: ModProfile[];
  activeProfileId: string;
};

const schema: Schema<DBSchema> = {
  mods: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        uuid: { type: 'string' },
        enabled: { type: 'boolean' },
        name: { type: 'string' },
        installDate: { type: 'number' },
        dllFile: { type: 'string' },
        loadEarly: { type: 'boolean' },
        loadBefore: { type: 'array', items: { type: 'string' } },
        loadAfter: { type: 'array', items: { type: 'string' } },
      },
      required: ['uuid', 'enabled', 'name', 'installDate'],
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
  savefile: {
    type: 'string',
    default: '',
  },
  startOnline: {
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
        mods: { type: 'array' },
        savefile: { type: 'string' },
        startOnline: { type: 'boolean' },
      },
      required: ['uuid', 'name', 'createdAt', 'mods', 'savefile', 'startOnline'],
    },
    default: [],
  },
  activeProfileId: {
    type: 'string',
    default: '',
  },
};

export default schema;
