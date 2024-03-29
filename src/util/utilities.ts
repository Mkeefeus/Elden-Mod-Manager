export const CreateModPathFromName = (name: string) => {
  return name.replace(/\s/g, '-').toLowerCase();
};
