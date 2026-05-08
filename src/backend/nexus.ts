import { version } from '../../package.json';
import { logger } from '../utils/mainLogger';
import { NexusUser } from 'types';

const { debug } = logger;

const NEXUS_V1_API_BASE_URL = 'https://api.nexusmods.com/v1';
const NEXUS_V3_API_BASE_URL = 'https://api.nexusmods.com/v3';

export type NexusDownloadMeta = {
  modId: number;
  gameDomain: string;
};

export type ResolvedNexusFile = {
  fileId: number;
  suggestedModName?: string;
  modVersion?: string;
};

export type NexusDownloadLink = {
  name: string;
  short_name: string;
  URI: string;
};

type NexusModFile = {
  id?: [number, number];
  uid?: number;
  file_id: number;
  name?: string;
  file_name?: string;
  version?: string;
  category_id?: number;
  category_name?: string;
  is_primary?: boolean;
  uploaded_timestamp?: number;
  uploaded_time?: string;
  mod_version?: string;
  description?: string | null;
  changelog_html?: string | null;
  content_preview_link?: string;
};

type NexusFileUpdate = {
  old_file_id: number;
  new_file_id: number;
  old_file_name: string;
  new_file_name: string;
  uploaded_timestamp?: number;
  uploaded_time?: string;
};

type NexusFilesResponse = {
  files?: NexusModFile[];
  file_updates?: NexusFileUpdate[];
};

type NexusModDetailsResponse = {
  name?: string;
  data?: {
    name?: string;
  };
};

const GAME_ID_MAP: Record<number, string> = {
  4333: 'eldenring',
};

const buildHeaders = (apiKey: string) => ({
  apikey: apiKey,
  'Content-Type': 'application/json',
  'Application-Version': version,
  'Application-Name': 'Elden Mod Manager',
});

const safeDecode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const stripArchiveExtension = (value: string) => value.replace(/\.(zip|7z|rar)$/i, '');

const normalizeFilename = (value: string) =>
  stripArchiveExtension(safeDecode(value)).replace(/\+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

const parseNexusMetadataFromUrl = (rawUrl: string): NexusDownloadMeta | undefined => {
  try {
    const url = new URL(rawUrl);
    if (!url.hostname.endsWith('nexus-cdn.com')) return undefined;

    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length < 2) return undefined;

    const gameId = Number.parseInt(segments[0], 10);
    const modId = Number.parseInt(segments[1], 10);
    const gameDomain = GAME_ID_MAP[gameId];

    if (!gameDomain || Number.isNaN(modId)) return undefined;

    return {
      modId,
      gameDomain,
    };
  } catch {
    return undefined;
  }
};

const getFileVersion = (file: NexusModFile): string | undefined => {
  const version = file.version ?? file.mod_version;
  const trimmedVersion = version?.trim();
  return trimmedVersion || undefined;
};

const buildSuggestedModName = (modName?: string): string | undefined => {
  const trimmedName = modName?.trim();
  return trimmedName || undefined;
};

const findMatchingFile = (files: NexusModFile[], filename: string): NexusModFile | undefined => {
  const normalizedFilename = normalizeFilename(filename);
  const exactMatches = files.filter((file) => {
    const candidates = [file.file_name, file.name].filter((value): value is string => !!value);
    return candidates.some((candidate) => normalizeFilename(candidate) === normalizedFilename);
  });

  if (exactMatches.length === 1) return exactMatches[0];
  if (exactMatches.length > 1) return undefined;

  const rawFilename = safeDecode(filename).trim().toLowerCase();
  const rawMatches = files.filter((file) => {
    const candidates = [file.file_name, file.name].filter((value): value is string => !!value);
    return candidates.some((candidate) => safeDecode(candidate).trim().toLowerCase() === rawFilename);
  });

  if (rawMatches.length === 1) return rawMatches[0];
  return undefined;
};

const findFileById = (files: NexusModFile[], fileId: number): NexusModFile | undefined =>
  files.find((file) => file.file_id === fileId);

const findMatchingUpdatedFileId = (updates: NexusFileUpdate[], filename: string): number | undefined => {
  const normalizedFilename = normalizeFilename(filename);
  const matches = updates.flatMap((update) => {
    const candidates = [
      { fileId: update.new_file_id, filename: update.new_file_name },
      { fileId: update.old_file_id, filename: update.old_file_name },
    ];

    return candidates.filter((candidate) => normalizeFilename(candidate.filename) === normalizedFilename);
  });

  if (matches.length === 1) return matches[0].fileId;
  return undefined;
};

