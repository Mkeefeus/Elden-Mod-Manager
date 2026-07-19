import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { rename } from 'node:fs/promises';
import path from 'node:path';
// import { MakerFlatpak } from '@electron-forge/maker-flatpak';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import dotenv from 'dotenv';

dotenv.config();

const appVersion = process.env.npm_package_version ?? '0.0.0';

const normalizePlatform = (platform: string): string => {
  if (platform === 'win32') return 'windows';
  if (platform === 'darwin') return 'macos';
  return platform;
};

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    extraResource: ['node_modules/7zip-bin', 'resources/me3'],
    name: 'Elden Mod Manager',
    executableName: 'elden-mod-manager',
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      name: 'EldenModManager',
      authors: 'Mkeefeus and Mark1127',
      description: 'A mod manager for Elden Ring',
    }),
    new MakerZIP({}, ['win32']),
    // Ubuntu / Debian
    new MakerDeb({
      options: {
        name: 'elden-mod-manager',
        productName: 'Elden Mod Manager',
        genericName: 'Mod Manager',
        description: 'A mod manager for Elden Ring',
        maintainer: 'Mkeefeus',
        homepage: 'https://github.com/Mkeefeus/Elden-Mod-Manager',
        categories: ['Game'],
        section: 'games',
      },
    }),
    // Fedora / Red Hat
    new MakerRpm({
      options: {
        name: 'elden-mod-manager',
        productName: 'Elden Mod Manager',
        genericName: 'Mod Manager',
        description: 'A mod manager for Elden Ring',
        license: 'GPL-3.0',
        homepage: 'https://github.com/Mkeefeus/Elden-Mod-Manager',
        categories: ['Game'],
      },
    }),
    // Arch-based — no native pacman maker exists; AUR PKGBUILDs use the ZIP as source
    new MakerZIP({}, ['linux']),
    // Flatpak — universal Linux sandboxed package (requires flatpak, flatpak-builder, elfutils on build machine)
    // new MakerFlatpak({
    //   options: {
    //     id: 'io.github.mkeefeus.EldenModManager',
    //     productName: 'Elden Mod Manager',
    //     genericName: 'Mod Manager',
    //     description: 'A mod manager for Elden Ring',
    //     categories: ['Game'],
    //     branch: 'stable',
    //     files: [],
    //   },
    // }),
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'Mkeefeus',
          name: 'Elden-Mod-Manager',
        },
        draft: true,
        generateReleaseNotes: true,
      },
    },
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  hooks: {
    postMake: async (_forgeConfig, makeResults) => {
      for (const makeResult of makeResults) {
        const normalizedPlatform = normalizePlatform(makeResult.platform);
        const usedNames = new Set<string>();

        for (let i = 0; i < makeResult.artifacts.length; i += 1) {
          const artifactPath = makeResult.artifacts[i];
          const currentBaseName = path.basename(artifactPath);
          const artifactDir = path.dirname(artifactPath);
          const detectedExt = path.extname(currentBaseName).replace('.', '').toLowerCase();
          const extension = detectedExt || currentBaseName.toLowerCase();

          let installType = '';
          if (makeResult.platform === 'win32' && extension !== 'nupkg') {
            installType = extension === 'exe' ? '-installer' : '-portable';
          } else if (makeResult.platform === 'linux') {
            installType = extension === 'deb' || extension === 'rpm' ? '-installer' : '-portable';
          }

          const baseName = `eldenmodmanager-${appVersion}-${normalizedPlatform}${installType}-${makeResult.arch}`;
          let nextName = `${baseName}.${extension}`;
          let collisionIndex = 2;

          while (usedNames.has(nextName)) {
            nextName = `${baseName}-${collisionIndex}.${extension}`;
            collisionIndex += 1;
          }

          if (currentBaseName === 'RELEASES' || extension === 'nupkg') {
            nextName = `${currentBaseName}${detectedExt ? `.${detectedExt}` : ''}`;
          }

          usedNames.add(nextName);

          const nextPath = path.join(artifactDir, nextName);
          if (nextPath !== artifactPath) {
            await rename(artifactPath, nextPath);
            makeResult.artifacts[i] = nextPath;
          }
        }
      }
    },
  },
};

export default config;
