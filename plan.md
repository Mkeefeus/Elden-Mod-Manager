## Plan: Tools Integration and Mod Association

Implement first-class managed Tools end-to-end by wiring backend IPC + persistence first, then replacing placeholder renderer state with live queries, then adding mod-level associated tool selection in add/edit flows. Keep legacy mod.exe behavior for now, add no automatic migration, and store tools in app-managed storage with cascade un-association on delete.

**Steps**
1. Phase 1 - Backend foundation and compile unblockers.
2. In src/backend/tools.ts, implement tool domain functions: load/list tools, add tool (copy executable into managed tools storage), delete tool (remove managed files + cascade remove references from mods), launch tool, open tool folder, plus path helpers used by handlers. This unblocks the current addTool compile error and establishes one source of truth.
3. In src/backend/mainEvents.ts, complete registerToolHandlers and register it inside registerIpcHandlers. Add handlers for load-tools, add-tool, delete-tool, launch-tool, and open-tool-folder with logging/error handling pattern consistent with existing register* handlers. Depends on step 2.
4. In src/backend/db/schema.ts and src/backend/db/api.ts, add a configurable managed tools root setting (for managed-storage-only policy), getter/setter APIs, and keep backwards-compatible defaults. Parallel with step 3 after deciding storage field names.
5. In src/backend/startup.ts, ensure managed tools directory exists at startup (same reliability expectation as profile file generation flow). Depends on step 4.
6. Phase 2 - Data model updates for mod associations.
7. In types/index.ts, extend Mod with associatedToolIds?: string[] and extend AddModFormValues to carry associatedToolIds for create flow. Keep Mod.exe as optional legacy field. Depends on step 1.
8. In src/backend/db/schema.ts, extend mods item schema to include associatedToolIds array of strings for persistence validation. Depends on step 7.
9. In src/backend/mods.ts, update handleAddMod to accept and persist associatedToolIds from form payload, preserving existing validation/copy logic. Parallel with step 8 once types are updated.
10. In src/backend/tools.ts delete path, implement cascade cleanup by removing deleted tool ID from every mod.associatedToolIds and saving updated mods. Depends on steps 2 and 7.
11. Phase 3 - Renderer data plumbing for Tools page.
12. Create a tools query hook/provider pattern mirroring current mods query usage in src/providers/ModsProvider.tsx, then replace placeholder tools state in src/pages/Tools.tsx with live data from window.electronAPI.loadTools and invalidation after mutations. Depends on step 3.
13. Update src/components/tools/AddToolModal.tsx to call addTool as the source of truth, surface success/failure notifications, and trigger tool-list refresh. Remove placeholder wording in labels/logs. Depends on step 12.
14. Wire actions in src/components/tools/ToolTable.tsx and src/components/tools/ToolTableMenu.tsx: launch tool, open folder, remove tool (with confirmation modal) and refresh list after deletion. Depends on steps 3 and 12.
15. Phase 4 - Mod UI integration for associated tools.
16. In src/components/mods/GetMods/ModConfigForm.tsx, load tools and add optional associated-tools multiselect to add-mod flow; include selected IDs in AddModFormValues submit payload. Depends on steps 7, 12.
17. In src/components/mods/EditNativeModModal.tsx, add associated-tools editor and persist via existing saveMods path by updating the target mod.associatedToolIds. Depends on step 16 and existing saveMods behavior.
18. Optionally add quick access in src/components/mods/ModTableMenu.tsx for editing associated tools if discoverability is needed; this can run parallel with step 17.
19. Phase 5 - Legacy executable coexistence and integration boundaries.
20. Keep launch-mod-exe behavior unchanged in src/backend/mainEvents.ts for now. Do not auto-convert mod.exe into tools and do not remove existing exe fields yet.
21. Define temporary coexistence behavior in UI: associated tools are additive metadata and independent from legacy mod executable launch until a future cutover task. Depends on step 16.
22. Phase 6 - Verification and hardening.
23. Add/adjust tests where available for tools CRUD and mod association persistence; if no existing test harness for these domains, add manual verification checklist to README/dev notes.
24. Run typecheck/lint and smoke-test Electron flows: add tool, launch tool, open tool folder, delete tool with cascade, add mod with associated tools, edit associated tools, verify data survives restart. Depends on prior phases.
25. Validate edge cases: duplicate tool names, missing source executable, deleting a tool referenced by many mods, stale associatedToolIds after schema upgrade, and cross-platform path handling.

