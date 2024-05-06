export const CreateModPathFromName = (name: string) => {
  return name.replace(/\s/g, '-').toLowerCase();
};

export const errToString = (err: unknown) => {
  return err instanceof Error ? err.message : (err as string);
};

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
