# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Elden Mod Manager (EMM) — an Electron + React desktop app for managing Elden Ring mods, built on top of the [me3](https://github.com/garyttiereny/me3) mod loader. Built with Electron Forge + Vite, TypeScript throughout, Mantine for UI.

## Commands

- `pnpm start` — run the app in dev mode (Electron Forge + Vite, hot reload)
- `pnpm run lint` — ESLint over `.ts`/`.tsx`
- `pnpm run pretty` — Prettier write-fix over the repo
- `pnpm run package` — package the app without generating installers
- `pnpm run make` — build platform installers (Squirrel/deb/rpm/zip) via Electron Forge

There is no test suite/runner configured in this repo (no `test` script, no jest/vitest).

Typecheck via `tsc` is not exposed as its own script; ESLint's `recommendedTypeChecked` config runs full type-checking as part of `pnpm run lint`, so lint is the way to catch type errors.

Package manager is **pnpm** (see `pnpm-lock.yaml` / `pnpm-workspace.yaml`) — don't use npm/yarn.

## Architecture

This is a standard Electron main/preload/renderer split, wired through Electron Forge's Vite plugin (`forge.config.ts`, `vite.main.config.ts`, `vite.preload.config.ts`, `vite.renderer.config.ts`).

### Process boundaries

- **Main process** (`src/main.ts`): app lifecycle, window creation/state persistence, the auto-updater (Squirrel-based, Windows/macOS packaged builds only — Linux has no auto-update). Imports `src/backend/mainEvents.ts` for side effects to register all IPC handlers.
- **Preload** (`src/preload.ts`): the *only* bridge between renderer and main. Defines `IElectronAPI` and exposes it via `contextBridge` as `window.electronAPI`. Every IPC channel the renderer can call is declared here — when adding a new main↔renderer capability, add the method to `IElectronAPI`, wire it here to `ipcRenderer.invoke`/`.send`, and add the matching `ipcMain.handle`/`.on` in `mainEvents.ts`.
- **Renderer** (`src/App.tsx`, `src/pages/*`, `src/components/*`): React app. Never touches Node/Electron APIs directly — always goes through `window.electronAPI`.

### Backend domain modules (`src/backend/`)

`mainEvents.ts` is the IPC registration hub — it doesn't contain business logic itself, it imports domain functions from sibling modules and wires them to channel names via `register*Handlers()` functions (grouped by feature: mods, tools, profiles, downloads, filesystem, settings, etc.), all called from one `registerIpcHandlers()`. Follow this pattern for new IPC surface: put logic in the relevant domain module, register the channel in `mainEvents.ts`.

Domain modules:
- `mods.ts` — install/edit/delete mods, path resolution into the managed mods folder
- `tools.ts` — companion executables/tools management, cascades tool deletion into mod references
- `profiles.ts` — mod profiles (load order, per-profile settings), import/export/analyze
- `me3.ts` / `me3Profile.ts` — builds the me3 launch profile and spawns the bundled `me3`/`me3_verb` binary to launch the game with mods
- `steam.ts` — locates Steam and the Elden Ring install dir by reading `libraryfolders.vdf` / `appmanifest_*.acf` (no Steam API calls), and launches vanilla game via `steam://rungameid/`
- `downloadManager.ts` / `nexus.ts` — download queue and Nexus Mods integration (used by the separate "Get Mods" window)
- `getModsWindow.ts` — a secondary `BrowserWindow` for the Nexus mod browser/import UI
- `fileSystem.ts` — file/folder dialogs, archive extraction, INI file read/write (path-safety-checked against the mod's install dir — see `getSafeModFilePath` in `mainEvents.ts`)
- `importExport.ts` — app settings export/import
- `startup.ts` — first-run/startup tasks

### Persistence

`electron-store` (`src/backend/db/`) is the only persistence layer — no external database. `schema.ts` defines the full `DBSchema` (mods, tools, profiles, folder paths, launcher settings, window state, etc.) as a JSON schema for `electron-store`'s validation; `api.ts` is the sole accessor layer (getters/setters) that the rest of the backend uses instead of touching the store directly. When adding a persisted field, update `schema.ts` (and the corresponding type in `types/index.ts`) and add accessors in `api.ts`.

### Shared types

`types/index.ts` is the single source of truth for cross-process types (`Mod`, `ModProfile`, `Tool`, form value types, IPC payload/result shapes, etc.). Both main and renderer import from the bare `types` path alias.

### Renderer state

`src/providers/ModsProvider.tsx` joins raw `Mod[]` records with the active profile's `ProfileModRef[]` (enabled state + load order dependencies) into `ModWithProfileState[]`, using TanStack Query for caching/invalidation. Saving mods splits back into a `Mod[]` metadata write plus a separate profile-mods write — these are two distinct IPC calls (`saveMods` + `saveProfileMods`) and both must be invoked together to persist a change. The main process pushes a `mods-changed` event and per-key `invalidateCache` events back to the renderer to drive query invalidation (see `App.tsx`).

`src/pages/index.tsx` defines the page list (route, display name, component) driving both the router and the navbar in `App.tsx` — add new top-level pages there.

### Path aliases

TS path aliases (`tsconfig.json`, mirrored by `vite-tsconfig-paths` via each Vite config's `resolve.tsconfigPaths`): `~/*` → `src/*`, `@components/*`, `@pages/*`, `@providers/*`, `@utils/*`, `@backend/*`. Use these instead of relative `../../` imports.

### Bundling notes

The Vite main-process build only bundles dependencies explicitly listed in `bundledDeps` in `vite.base.config.ts` (currently `electron-log`, `vdf-parser`, `archiver`, `node-7z`, `debug`, `update-electron-app`, `electron-store`); everything else in `dependencies` is left external and expected to be present via `node_modules` in the packaged app. If you add a new backend dependency, decide whether it needs to go in `bundledDeps`.

The `me3` binary is not committed to the repo — it's staged into `resources/me3/{linux,win32}/` by the `publish.yml` CI workflow (downloaded from `ME3_LINUX_URL`/`ME3_WINDOWS_URL` repo variables) and picked up by `forge.config.ts`'s `extraResource`. For local dev, `getBundledME3Executable` in `me3.ts` also checks `resources/me3/` relative to the repo root.

## Conventions

- Prettier: 120 col width, single quotes, semicolons, ES5 trailing commas (`.prettierrc`).
- Logging: use `logger` from `src/utils/mainLogger.ts` in main-process/backend code (`debug`/`info`/`warning`/`error`; `hideDisplay: true` suppresses the renderer toast and only writes to the log file). In the renderer, use `sendLog` from `src/utils/rendererLogger.tsx`, which forwards to the main logger over IPC.
- Errors: wrap thrown errors with `errToString` (`src/utils/utilities.ts`) when building log/error messages.
