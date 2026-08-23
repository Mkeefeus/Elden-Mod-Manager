# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Elden Mod Manager — an Electron + React desktop GUI for managing Elden Ring mods, built on top of the [me3](https://github.com/garyttiereny/me3) mod-loading tool. The app manages mods in a folder separate from the game install, controls load order, supports multiple mod profiles (per-playthrough save/settings), and generates an me3 profile JSON that me3 consumes at launch. It also integrates with Nexus Mods for browsing/downloading.

Package manager is **pnpm** (see `pnpm-workspace.yaml` / `pnpm-lock.yaml`) — use `pnpm`, not `npm`/`yarn`.

## Commands

```sh
pnpm start          # electron-forge start — run the app in dev (hot reload via Vite)
pnpm lint           # eslint --ext .ts,.tsx .
pnpm pretty         # prettier --write .
pnpm package        # electron-forge package — build app without installers
pnpm make           # electron-forge make — build platform installers (deb/flatpak/rpm/squirrel/zip)
pnpm publish        # electron-forge publish — publish a release (GitHub)
pnpm license        # regenerate all_licenses.json + license file for About page
```

There is no test suite/runner configured in this repo (no `test` script, no test files) — treat `pnpm lint` and TypeScript's checker (via your editor / `tsc`) as the primary correctness gates. `test-workflow.sh` is unrelated to unit tests — it runs the GitHub Actions publish workflow locally via `act` (requires `GITHUB_TOKEN`, me3 download URLs, Docker).

## Architecture

### Process split (Electron Forge + Vite)

- **Main process** — `src/main.ts` (entry), everything under `src/backend/`. Node/Electron APIs, filesystem, spawning processes, electron-store persistence.
- **Preload** — `src/preload.ts`. The *only* bridge between main and renderer: it whitelists every IPC channel behind `window.electronAPI` via `contextBridge`. When adding a backend capability, it must be threaded through three places in lockstep: an `ipcMain.handle`/`.on` in `src/backend/mainEvents.ts` (or a domain module it wires up), an entry in the `IElectronAPI` interface + `electronAPI` object in `src/preload.ts`, and (if renderer-facing) a call site in a component/provider.
- **Renderer** — `src/renderer.tsx`, `src/App.tsx`, `src/pages/`, `src/components/`, `src/providers/`. Standard React SPA using `react-router-dom` for routing (route list in `src/pages/index.tsx`), Mantine for UI, and TanStack Query for all data fetching from `window.electronAPI`.
- A **second BrowserWindow** (`src/backend/getModsWindow.ts`) hosts the "Get Mods" flow (Nexus browsing + local install) at hash route `#/get-mods`, separate from the main window, with its own webview for Nexus and its own preload.

Build config: `vite.base.config.ts` defines shared Forge/Vite plumbing (which main-process deps get bundled into the asar vs. left external — see `bundledDeps` — and dev-server/hot-reload plugins). `vite.main.config.ts`, `vite.preload.config.ts`, `vite.renderer.config.ts` each extend it per Forge target. `forge.config.ts` declares packaging (extra resources: `resources/me3` binaries + `7zip-bin`, bundled into the packaged app) and makers/publishers.

Path aliases (see `tsconfig.json`): `~/*` → `src/*`, `@components`, `@pages`, `@providers`, `@utils`, `@backend`.

### Backend domain modules (`src/backend/`)

`mainEvents.ts` is the IPC hub — it registers all `ipcMain` handlers and delegates to domain modules rather than containing business logic itself:

