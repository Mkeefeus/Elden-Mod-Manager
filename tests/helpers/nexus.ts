import { vi } from 'vitest';

// Test doubles for the Nexus GraphQL API that src/backend/nexus.ts talks to via global fetch

export type FakeNexusFile = {
  fileId: number;
  modId: number;
  groupId: number | null;
  name: string;
  version: string;
  category: 'MAIN' | 'UPDATE' | 'OPTIONAL' | 'OLD_VERSION' | 'MISCELLANEOUS' | 'REMOVED' | 'ARCHIVED';
  // Unix timestamp (seconds) - the update check treats the newest date as the latest file
  date: number;
  uri: string;
};

export const makeNexusFile = (overrides: Partial<FakeNexusFile> & Pick<FakeNexusFile, 'fileId'>): FakeNexusFile => ({
  modId: 510,
  groupId: 1,
  name: `File ${overrides.fileId}`,
  version: '1.0',
  category: 'MAIN',
  date: 1_700_000_000,
  uri: `file-${overrides.fileId}.zip`,
  ...overrides,
});

type FakeNexusOptions = {
  // Files returned for each mod id; a mod id that's missing returns an empty list
  files?: Record<number, FakeNexusFile[]>;
  // Mod page names returned by the details query
  modNames?: Record<number, string>;
  // Mod ids whose file list request fails with an HTTP error
  failingMods?: number[];
  // Fail the details (mod name) query for every mod
  failDetails?: boolean;
};

type GraphqlBody = { query: string; variables: { gameId: string; modId: string } };

/** Replaces global fetch with a fake Nexus GraphQL API. Returns the mock to inspect calls with. */
export const stubNexusApi = ({
  files = {},
  modNames = {},
  failingMods = [],
  failDetails = false,
}: FakeNexusOptions) => {
  const fetchMock = vi.fn((_url: string, init: { body: string }) => {
    const { query, variables } = JSON.parse(init.body) as GraphqlBody;
    const modId = Number(variables.modId);

    if (query.includes('GetModFiles')) {
      if (failingMods.includes(modId)) return Promise.resolve(new Response('unavailable', { status: 503 }));
      return Promise.resolve(Response.json({ data: { modFiles: files[modId] ?? [] } }));
    }
    if (query.includes('GetModDetails')) {
      if (failDetails) return Promise.resolve(new Response('unavailable', { status: 503 }));
      return Promise.resolve(Response.json({ data: { mod: { name: modNames[modId] ?? `Mod ${modId}` } } }));
    }
    return Promise.resolve(Response.json({ errors: [{ message: `Unexpected query: ${query}` }] }));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

/** How many file list requests the fake API received. */
export const countFileListRequests = (fetchMock: ReturnType<typeof stubNexusApi>) =>
  fetchMock.mock.calls.filter(([, init]) => init.body.includes('GetModFiles')).length;
