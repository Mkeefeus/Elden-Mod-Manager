export type Dict<T> = { [key: string]: T };

export type Mod = {
  enabled: boolean;
  loadOrder?: number;
  name: string;
  installDate: number;
  isDll: boolean;
  isFileMod: boolean;
};
