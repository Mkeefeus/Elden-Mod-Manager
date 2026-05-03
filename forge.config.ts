import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
// import { MakerFlatpak } from '@electron-forge/maker-flatpak';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import dotenv from 'dotenv';

dotenv.config();

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    extraResource: ['public/256x256.png', 'node_modules/7zip-bin'],
    icon: 'public/EMM-Icon.ico',
    name: 'Elden Mod Manager',
    executableName: 'elden-mod-manager',
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      name: 'EldenModManager',
      authors: 'Mkeefeus and Mark1127',
      description: 'A mod manager for Elden Ring',
      iconUrl: 'https://raw.githubusercontent.com/Mkeefeus/Elden-Mod-Manager/main/public/EMM-Icon.ico',
      setupIcon: 'public/EMM-Icon.ico',
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
        icon: 'public/256x256.png',
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
        icon: 'public/256x256.png',
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
    //     icon: 'public/256x256.png',
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
};

export default config;
