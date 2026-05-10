export type Dict<T> = { [key: string]: T };

export interface LogEntry {
  level: 'info' | 'warning' | 'error';
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
  name: string;
  installDate: number;
  dllFile?: string;
  exe?: string;
  loadEarly?: boolean;
  finalizer?: string;
  initializer?: NativeInitializerCondition;
  version?: string;
  nexusModId?: number;
  nexusFileId?: number;
  nexusGameDomain?: string;
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
  finalizer?: string;
  initializer?: NativeInitializerCondition;
  modVersion?: string;
  nexusModId?: number;
  nexusFileId?: number;
  nexusGameDomain?: string;
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

export type BrowseType = 'archive' | 'dll' | 'exe' | 'binary' | 'directory';

export type ProfileModRef = {
  modUuid: string;
  loadBefore?: Dependent[];
  loadAfter?: Dependent[];
};

export type ModProfile = {
  uuid: string;
  name: string;
  createdAt: number;
  mods: ProfileModRef[];
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

export type ExportedSettings = {
  version: 1;
  modEnginePath: string;
  modFolderPath: string;
  eldenRingFolder: string;
  noBootBoost: boolean;
  showLogos: boolean;
  skipSteamInit: boolean;
};

export type DownloadStatus = 'downloading' | 'extracting' | 'ready' | 'error';

export type DownloadState = {
  id: string;
  filename: string;
  status: DownloadStatus;
  progress: number;
  source: 'nexus' | 'local';
  extractedPath?: string;
  error?: string;
  nexusModId?: number;
  nexusFileId?: number;
  nexusGameDomain?: string;
  nexusSuggestedModName?: string;
  nexusVersion?: string;
};
