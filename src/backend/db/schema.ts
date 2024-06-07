import { Mod } from 'types';
import { Schema } from 'electron-store';
import { app } from 'electron';

export type DBSchema = {
  mods: Mod[];
  modEnginePath: string;
  eldenRingFolder: string;
  modFolderPath: string;
  firstRun: boolean;
  promptedModsFolder: boolean;
};

const schema: Schema<DBSchema> = {
  mods: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        uuid: { type: 'string' },
        enabled: { type: 'boolean' },
        loadOrder: { type: 'number' },
        name: { type: 'string' },
        installDate: { type: 'number' },
        dllFile: { type: 'string' },
      },
      required: ['uuid', 'enabled', 'name', 'installDate'],
    },
    default: [],
  },
  modEnginePath: {
    type: 'string',
    default: app.getPath('userData') + '\\ModEngine\\',
  },
  eldenRingFolder: {
    type: 'string',
    default: '',
  },
  modFolderPath: {
    type: 'string',
    default: app.getPath('userData') + '\\mods\\',
  },
  firstRun: {
    type: 'boolean',
    default: true,
  },
  promptedModsFolder: {
    type: 'boolean',
    default: false,
  },
};

export default schema;
