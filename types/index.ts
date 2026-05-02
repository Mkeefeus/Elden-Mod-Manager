export type Dict<T> = { [key: string]: T };

export interface LogEntry {
  level: string;
  message: string;
  hideDisplay?: boolean;
}

export interface LatestRelease {
  version: string;
  url: string;
}

export type NativeInitializerCondition = { delay: { ms: number } } | { function: string };

export type Dependent = {
  id: string;
  optional: boolean;
};

export type Mod = {
  uuid: string;
  enabled: boolean;
  name: string;
  installDate: number;
  dllFile?: string;
  exe?: string;
  loadEarly?: boolean;
  loadFirst?: boolean;
  loadLast?: boolean;
  loadBefore?: Dependent[];
  loadAfter?: Dependent[];
  optional?: boolean;
  finalizer?: string;
  initializer?: NativeInitializerCondition;
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
  optional: boolean;
  finalizer: string;
  initializerType: 'none' | 'delay' | 'function';
  initializerDelayMs: number;
  initializerFunction: string;
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
  disableArxan: boolean;
  noMemPatch: boolean;
};

export type Dependency = {
  licenses: string;
  repository: string;
  licenseUrl: string;
  parents: string[];
};

export type WindowState = {
  width: number;
  height: number;
  x: number;
  y: number;
  displayId: number;
};
