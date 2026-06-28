const normalizeVersion = (value: string) => value.trim().toLowerCase().replace(/^v/i, '');

const buildVersionedName = (name: string, version?: string) => {
  const trimmedName = name.trim();
  const trimmedVersion = version?.trim();

  if (!trimmedVersion) return trimmedName;

  const normalizedName = trimmedName.toLowerCase();
  const normalizedVersion = normalizeVersion(trimmedVersion);
  if (
    normalizedName.endsWith(` ${normalizedVersion}`) ||
    normalizedName.endsWith(` v${normalizedVersion}`) ||
    normalizedName.endsWith(` version ${normalizedVersion}`)
  ) {
    return trimmedName;
  }

  return `${trimmedName} ${trimmedVersion}`;
};

export const CreateModPathFromName = (name: string, version?: string) => {
  return buildVersionedName(name, version).replace(/\s+/g, '-').toLowerCase();
};

export const errToString = (err: unknown) => {
  return err instanceof Error ? err.message : (err as string);
};

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function formatUsShortDate(dateValue: string | number | Date): string {
  return new Date(dateValue).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function generateUUID(existingIDs?: string[]): string {
  let uuid = crypto.randomUUID();
  if (existingIDs) {
    while (existingIDs.includes(uuid)) {
      uuid = crypto.randomUUID();
    }
  }
  return uuid;
}
