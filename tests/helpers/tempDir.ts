import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

const createdDirs: string[] = [];

/** Creates a fresh temp directory. It's deleted automatically after the current test (see tests/setup.ts). */
export const makeTempDir = (prefix = 'emm-test-'): string => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  createdDirs.push(dir);
  return dir;
};

export const cleanupTempDirs = () => {
  for (let dir = createdDirs.pop(); dir !== undefined; dir = createdDirs.pop()) {
    rmSync(dir, { recursive: true, force: true });
  }
};

/**
 * Writes a tree of files under `root`, creating parent folders as needed. Keys are paths relative to `root`;
 * a key ending in `/` creates an empty directory instead of a file.
 */
export const writeTree = (root: string, files: Record<string, string>): string => {
  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = join(root, relativePath);
    if (relativePath.endsWith('/')) {
      mkdirSync(fullPath, { recursive: true });
      continue;
    }
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content);
  }
  return root;
};