**Relevant files**
- /home/mkeefeus/Github/Elden-Mod-Manager/src/backend/tools.ts - Implement full tools domain logic (currently empty).
- /home/mkeefeus/Github/Elden-Mod-Manager/src/backend/mainEvents.ts - Register and wire all tools IPC handlers; include registerToolHandlers in boot registration.
- /home/mkeefeus/Github/Elden-Mod-Manager/src/backend/db/schema.ts - Add tools storage path setting and mods.associatedToolIds schema.
- /home/mkeefeus/Github/Elden-Mod-Manager/src/backend/db/api.ts - Add get/set tools folder helpers and any tool path APIs.
- /home/mkeefeus/Github/Elden-Mod-Manager/src/backend/startup.ts - Ensure tools managed directory exists on startup.
- /home/mkeefeus/Github/Elden-Mod-Manager/src/backend/mods.ts - Persist associatedToolIds during add and preserve legacy exe behavior.
- /home/mkeefeus/Github/Elden-Mod-Manager/types/index.ts - Extend Mod and AddModFormValues with associatedToolIds.
- /home/mkeefeus/Github/Elden-Mod-Manager/src/pages/Tools.tsx - Replace placeholder list with live query data.
- /home/mkeefeus/Github/Elden-Mod-Manager/src/components/tools/AddToolModal.tsx - Remove placeholder behavior and handle real mutation outcomes.
- /home/mkeefeus/Github/Elden-Mod-Manager/src/components/tools/ToolTable.tsx - Wire launch button action.
- /home/mkeefeus/Github/Elden-Mod-Manager/src/components/tools/ToolTableMenu.tsx - Wire open folder and delete actions.
- /home/mkeefeus/Github/Elden-Mod-Manager/src/components/mods/GetMods/ModConfigForm.tsx - Add associated-tools selector in create flow.
- /home/mkeefeus/Github/Elden-Mod-Manager/src/components/mods/EditNativeModModal.tsx - Add associated-tools editor in edit flow.
- /home/mkeefeus/Github/Elden-Mod-Manager/src/components/mods/ModTableMenu.tsx - Optional entry point for association editing.
- /home/mkeefeus/Github/Elden-Mod-Manager/src/providers/ModsProvider.tsx - Reference pattern for query + invalidation behavior.

**Verification**
1. Compile/typecheck passes with no unresolved tools symbols (including mainEvents.ts addTool errors).
2. Add Tool flow copies executable into managed tools directory and creates DB tool row.
3. Tools page shows persisted tools after reload and restart.
4. Launch Tool opens executable and Open Tool Folder opens containing directory.
5. Remove Tool deletes managed files and removes the tool ID from all mod.associatedToolIds.
6. Add Mod flow can select associated tools and persists IDs correctly.
7. Edit mod flow can add/remove associated tools and persists via saveMods.
8. Legacy mod.exe launch still works unchanged for existing mods.
9. Manual regression pass for profile creation/apply and existing mods workflows.

**Decisions**
- Association scope: Store associations globally on Mod.
- Migration strategy: No migration logic for mod.exe now (development stage; no active users).
- Storage model: Managed storage only for tools.
- Deletion policy: Cascade remove tool references from mods when a tool is deleted.
- Included scope: End-to-end tools CRUD integration + mod association persistence and UI.
- Excluded scope: Automatic migration of legacy mod executables, profile-level tool overrides, and tool auto-update implementation.

**Further Considerations**
1. Define managed tool file layout now (single executable copy vs dedicated per-tool folder for future configs/logs); recommendation: per-tool folder to support future metadata sidecars.
2. Decide whether tool uniqueness is by name, by executable hash, or by destination path; recommendation: start with name+version uniqueness in UI and path conflict checks in backend.
3. Decide whether associated tools should be launchable from mod context immediately; recommendation: defer to follow-up after persistence lands to keep this implementation focused.
