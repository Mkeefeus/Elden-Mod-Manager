import { Mod } from 'types';
import { writeFileSync } from 'fs';
import { CreateModPathFromName } from '../util/utilities';

type TomlMod = {
  name: string;
  enabled: boolean;
  path: string;
};

const GenerateTomlString = (mods: Mod[]) => {
  const fileMods: TomlMod[] = [];
  const dllMods: TomlMod[] = [];
  mods.forEach((mod) => {
    if (!mod.enabled) return;

    const tomlMod = {
      name: mod.name,
      enabled: mod.enabled,
      path: `./mods/${CreateModPathFromName(mod.name)}/`,
    };

    mod.isDll ? dllMods.push(tomlMod) : fileMods.push(tomlMod);
  });

  // Might need to remove quotes from the keys in the mod arrays, need them for values
  return (
`# Global mod engine configuration
[modengine]
debug = false
external_dlls = ${JSON.stringify(dllMods).replace(/:/g, "=")}

# Mod loader configuration
[extension.mod_loader]
enabled = true

# Not currently supported for Elden Ring
loose_params = false
mods = ${JSON.stringify(fileMods).replace(/:/g, "=")}

[extension.scylla_hide]
enabled = false`);
};

export default GenerateTomlString;