export const getModDownloadLinks = async (
  gameDomain: string,
  modId: number,
  fileId: number,
  apiKey: string
): Promise<NexusDownloadLink[]> => {
  debug(`Fetching download links for ${gameDomain}/mods/${modId}/files/${fileId}`);
  const headers = buildHeaders(apiKey);
  const res = await fetch(
    `${NEXUS_V1_API_BASE_URL}/games/${gameDomain}/mods/${modId}/files/${fileId}/download_link.json`,
    { headers }
  );
  if (res.status === 401) {
    throw new Error('Invalid API key');
  }
  if (res.status === 403) {
    throw new Error('Download links require a Nexus premium membership');
  }
  if (!res.ok) {
    throw new Error(`Nexus API request failed with status ${res.status}`);
  }
  return res.json() as Promise<NexusDownloadLink[]>;
};

export const validateNexusApiKey = async (apiKey: string): Promise<NexusUser> => {
  debug('Validating Nexus API key');
  const headers = buildHeaders(apiKey);
  const res = await fetch(`${NEXUS_V1_API_BASE_URL}/users/validate.json`, { headers });
  if (res.status === 401) {
    throw new Error('Invalid API key');
  }
  if (!res.ok) {
    throw new Error(`Nexus API request failed with status ${res.status}`);
  }
  const data = (await res.json()) as {
    user_id: number;
    name: string;
    is_premium: boolean;
    is_supporter: boolean;
    email: string;
    profile_url: string;
  };
  debug(`Nexus API key validated for user: ${data.name}`);
  return {
    userId: data.user_id,
    name: data.name,
    premium: data.is_premium,
    supporter: data.is_supporter,
    email: data.email,
    profileUrl: data.profile_url,
  };
};

export const getModFiles = async (gameDomain: string, modId: number, apiKey: string): Promise<NexusFilesResponse> => {
  debug(`Fetching file list for ${gameDomain}/mods/${modId}`);
  const headers = buildHeaders(apiKey);
  const res = await fetch(`${NEXUS_V1_API_BASE_URL}/games/${gameDomain}/mods/${modId}/files.json`, { headers });
  if (res.status === 401) {
    throw new Error('Invalid API key');
  }
  if (!res.ok) {
    throw new Error(`Nexus API request failed with status ${res.status}`);
  }

  return (await res.json()) as NexusFilesResponse;
};

export const getModDetails = async (
  gameDomain: string,
  modId: number,
  apiKey: string
): Promise<NexusModDetailsResponse> => {
  debug(`Fetching mod details for ${gameDomain}/mods/${modId}`);
  const headers = buildHeaders(apiKey);
  const res = await fetch(`${NEXUS_V3_API_BASE_URL}/games/${gameDomain}/mods/${modId}`, { headers });
  if (res.status === 401) {
    throw new Error('Invalid API key');
  }
  if (!res.ok) {
    throw new Error(`Nexus API request failed with status ${res.status}`);
  }

  return (await res.json()) as NexusModDetailsResponse;
};

const getSuggestedModNameFromDetails = (details: NexusModDetailsResponse): string | undefined =>
  buildSuggestedModName(details.data?.name ?? details.name);

export const resolveNexusFileDetails = async (
  gameDomain: string,
  modId: number,
  filename: string,
  apiKey: string
): Promise<ResolvedNexusFile | undefined> => {
  const modNamePromise = getModDetails(gameDomain, modId, apiKey)
    .then((details) => getSuggestedModNameFromDetails(details))
    .catch((err) => {
      debug(`Failed to fetch Nexus mod details for ${gameDomain}/mods/${modId}: ${String(err)}`);
      return undefined;
    });

  const [fileData, suggestedModName] = await Promise.all([getModFiles(gameDomain, modId, apiKey), modNamePromise]);
  const files = fileData.files ?? [];
  const matchedFile = findMatchingFile(files, filename);
  if (matchedFile) {
    return {
      fileId: matchedFile.file_id,
      suggestedModName,
      modVersion: getFileVersion(matchedFile),
    };
  }

  const matchedUpdatedFileId = findMatchingUpdatedFileId(fileData.file_updates ?? [], filename);
  if (!matchedUpdatedFileId) return undefined;

  const updatedFile = findFileById(files, matchedUpdatedFileId);

  return {
    fileId: matchedUpdatedFileId,
    suggestedModName,
    modVersion: updatedFile ? getFileVersion(updatedFile) : undefined,
  };
};

export const parseNexusMetadata = (urlChain: string[]): NexusDownloadMeta | undefined => {
  for (const url of urlChain) {
    const candidate = parseNexusMetadataFromUrl(url);
    if (candidate) return candidate;
  }

  return undefined;
};
