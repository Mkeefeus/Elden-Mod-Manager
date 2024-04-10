import { Mod } from 'types';
import { Schema } from 'electron-store';

export type DBSchema = {
  mods: Mod[];
  eldenRingPath: string;
  modEnginePath: string;
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
  eldenRingPath: {
    type: 'string',
    default: '',
  },
  modEnginePath: {
    type: 'string',
    default: '',
  },
};

export default schema;
