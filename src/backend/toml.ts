import { Mod } from 'types';
import { CreateModPathFromName } from '../util/utilities';

const GenerateTomlString = (mods: Mod[]) => {
  const cwd = process.cwd();
  let dllString = '';
  let fileString = '';
  mods.forEach((mod) => {
    if (!mod.enabled) return;
    const path = `${cwd}\\mods\\${CreateModPathFromName(mod.name)}${mod.dllFile ? '\\' + mod.dllFile : ''}`;

    // keep double backslashes for toml
    const escapedPath = path.replace(/\\/g, '\\\\');

    const modString = mod.dllFile
      ? `"${escapedPath}",\n   `
      : `{ name = "${mod.name}", path = "${escapedPath}", enabled = true },\n   `;

    mod.dllFile ? (dllString += modString) : (fileString += modString);
  });
  dllString = dllString.slice(0, -5);
  fileString = fileString.slice(0, -5);

  return `# Global mod engine configuration
[modengine]
debug = false
external_dlls = [\n   ${dllString}\n]

# Mod loader configuration
[extension.mod_loader]
enabled = true

# Not currently supported for Elden Ring
loose_params = false
mods = [\n   ${fileString}\n]

[extension.scylla_hide]
enabled = false`;
};

export default GenerateTomlString;