- `db/` — persistence via `electron-store`. `schema.ts` defines the full store shape/JSON-schema (`DBSchema`: mods, tools, profiles, folder paths, launcher settings, window state). `init.ts` constructs the store singleton. `api.ts` is the only place that touches the store directly — every read/write goes through a named getter/setter here (`loadMods`/`saveMods`, `getProfiles`/`saveProfiles`, etc.), each wrapped in try/catch that logs and rethrows via `errToString`. Domain modules and `mainEvents.ts` call into `db/api.ts`, never the store directly.
- `mods.ts` — add/edit/delete installed mods (copies files into the managed mods folder, named via `CreateModPathFromName` in `@utils/utilities`).
- `tools.ts` — manage companion tools/executables associated with mods (managed-storage model: tools are copied into an app-managed tools folder, not referenced in place).
- `profiles.ts` — CRUD for mod profiles, plus profile import/export/analysis (matching an imported profile's mods against what's locally installed).
- `me3.ts` — locates the bundled `me3`/`me3_verb` executable (platform-specific, packaged-resources-first then dev `resources/me3/<platform>/` fallback) and spawns it (`launch`) with profile path + flags derived from active profile / launcher settings.
- `me3Profile.ts` — translates internal `Mod[]` + active profile's enabled mods/load-order into the me3 JSON profile format (native DLL mods vs. package/regulation.bin mods are handled differently; `MOD_SUBFOLDERS` in `constants.ts` is used to auto-locate the real content root inside an installed mod's folder tree). Writes to `<profilesFolder>/eldenring-mods.json`.
- `steam.ts` — launching vanilla (unmodded) Elden Ring via Steam.
- `nexus.ts` / `downloadManager.ts` — Nexus Mods integration: fetching mod/file info, tracking active downloads with progress events pushed to the renderer, extracting/staging downloaded archives for install.
- `fileSystem.ts` — shared filesystem helpers (native file/folder browse dialogs, archive extraction, ini file read/write/scan).
- `importExport.ts` — whole-app settings export/import (paths, launcher flags — see `ExportedSettings` type).
- `startup.ts` — one-time app boot invariants (ensures a default profile exists, recovers a dangling `activeProfileId`, clears the first-run flag).
- `getModsWindow.ts` — owns the secondary "Get Mods" `BrowserWindow` lifecycle.

### Data model essentials (`types/index.ts`)

- `Mod` is the persisted record for an installed mod (uuid, name, optional `dllFile`/`exe`/`toolId`, `loadEarly`, `finalizer`/`initializer` for me3 native-mod hooks, version, and optional Nexus identifiers for update-checking).
- `ModProfile` holds `mods: ProfileModRef[]` (which mods are *enabled* in this profile, plus per-mod `loadBefore`/`loadAfter` dependency ordering) and profile-scoped launch settings (`savefile`, `startOnline`, `disableArxan`, `noMemPatch`). Only one profile is active at a time (`activeProfileId` in the store); the renderer's `ModsProvider` joins the full `Mod[]` list against the active profile's refs to derive `enabled`/`loadBefore`/`loadAfter` per mod for the UI.
- A mod being *installed* (present in `mods` store array) is independent from it being *enabled* (referenced in the active profile's `mods` array) — this distinction shows up throughout the mods UI and in `me3Profile.ts`.
- `Tool` records represent managed companion executables; a `Mod.toolId` can reference one.

### Conventions to follow

- Every `db/api.ts` function and most backend async operations follow the same pattern: `debug(...)` before, try/catch, `error(errToString(err))` + `throw new Error(msg, { cause: err })` on failure. Match this when adding new backend functions.
- Logging goes through `@utils/mainLogger` (main process, wraps `electron-log`) or `@utils/rendererLogger` (renderer, forwards to main via IPC `log`/`notify` channels) — don't use `console.*` directly in app code.
- Renderer state from the backend is always fetched via TanStack Query (`useQuery`/`queryClient.invalidateQueries`), keyed by domain (`['mods']`, `['active-profile']`, etc.), not local component state synced by hand. The main process can push cache invalidation to the renderer via the `invalidate-cache` IPC event (see `window.electronAPI.invalidateCache` wired up in `App.tsx`).
- Formatting is enforced via Prettier (120 col, single quotes, semicolons, ES5 trailing commas) and `eslintConfigPrettier` disables ESLint's own formatting rules — run `pnpm pretty` rather than hand-wrapping lines.

## Working With Me

- **Always plan before editing.** Before making any file changes, lay out what you intend to do and wait for my go-ahead. Don't jump straight into edits, even for small fixes.
- **No unrequested scope creep.** Only touch what's needed for the task at hand; flag (don't silently fix) unrelated issues you notice.
- **Treat `db/schema.ts` and `db/api.ts` as sensitive.** Any change to the DB schema, or to how a store field is read/written, needs to be called out explicitly in your plan before you touch it — these affect persisted user data and can't be casually reshaped.
- **Treat IPC changes as sensitive.** Adding/changing anything that touches `mainEvents.ts`, `preload.ts`'s `IElectronAPI`/`electronAPI`, or a renderer call site counts as a structural change — walk through all three places you'll edit before starting, not after.
- **Run `pnpm lint` and `pnpm pretty` before considering any task done.** Don't hand-format — let Prettier own formatting per the repo's config (120 col, single quotes, ES5 trailing commas). If lint fails, fix it before reporting completion, don't leave it for me to catch.
- **No hidden assumptions.** If a plan requires deciding something the codebase doesn't already establish a convention for, ask rather than guessing.