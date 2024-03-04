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
    isFileMod: false,
  },
  {
    uuid: '0785a376-d5fe-43df-b4f8-d5bed9f6008e',
    enabled: false,
    name: 'Item and Enemy Randomizer',
    installDate: 1600574400000,
    isDll: false,
    isFileMod: true,
  },
  {
    uuid: '64bb53fe-94f5-42b0-9e9d-3b4dde3bf426',
    enabled: true,
    loadOrder: 1,
    name: 'Melania Big Tiddy Mod',
    installDate: 1665374400000,
    isDll: false,
    isFileMod: true,
  },
];

export interface ModSchema {
  mods: {
    type: string;
    items: {
      type: string;
      properties: {
        uuid: {
          type: string;
        };
        enabled: {
          type: string;
        };
        loadOrder: {
          type: string;
        };
        name: {
          type: string;
        };
        installDate: {
          type: string;
        };
        isDll: {
          type: string;
        };
        isFileMod: {
          type: string;
        };
      };
      required: string[];
    };
    default: Mod[];
  };
}

const schema: Schema<ModSchema> = {
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
        isFileMod: { type: 'boolean' },
      },
      required: ['uuid', 'enabled', 'name', 'installDate', 'isDll', 'isFileMod'],
    },
    default: debugMods,
  },
};

export default schema;
