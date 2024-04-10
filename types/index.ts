export type Dict<T> = { [key: string]: T };

export type Mod = {
  uuid: string;
  enabled: boolean;
  loadOrder?: number;
  name: string;
  installDate: number;
  dllFile?: string;
  exe?: string;
};

export type AddModFormValues = {
  modName: string;
  isDll: boolean;
  path: string;
  delete: boolean;
  hasExe: boolean;
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

export type BrowseType = 'zip' | 'dll' | 'exe' | 'directory';
