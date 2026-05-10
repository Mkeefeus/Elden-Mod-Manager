import { version } from '../../package.json';
import { logger } from '../utils/mainLogger';

const { debug } = logger;

const NEXUS_GRAPHQL_API_URL = 'https://api.nexusmods.com/v2/graphql';

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

type NexusFilesResponse = {
  files?: NexusModFile[];
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

const GAME_DOMAIN_TO_ID_MAP: Record<string, number> = Object.fromEntries(
  Object.entries(GAME_ID_MAP).map(([gameId, gameDomain]) => [gameDomain, Number(gameId)])
);

type GraphQLError = {
  message: string;
};

type GraphQLResponse<T> = {
  data?: T;
  errors?: GraphQLError[];
};

type NexusGraphqlMod = {
  name: string;
};

type NexusGraphqlModFile = {
  fileId: number;
  name: string;
  version: string;
  uri: string;
};

type NexusGraphqlModDetailsResponse = {
  mod: NexusGraphqlMod | null;
};

type NexusGraphqlModFilesResponse = {
  modFiles: NexusGraphqlModFile[];
};

const GRAPHQL_GET_MOD_DETAILS = `
  query GetModDetails($gameId: ID!, $modId: ID!) {
    mod(gameId: $gameId, modId: $modId) {
      name
    }
  }
`;

const GRAPHQL_GET_MOD_FILES = `
  query GetModFiles($gameId: ID!, $modId: ID!) {
    modFiles(gameId: $gameId, modId: $modId) {
      fileId
      name
      version
      uri
    }
  }
`;

const buildBaseHeaders = () => ({
  'Content-Type': 'application/json',
  'Application-Version': version,
  'Application-Name': 'Elden Mod Manager',
});

const getGraphqlGameId = (gameDomain: string): number => {
  const gameId = GAME_DOMAIN_TO_ID_MAP[gameDomain];
  if (!gameId) {
    throw new Error(`Unsupported Nexus game domain: ${gameDomain}`);
  }
  return gameId;
};

const graphqlRequest = async <TData>(query: string, variables: Record<string, unknown>): Promise<TData> => {
  const res = await fetch(NEXUS_GRAPHQL_API_URL, {
    method: 'POST',
    headers: buildBaseHeaders(),
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`Nexus GraphQL request failed with status ${res.status}`);
  }

  const payload = (await res.json()) as GraphQLResponse<TData>;
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join('; '));
  }

  if (!payload.data) {
    throw new Error('Nexus GraphQL request returned no data');
  }

  return payload.data;
};

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

export const getModFiles = async (gameDomain: string, modId: number): Promise<NexusFilesResponse> => {
  debug(`Fetching file list from GraphQL for ${gameDomain}/mods/${modId}`);
  const gameId = getGraphqlGameId(gameDomain);
  const data = await graphqlRequest<NexusGraphqlModFilesResponse>(GRAPHQL_GET_MOD_FILES, {
    gameId: String(gameId),
    modId: String(modId),
  });

  return {
    files: data.modFiles.map((file) => ({
      file_id: file.fileId,
      name: file.name,
      file_name: file.uri,
      version: file.version,
    })),
  };
};

export const getModDetails = async (gameDomain: string, modId: number): Promise<NexusModDetailsResponse> => {
  debug(`Fetching mod details from GraphQL for ${gameDomain}/mods/${modId}`);
  const gameId = getGraphqlGameId(gameDomain);
  const data = await graphqlRequest<NexusGraphqlModDetailsResponse>(GRAPHQL_GET_MOD_DETAILS, {
    gameId: String(gameId),
    modId: String(modId),
  });

  return {
    name: data.mod?.name,
  };
};

const getSuggestedModNameFromDetails = (details: NexusModDetailsResponse): string | undefined =>
  buildSuggestedModName(details.data?.name ?? details.name);

export const resolveNexusFileDetails = async (
  gameDomain: string,
  modId: number,
  filename: string
): Promise<ResolvedNexusFile | undefined> => {
  const modNamePromise = getModDetails(gameDomain, modId)
    .then((details) => getSuggestedModNameFromDetails(details))
    .catch((err) => {
      debug(`Failed to fetch Nexus mod details for ${gameDomain}/mods/${modId}: ${String(err)}`);
      return undefined;
    });

  const [fileData, suggestedModName] = await Promise.all([getModFiles(gameDomain, modId), modNamePromise]);
  const files = fileData.files ?? [];
  const matchedFile = findMatchingFile(files, filename);
  if (matchedFile) {
    return {
      fileId: matchedFile.file_id,
      suggestedModName,
      modVersion: getFileVersion(matchedFile),
    };
  }

  return undefined;
};

export const parseNexusMetadata = (urlChain: string[]): NexusDownloadMeta | undefined => {
  for (const url of urlChain) {
    const candidate = parseNexusMetadataFromUrl(url);
    if (candidate) return candidate;
  }

  return undefined;
};
