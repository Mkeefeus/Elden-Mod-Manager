export type Dict<T> = { [key: string]: T };

export type Mod = {
  uuid: string;
  enabled: boolean;
  loadOrder?: number;
  name: string;
  installDate: number;
  isDll: boolean;
  isFileMod: boolean;
};
