import { Mod } from 'types';
import { Schema } from 'electron-store';

export type DBSchema = {
  mods: Mod[];
  modEnginePath: string;
  eldenRingPath: string;
  modFolderPath: string;
  firstRun: boolean;
};

const INSTALL_DIR = process.cwd();

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
    default: '',
  },
  eldenRingPath: {
    type: 'string',
    default: '',
  },
  modFolderPath: {
    type: 'string',
    default: `${INSTALL_DIR}\\mods`,
  },
  firstRun: {
    type: 'boolean',
    default: true,
  },
};

export default schema;
