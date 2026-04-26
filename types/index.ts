export type Dict<T> = { [key: string]: T };

export interface LogEntry {
  level: string;
  message: string;
  hideDisplay?: boolean;
}

export type Mod = {
  uuid: string;
  enabled: boolean;
  name: string;
  installDate: number;
  dllFile?: string;
  exe?: string;
  loadEarly?: boolean;
  loadBefore?: string[];
  loadAfter?: string[];
};

export type AddModFormValues = {
  modName: string;
  isDll: boolean;
  path: string;
  delete: boolean;
  hasExe: boolean;
  exePath: string;
  dllPath: string;
  loadEarly: boolean;
};

export type NewsComponentProps = {
  title: string;
  body: string;
  imageLink: string;
  author: string;
  authorAvatar: string;
  postCategory: string[];
  postDate: string;
};

export type BrowseType = 'zip' | 'dll' | 'exe' | 'binary' | 'directory';

export type ModProfile = {
  uuid: string;
  name: string;
  createdAt: number;
  mods: Mod[];
  savefile: string;
  startOnline: boolean;
};

export type Dependency = {
  licenses: string;
  repository: string;
  licenseUrl: string;
  parents: string[];
};
