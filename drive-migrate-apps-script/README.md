# Drive migration (Apps Script)

Moves the contents of a My Drive folder, sub-folders included, into a Google
Workspace shared drive. It runs as a script attached to a Google Sheet: the sheet
holds the settings, the full inventory, the plan, and the progress, and a menu
drives the whole thing.

- **Dry run first.** Scanning and the dry run only read from Drive. They use a
  client that refuses to send any request that would change anything.
- **Restartable.** Progress is written to the sheet as it goes. A run that is
  interrupted, stopped, or killed by Apps Script's time limit carries on where it
  left off, without doing anything twice.
- **Keeps as much as Drive allows.** Files you own are _moved_, which keeps their
  ID, revision history, comments and links. Files you cannot move are copied, and
  their comments are carried over.
- **Never deletes.** The tool cannot trash, delete or re-share anything; those
  requests are not on its allow-list.

> **Status: not yet run against real Google Drive.** Everything here is tested
> against an in-memory emulation of the Drive API and of the Apps Script services
> (see [Testing](#testing)). Run it on a small throwaway folder first, and use
> **Only this path** to migrate one subtree before the whole tree.

## What can and cannot be preserved

| Case                               | Action     | File ID | Revision history | Comments                                      | Old links               |
| ---------------------------------- | ---------- | ------- | ---------------- | --------------------------------------------- | ----------------------- |
| You own the file                   | `MOVE`     | kept    | kept             | kept                                          | keep working            |
| Someone else owns it               | `COPY`     | new     | **lost**         | open ones copied by Drive; the rest re-posted | point at the original   |
| Someone else owns it (alternative) | `SHORTCUT` | —       | stays with owner | stay with the original                        | point at the original   |
| Owner disabled copying             | `SKIP`     | —       | —                | —                                             | —                       |
| Google Maps, Sites                 | `SKIP`     | —       | —                | —                                             | —                       |
| Folders                            | recreated  | new     | —                | —                                             | point at the old folder |

**Revision history cannot follow a copy.** Drive has no API to transfer it. It
survives only when the file is moved, and by default only the owner can move a
file. The ways to keep history on someone else's file are:

- ask the owner to transfer ownership to you (or to move the file in themselves)
  before you run the migration, then scan again; or
- if you, the owner and the shared drive are all in the same Workspace
  organisation and its admin allows editors to move files into shared drives, set
  **Try to move files I don't own** to `Yes`.

**Comments on copies.** The copy is made with Drive's `copyComments` option,
which carries the open comments of Docs, Sheets and Slides. Whatever Drive did
not carry (resolved threads, and every thread on other file types) is re-posted
as text: authored by you, with the original author, date and quoted passage
written into the comment, and resolved again if it was resolved. Re-posted
comments are not anchored to a text range.

**Folders** cannot be moved into a shared drive through the API, so they are
recreated and the files moved into them. The source folders stay behind, empty
of whatever was moved, as an audit trail.

Every copy also gets a description recording the original owner, dates and a
link back to the original.

## Before you start

1. A manager of the shared drive adds you as **Content manager** or **Manager**.
2. If you are signing in with a personal Gmail account, the shared drive's
   Workspace admin must allow external members, and must allow them to move
   content in. Google's help says moves from outside the organisation may be
   refused altogether. **Test this by hand first:** drag one file you own into
   the shared drive. If that is refused, no tool can move your files, and every
   file would have to be a copy (set **If moving my own file is refused** to
   `COPY`, or leave it on `FAIL` to see the refusals first).
3. Moved and copied files count against the destination organisation's storage.

## Install

There is nothing to set up outside Google Sheets: no Cloud project, OAuth client
or credentials file.

1. Create a new Google Sheet. Choose **Extensions → Apps Script**.
2. Replace the contents of `Code.gs` with [`dist/Code.js`](dist/Code.js).
3. In the editor choose **Project Settings** (the gear) and tick **Show
   "appsscript.json" manifest file in editor**. Back in the editor, replace the
   contents of `appsscript.json` with [`dist/appsscript.json`](dist/appsscript.json).
   This enables the Drive API for the script and limits it to the permissions it
   needs.
4. Save, then reload the spreadsheet. A **Drive migration** menu appears.
5. Choose **Drive migration → 1. Set up sheets**. The first time, Google asks you
   to authorise the script. Because it is your own unpublished script you will
   see "Google hasn't verified this app": choose **Advanced → Go to (project
   name)**.

If a run later reports that the _Drive API has not been used in project … or it
is disabled_, open the script editor, click **+** next to **Services**, add
**Drive API**, and try again.

To hand the tool to someone else, share the spreadsheet with **File → Make a
copy**; the script travels with it.

<details>
<summary>Alternative: push with clasp</summary>

```bash
npm ci && npm run build
npx @google/clasp login
npx @google/clasp create --type sheets --title "Drive migration" --rootDir dist
npx @google/clasp push
```

`.clasp.json` and `.clasprc.json` are git-ignored.

</details>

## Use

1. **Set up sheets**, then fill in **Source folder** and **Destination** on the
   _Config_ sheet. Paste the folder's and the shared drive's URL from your
   browser. The destination may also be a folder inside a shared drive.
2. **Scan and plan.** Lists every file and folder on the _Items_ sheet, with its
   owner and the action planned for it and why. The _Summary_ sheet totals files
   per owner, so you can see how much you own and whose files would be copied.
3. **Review.** To change what happens to a row, type `MOVE`, `COPY`, `SHORTCUT`
   or `SKIP` in its **Override** column (`SKIP` on a folder skips everything in
   it). The tool never writes to that column.
4. **Dry run.** Fills the **Dry run** column with exactly what would happen,
   including folders that would be merged into existing ones and files that would
   be skipped because the name is taken. It can be repeated as often as you like.
5. **Migrate.** Asks for confirmation, then does it. **Status** and **Result**
   fill in row by row, and **Destination** links to each item's new location.

To try a small part first, put a value from the **Path** column in **Only this
path**, run steps 4 and 5, look at the result in Drive, then clear the setting
and choose **Migrate** again for the rest.

### Settings

| Setting                          | Default | Meaning                                                                                                                    |
| -------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------- |
| Source folder                    |         | URL or ID of the My Drive folder to migrate.                                                                               |
| Destination                      |         | URL or ID of the shared drive, or of a folder inside one.                                                                  |
| Create top-level folder          | `Yes`   | Recreate the source folder itself in the destination. `No` merges its contents straight in.                                |
| Only this path                   |         | Restrict dry runs and migration to one path and everything under it.                                                       |
| Files I don't own                | `COPY`  | `COPY`, `SHORTCUT` (leave a shortcut to the original) or `SKIP`.                                                           |
| Try to move files I don't own    | `No`    | Attempt a real move first; falls back to the setting above when Drive refuses. Takes the file out of the owner's My Drive. |
| If moving my own file is refused | `FAIL`  | `FAIL` marks the row so you can decide; `COPY` copies it instead.                                                          |
| Carry comments onto copies       | `Yes`   | See above. `No` is much faster.                                                                                            |
| Allow duplicate names            | `No`    | `No` skips a file when the destination folder already holds one with that name.                                            |
| Continue automatically           | `Yes`   | Schedule the next run when one runs out of time.                                                                           |
| Minutes per run                  | `4`     | How long one run works before pausing (Apps Script stops a run at six minutes).                                            |

### Long jobs, stopping and restarting

Apps Script limits one run to six minutes. A job that needs longer pauses after
**Minutes per run**, schedules itself to continue a minute later, and repeats
until it is done; you can close the spreadsheet meanwhile. A personal Gmail
account gets 90 minutes of such triggered run time per day (Workspace accounts
get six hours). If that runs out, choose **Continue a paused job** the next day.

- **Stop** halts a job after the file it is working on.
- **Continue a paused job** picks up a job that was stopped, hit an error, or is
  waiting because automatic continuation is off.
- Choosing **Migrate** again is always safe: finished rows are left alone, and
  `FAILED`, `BLOCKED` and `SKIPPED` rows are tried again with the current
  settings and overrides.

How it avoids doing things twice: rows are marked `IN_PROGRESS` in the sheet
before their batch touches Drive. If a run dies, the next one asks Drive what
happened to those rows first. A moved file is already in the destination; a copy,
a new folder or a shortcut carries the source's ID in a custom file property
(`dmSourceId`). The same property means that even scanning again from an empty
sheet will not duplicate copies or folders.

### Status values

| Status        | Meaning                                                            |
| ------------- | ------------------------------------------------------------------ |
| `PENDING`     | Planned, not done yet.                                             |
| `IN_PROGRESS` | Being worked on, or interrupted mid-way; the next run finishes it. |
| `DONE`        | Migrated. Never touched again.                                     |
| `SKIPPED`     | Deliberately left out; **Result** says why.                        |
| `FAILED`      | Drive refused or errored; **Result** has Drive's reason.           |
| `BLOCKED`     | The folder it belongs in could not be created.                     |

## Limits

- Shared drives hold at most 500,000 items, and Drive limits each account to
  750 GB of copies per day. Moves do not count towards that.
- The tool reads the whole _Items_ sheet at the start of each run. That is
  comfortable for thousands of rows; for hundreds of thousands, use something
  that does not live in a spreadsheet.
- Drive's revision history, sharing settings of individual files, and comment
  anchors are outside what any copy can carry.
- Sharing is not replicated: items take on the shared drive's membership.

## Development

TypeScript, bundled to a single `dist/Code.js`. Node 22 or later.

```bash
npm ci
npm run quality     # everything CI runs
```

| Command               | Does                                                    |
| --------------------- | ------------------------------------------------------- |
| `npm test`            | Vitest, offline. `npm run test:coverage` adds coverage. |
| `npm run lint`        | ESLint, type-aware, strict.                             |
| `npm run typecheck`   | `tsc` over the sources and, separately, the tests.      |
| `npm run format`      | Prettier (`format:check` to verify only).               |
| `npm run build`       | Bundle to `dist/`.                                      |
| `npm run build:check` | Fail if `dist/` is not what the sources produce.        |

`dist/` is committed so the tool can be installed by copy and paste, without
Node. CI fails if it is stale, so run `npm run build` before committing.

### Layout

```
src/
  core/        the migration itself; no Apps Script globals, runs under Node
    model.ts       types and the two ports: DrivePort, Store
    config.ts      the Config sheet's settings, parsing and validation
    preflight.ts   resolve source and destination, check access
    scan.ts        resumable inventory
    plan.ts        classification (pure)
    apply.ts       executor: dry run, real run, restart safety
    comments.ts    carrying comments onto copies
    jobs.ts        SCAN / DRY_RUN / EXECUTE, one execution at a time
    budget.ts      time budget and stop flag
    summary.ts     the Summary sheet
  drive/
    client.ts      Drive REST v3 over an injected transport: allow-list,
                   read-only mode, retries
  gas/           the only code that touches Apps Script services
    sheetStore.ts  Store, kept in the spreadsheet
    transport.ts   UrlFetchApp
    main.ts        menu, entry points, lock, continuation trigger
  index.ts       entry points; each export becomes a top-level function
build.mjs        esbuild bundle + generated top-level function stubs
appsscript.json  manifest (scopes, Drive advanced service)
test/
  fakes/         FakeDrive, fake Apps Script services, scenario builder
```

ESLint enforces the boundaries: `src/core` and `src/drive` may not reference an
Apps Script service, and nothing in `src` may use an API the Apps Script runtime
lacks (`URL`, `fetch`, `setTimeout`, …).

### Testing

No existing library emulates Apps Script offline well enough to use here
(`gas-fakes`, the most complete, proxies to the real Google APIs and needs
credentials). The tests therefore bring their own emulation, at two seams:

- **`FakeDrive`** is an in-memory Drive REST API. It receives the very HTTP
  requests the real client builds, and models what the tool relies on: a move
  keeps ID, revisions and comments; a copy gets a new ID, one revision and only
  the open comments of Docs files; folders cannot be moved into a shared drive;
  non-owners cannot move files unless the admin setting allows it; listings are
  paginated. It can inject failures and can "kill the execution" straight after
  any write.
- **Fake Apps Script services** (`SpreadsheetApp`, `UrlFetchApp`, `ScriptApp`
  triggers, `LockService`, `PropertiesService`, `Utilities`, a fake clock). The
  fake sheet reproduces the traps of the real one: ranges outside the grid
  throw, unformatted cells turn `007` into `7` and `=A1` into a formula, and
  writes are lost if the execution dies before a flush.

Every behavioural test at the Apps Script level runs twice: once against the
TypeScript sources (for coverage), and once against the generated `dist/Code.js`
loaded into a bare global scope containing only the fake services, the way the
Apps Script runtime loads it.

The restart guarantee is tested exhaustively for the sample tree: the migration
is killed after each individual write in turn, resumed, and the destination must
come out identical to an uninterrupted run, with nothing duplicated.

What the tests cannot tell you is whether Google's services behave as the
emulation assumes. See the status note at the top.
