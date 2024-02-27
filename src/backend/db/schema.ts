import { Mod } from 'types';
import { Schema } from 'electron-store';

const debugMods: Mod[] = [
  {
    enabled: true,
    loadOrder: 2,
    name: 'Seemless Co-Op',
    installDate: 1621483200000,
    isDll: true,
    isFileMod: false,
  },
  {
    enabled: false,
    name: 'Item and Enemy Randomizer',
    installDate: 1600574400000,
    isDll: false,
    isFileMod: true,
  },
  {
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
        enabled: { type: 'boolean' },
        loadOrder: { type: 'number' },
        name: { type: 'string' },
        installDate: { type: 'number' },
        isDll: { type: 'boolean' },
        isFileMod: { type: 'boolean' },
      },
      required: ['enabled', 'name', 'installDate', 'isDll', 'isFileMod'],
    },
    default: debugMods,
  },
};

export default schema;
