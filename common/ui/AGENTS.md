# Shared UI

- Split by feature and responsibility. Give large components their own folders, with `components/` and `hooks/` as needed. Promote only cross-feature reuse to shared folders; keep small helpers local. Do not split by line count.
- Export only `ExplorerShell` and `ExplorerShellProps` from `src/index.ts`. Import internal files directly; avoid nested barrels and imports back through the public entry.
- Components render UI and handle events; Hooks encapsulate cohesive state and Effects. Use plain functions for pure calculations; avoid redundant service/store layers.
- Keep shared criteria, navigation, expansion memory and focus in the shell and its Hooks. Preserve state lifetimes; temporary search expansion must not overwrite ordinary browsing memory.
- Read data through the host-injected neutral `CatalogClient`. Keep host, identity and backend modules out of UI; do not duplicate definition filtering, merging, counting or consent rules. Tables show matching definitions; details show all definitions.
- Prefer the installed Fluent UI v9 controls and typography; verify types and official APIs. Retain necessary native semantics, layout elements and Select options rather than forcing every element into Fluent.
- Keep styles local and colocated, using `makeStyles` and tokens. Preserve narrow-container, reduced-motion and Drawer portal behavior; adapt to actual container width.
- For UI behavior changes, follow the [development and acceptance guide](../../docs/ui-development.md) to verify requests, state, keyboard/focus and layout. For documentation-only changes, check links and diffs. Keep detailed structure, procedures and references in that guide, not here.
