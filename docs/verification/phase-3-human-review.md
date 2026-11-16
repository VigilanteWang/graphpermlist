# Stage #5 human-review checklist

Parent: [#2](https://github.com/VigilanteWang/graphpermlist/issues/2).
Stage: [#5](https://github.com/VigilanteWang/graphpermlist/issues/5).
Read the stage PR, [verification](phase-3.md), [UI guide](../ui-development.md),
[API contract](../api-contract.md), and the latest issue bodies first.

Record **pass / change needed / blocked** per section, with reproducible steps and
sanitized screenshots/network evidence. Do not include tenant IDs, credentials,
personal paths or private permission/grant information. The source is a definition
snapshot, not tenant authorization state.

1. **Reproduce setup.** From a clean checkout, use Node `.nvmrc` and npm 10.9.2;
   run `npm ci`, `npm run verify:data`, `npm run build:shared`, `npm run build:api`.
   Set `SQLITE_PATH` to a disposable local file, then run `npm run db:migrate`,
   `npm run import:data` twice. Expect 1,664 ordinary definitions and second-import
   reuse for the versioned input. Start `npm run start:api` and `npm run dev:web`
   separately with the same database and matching API/CORS configuration.
2. **Home and navigation.** Expect English text, source hash/import time/classification,
   1,660 enabled and 1,664 all ordinary definitions, and 60 excluded RSC definitions.
   Open Graph and inspect categories/counts; Power BI and resource SharePoint cannot
   be entered. Graph SharePoint / OneDrive remains an ordinary Graph category.
3. **Search/filters/counts.** Search `Mail.Read` globally, then open Exchange.
   Compare `/categories` and `/permissions` with the same query. GUID
   `e1fe6dd8-ba31-4d61-89e7-88639da4683d` must find User.Read in Entra, but not Exchange.
   Application + Not required must produce no matches. Delegated + Not required
   returns only matching definitions. Test Permission family and Show disabled;
   `AgentCard.Read.All` is hidden by default and visible with Show disabled.
4. **Rows/details.** Inspect User.Read (Delegated only) and Mail.Read (two definitions).
   Check every column against official fields from the API; type badges include text.
   Under a Delegated filter, Mail.Read's row has that type but details retain both
   GUIDs and official descriptions, per-type admin consent, enabled state and
   Delegated user consent fields. Copy name/GUID and paste; deny Clipboard and expect
   a manual selection field, never a false success. Check long official text.
5. **Browsing and keyboard.** Open/collapse individual families and Expand all/Collapse
   all; search should hide non-matching groups and open matches. Clear search restores
   the prior expansion state. Return restores the category-page query and card focus.
   Type continuously without losing focus. Use Tab, Shift+Tab, grid arrow keys, Enter,
   Escape and Close; modal focus stays inside, and closing restores the permission
   trigger. Inspect visible focus and keyboard-only navigation.
6. **Layout/motion/isolation.** Test 320/360px viewport and a 320px Web Part-like container
   inside a wide window. The document must not overflow; wide DataGrids scroll locally.
   Open details, resize, and scroll long text. Only the catalog body transitions;
   resource nav and search/filter toolbar do not move. Enable reduced motion and
   expect no body transition. Check neighboring host content remains styled normally.
7. **States and failure recovery.** `npm run test:browser` covers real imported data plus
   explicit injected loading/unimported/errors. Manually stop/restart the API and Retry.
   Errors must not display a false empty catalog. Rapidly change searches; late old
   responses must not replace the newest query's results.
8. **Automated/build checks.** Run `npm run typecheck`, `npm test`, `npm run build`,
   `npm run check:react`, `npm run test:browser`. Expect all tests/checks to pass and
   a generated `.sppkg`. Heft currently has zero Web Part-specific Jest suites;
   package success alone does not validate SharePoint runtime.
9. **Actual SharePoint — blocked pending environment/authorization.** After explicitly
   authorized test deployment, configure a trusted reachable HTTPS API and exact
   CORS origin using the UI guide. Verify TLS/GET/OPTIONS in the browser; load the
   actual package on a SharePoint page. Compare categories, counts, filters, rows,
   full details and copying with Vite against the same snapshot. Check host dark/light
   mode, neighboring web parts, narrow columns, navigation/disposal, property updates,
   one React root, request cancellation and no duplicated UI. Record tested tenant
   environment without publishing identifiers. This stage makes no runtime pass claim.

Remaining scope: actual SharePoint page, target Firefox/Safari/Edge versions, other
OS/architectures and hosted CI are unverified. Review and merge require a human decision.
Keep #5/#2 open; start #6 only after the stage PR is merged and the user authorizes it.
