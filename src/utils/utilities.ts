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
