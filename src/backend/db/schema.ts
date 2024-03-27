import { Mod } from 'types';
import { Schema } from 'electron-store';

const debugMods: Mod[] = [
  {
    uuid: '1a4cf2fb-1f99-4e39-b9a3-1aae9ed58865',
    enabled: true,
    loadOrder: 2,
    name: 'Seemless Co-Op',
    installDate: 1621483200000,
    isDll: true,
  },
  {
    uuid: '0785a376-d5fe-43df-b4f8-d5bed9f6008e',
    enabled: false,
    name: 'Item and Enemy Randomizer',
    installDate: 1600574400000,
    isDll: false,
  },
  {
    uuid: '64bb53fe-94f5-42b0-9e9d-3b4dde3bf426',
    enabled: true,
    loadOrder: 1,
    name: 'Melania Big Tiddy Mod',
    installDate: 1665374400000,
    isDll: false,
  },
  {
    uuid: 'f6beac13-19c9-4f49-9f72-0377380393f6',
    enabled: true,
    loadOrder: 3,
    name: 'Doom Eternal',
    installDate: 1621483200000,
    isDll: true,
  },
];

export type DBSchema = {
  mods: Mod[];
  eldenRingPath: string;
  modEndinePath: string;
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
        isDll: { type: 'boolean' },
      },
      required: ['uuid', 'enabled', 'name', 'installDate', 'isDll'],
    },
    default: debugMods,
  },
  eldenRingPath: {
    type: 'string',
    default: '',
  },
  modEndinePath: {
    type: 'string',
    default: '',
  },
};

export default schema;
