# Claude Code guidelines: Drive migration (Apps Script)

Run all commands from `drive-migrate-apps-script/`.

## Quality gate — run before every commit and push

```bash
npm run quality   # format:check, lint, typecheck, build:check, test:coverage
```

CI (`.github/workflows/drive-migrate-apps-script-ci.yml`) runs exactly this.
`dist/` is committed and must match the sources: run `npm run build` after any
change under `src/` or to `appsscript.json`.

## Rules that keep this working

- **`src/core` and `src/drive` never touch an Apps Script global.** They take
  `DrivePort`, `Store`, `Clock` and a `Transport` as dependencies. Only `src/gas`
  uses `SpreadsheetApp`, `UrlFetchApp`, `ScriptApp`, and so on. ESLint enforces it.
- **Nothing in `src` may use an API missing from the Apps Script V8 runtime**:
  no `URL`, `URLSearchParams`, `fetch`, timers, `process`, `Buffer`. ESLint
  enforces it; build URLs with string handling.
- **Every Drive request goes through `DriveClient.call`**, which checks the
  allow-list (`ALLOWED_REQUESTS`). Do not add delete, trash or permission
  operations. A new operation needs a rule there and a test.
- **Scan and dry run use a read-only client.** Keep it that way.
- **Restart safety is a tested property.** If you change `apply.ts`, the
  kill-after-every-write tests in `test/core/resilience.test.ts` must still pass.
  New kinds of destination item must carry the `dmSourceId` property so a
  restart can find them.
- **Writes are never blindly retried.** `DriveClient` resends a POST or PATCH
  only after a rate limit; after a 5xx or no response the row goes FAILED and the
  executor checks the destination (`lookFor`) before trying again.
- **Rows are located by ID, not by remembered row number**, before every write
  (`SheetStore.relocate`): the user may sort the sheet mid-run.
- **Anything that can refuse a job runs before the job is recorded** as in
  progress (`runJob`), so "Continue" cannot resume a refused job.
- **The Override column belongs to the user.** `SheetStore.writeItems` writes
  the progress columns only.
- **All Items cells are plain text**, written through `toCell`. Sheets otherwise
  mangles names like `007` and `=A1`.
- **Entry points** are the exports of `src/index.ts`; `build.mjs` generates the
  top-level functions Apps Script needs. A new menu item needs an export there.
- Strict TypeScript: no `any`, explicit return types, no non-null assertions in
  `src`. Fix findings rather than suppressing them; a suppression needs a comment
  saying why.

## Testing

Tests are offline. `test/fakes/fakeDrive.ts` emulates the Drive REST API and
`test/fakes/fakeGas.ts` the Apps Script services; `test/fakes/app.ts` runs the
same scenarios against the sources and against the built `dist/Code.js`. When
the tool starts depending on a new Drive or Sheets behaviour, teach the fake that
behaviour (including how it fails) rather than stubbing around it.

Nothing user-specific (emails, drive names, IDs) belongs in code or docs.
