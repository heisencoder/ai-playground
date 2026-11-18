import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { SHEET_NAMES } from '../../src/gas/sheetStore'
import { CONFIG_FIELDS } from '../../src/core/config'
import type { AppKind } from '../fakes/app'
import {
  BUNDLE_PATH,
  EXPECTED_TREE,
  ready,
  fireTriggersUntilQuiet,
  itemRow,
  itemRows,
  setUpWorkbook,
  startApp,
  typeConfig,
  typeItemCell,
} from '../fakes/app'
import { DOC_MIME, ExecutionKilled } from '../fakes/fakeDrive'
import { buildScenario } from '../fakes/scenario'

const MENU = 'Drive migration'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe.each<AppKind>(['sources', 'bundle'])(
  'the app, run from %s',
  (kind) => {
    describe('menu and set-up', () => {
      it('adds a menu whose every item calls a function that exists', () => {
        const app = startApp(kind, buildScenario().drive)

        app.call('onOpen')

        const items = app.world.ui.menus.get(MENU) ?? []
        expect(items.map((item) => item.caption)).toEqual([
          '1. Set up sheets',
          '2. Scan and plan',
          '3. Dry run',
          '4. Migrate',
          'Continue a paused job',
          'Stop',
          'Help',
        ])
        for (const item of items) {
          expect(app.has(item.functionName)).toBe(true)
        }
      })

      it('creates the four sheets with every setting at its default', () => {
        const app = startApp(kind, buildScenario().drive)

        app.call('setUpSheets')

        expect([...app.world.spreadsheet.sheets.keys()].sort()).toEqual([
          'Config',
          'Items',
          'Log',
          'Summary',
        ])
        const config = app.world.spreadsheet.sheet(SHEET_NAMES.config).rows()
        expect(config[0]).toEqual(expect.arrayContaining(['Setting', 'Value']))
        expect(config.slice(1).map((row) => [row[0], row[1]])).toEqual(
          CONFIG_FIELDS.map((field) => [field.label, field.defaultValue])
        )
        expect(app.world.ui.lastAlert()).toContain('Sheets are ready')
      })

      it('keeps what has been typed when set up is run again', () => {
        const { app, scenario } = ready(kind, { othersFiles: 'SKIP' })

        app.call('setUpSheets')

        const config = app.world.spreadsheet.sheet(SHEET_NAMES.config).rows()
        expect(config).toHaveLength(CONFIG_FIELDS.length + 1)
        expect(config.find((row) => row[0] === 'Source folder')?.[1]).toBe(
          scenario.sourceId
        )
        expect(config.find((row) => row[0] === "Files I don't own")?.[1]).toBe(
          'SKIP'
        )
      })

      it('shows help', () => {
        const app = startApp(kind, buildScenario().drive)

        app.call('showHelp')

        expect(app.world.ui.lastAlert()).toContain('Nothing is ever deleted')
      })
    })

    describe('scan, dry run, migrate', () => {
      it('lists every item on the Items sheet with its planned action', () => {
        const { app, scenario } = ready(kind)

        app.call('scanAndPlan')

        expect(app.world.ui.lastAlert()).toContain('Scan complete: 12 item(s)')
        expect(scenario.drive.writes()).toEqual([])
        const roadmap = itemRow(app, 'Team Files/Roadmap')
        expect(roadmap).toMatchObject({
          Type: 'Google Doc',
          Owner: 'me@example.com',
          Mine: 'Yes',
          Action: 'MOVE',
          Status: 'PENDING',
          ID: scenario.ids.roadmap,
        })
        expect(itemRow(app, 'Team Files/Budget/Notes')).toMatchObject({
          Owner: 'carol@other.example',
          Mine: '',
          Action: 'COPY',
        })
        expect(
          itemRow(app, 'Team Files/Budget/2024 Budget')['Size (bytes)']
        ).toBe('2048')
      })

      it('fills the Dry run column and leaves Drive alone', () => {
        const { app, scenario } = ready(kind)
        app.call('scanAndPlan')

        app.call('dryRun')

        expect(app.world.ui.lastAlert()).toContain('Dry run complete')
        expect(scenario.drive.writes()).toEqual([])
        expect(itemRow(app, 'Team Files/Roadmap')).toMatchObject({
          'Dry run': 'would move (keeps ID, history and comments)',
          Status: 'PENDING',
          Destination: '',
        })
      })

      it('asks first, then migrates and records where everything went', () => {
        const { app, scenario } = ready(kind)
        app.call('scanAndPlan')

        app.call('migrate')

        expect(app.world.ui.alerts.at(-2)).toContain(
          '3 file(s) moved, 2 copied, 1 shortcut(s) and 4 folder(s) created'
        )
        expect(app.world.ui.lastAlert()).toContain('Migration complete')
        expect(scenario.drive.tree(scenario.sharedDriveId)).toEqual(
          EXPECTED_TREE
        )
        expect(itemRow(app, 'Team Files/Roadmap')).toMatchObject({
          Status: 'DONE',
          Result: 'moved',
          Destination: `https://drive.google.com/open?id=${scenario.ids.roadmap}`,
        })
        expect(itemRow(app, 'Team Files/Roadmap').Updated).toMatch(
          /^2026-11-17T09:00:\d\d\.\d{3}Z$/
        )
        const statuses = itemRows(app).map((row) => row.Status)
        expect(statuses.filter((status) => status === 'DONE')).toHaveLength(10)
        expect(statuses.filter((status) => status === 'SKIPPED')).toHaveLength(
          2
        )
      })

      it('does nothing if the confirmation is cancelled', () => {
        const { app, scenario } = ready(kind)
        app.call('scanAndPlan')
        app.world.ui.nextAnswer = 'CANCEL'

        app.call('migrate')

        expect(scenario.drive.writes()).toEqual([])
        expect(itemRow(app, 'Team Files/Roadmap').Status).toBe('PENDING')
      })

      it('writes a summary and a log', () => {
        const { app } = ready(kind)
        app.call('scanAndPlan')
        app.call('migrate')

        const summary = app.world.spreadsheet.sheet(SHEET_NAMES.summary).rows()
        expect(summary[0]?.[0]).toBe('Drive migration summary')
        expect(summary[1]?.[0]).toContain('Migration complete')
        expect(summary).toContainEqual(
          expect.arrayContaining(['carol@other.example', '3'])
        )
        const log = app.world.spreadsheet.sheet(SHEET_NAMES.log).rows()
        expect(log[0]?.slice(0, 3)).toEqual(['Time', 'Level', 'Message'])
        expect(log.map((row) => row[2]).join('\n')).toContain(
          'Scanning "Team Files" as me@example.com; destination "Team Drive".'
        )
        expect(log.length).toBeGreaterThanOrEqual(4)
      })
    })

    describe('what a person can do to the sheet', () => {
      it('honours an Override, however it is capitalised, and never overwrites it', () => {
        const { app, scenario } = ready(kind)
        app.call('scanAndPlan')
        typeItemCell(app, 'Team Files/Roadmap', 'Override', 'skip')

        app.call('dryRun')
        app.call('migrate')

        const row = itemRow(app, 'Team Files/Roadmap')
        expect(row.Override).toBe('skip')
        expect(row['Dry run']).toBe('would skip: skipped by override')
        expect(row.Status).toBe('SKIPPED')
        expect(scenario.drive.file(scenario.ids.roadmap).driveId).toBe('')
      })

      it('still migrates parents before children after the sheet is sorted', () => {
        const { app, scenario } = ready(kind)
        app.call('scanAndPlan')
        const sheet = app.world.spreadsheet.sheet(SHEET_NAMES.items)
        const [header, ...rows] = sheet.state.values.slice(
          0,
          sheet.getLastRow()
        )
        sheet.state.values.splice(
          0,
          rows.length + 1,
          header ?? [],
          ...rows.reverse()
        )
        app.world.commit()

        app.call('migrate')

        expect(scenario.drive.tree(scenario.sharedDriveId)).toEqual(
          EXPECTED_TREE
        )
      })

      it('keeps awkward names exactly: leading zeros, formulas, plus signs', () => {
        const scenario = buildScenario()
        const names = [
          '007',
          '=SUM(A1:A9)',
          '+1 notes',
          '-draft-',
          '@home',
          "'quoted'",
          'TRUE',
          '1e5',
        ]
        const odd = scenario.drive.addFolder('007', scenario.sourceId)
        for (const name of names) {
          scenario.drive.addFile(name, odd, DOC_MIME)
        }
        const app = startApp(kind, scenario.drive)
        setUpWorkbook(app, scenario)

        app.call('scanAndPlan')
        app.call('migrate')

        const paths = itemRows(app).map((row) => row.Path)
        for (const name of names) {
          expect(paths).toContain(`Team Files/007/${name}`)
        }
        const destination = scenario.drive.find(
          scenario.drive.find(scenario.sharedDriveId, 'Team Files').id,
          '007'
        )
        expect(
          scenario.drive
            .childrenOf(destination.id)
            .map((file) => file.name)
            .sort()
        ).toEqual([...names].sort())
      })
    })

    describe('problems are explained, not thrown', () => {
      it('says what to fill in when the Config sheet is incomplete', () => {
        const scenario = buildScenario()
        const app = startApp(kind, scenario.drive)
        app.call('setUpSheets')

        app.call('scanAndPlan')

        expect(app.world.ui.lastAlert()).toBe(
          'Fill in "Source folder" on the Config sheet.'
        )
        expect(app.world.lockHeld).toBe(false)
      })

      it('refuses to start while another run holds the lock', () => {
        const { app, scenario } = ready(kind)
        app.world.lockHeldElsewhere = true

        app.call('scanAndPlan')

        expect(app.world.ui.lastAlert()).toContain('already in progress')
        expect(scenario.drive.requests).toEqual([])
      })

      it('says so when there is nothing to continue', () => {
        const { app } = ready(kind)

        app.call('continueJob')

        expect(app.world.ui.lastAlert()).toBe(
          'There is no paused job to continue.'
        )
      })
    })

    describe('long jobs', () => {
      it('continue by themselves on a time-driven trigger until finished', () => {
        const { app, scenario } = ready(kind, { minutesPerRun: '1' })
        app.call('scanAndPlan')
        app.world.latencyMs = 9_000

        app.call('migrate')

        expect(app.world.ui.lastAlert()).toContain('continue by itself')
        expect(app.world.triggers.map((trigger) => trigger.handler)).toEqual([
          'continueFromTrigger',
        ])
        expect(app.world.triggers[0]?.afterMs).toBe(60_000)

        const runs = fireTriggersUntilQuiet(app)

        expect(runs).toBeGreaterThan(1)
        expect(app.world.triggers).toEqual([])
        expect(app.world.spreadsheet.toasts.at(-1)).toContain(
          'Migration complete'
        )
        expect(scenario.drive.tree(scenario.sharedDriveId)).toEqual(
          EXPECTED_TREE
        )
      })

      it('continue a long scan the same way, then plan', () => {
        const { app } = ready(kind, { minutesPerRun: '1' })
        app.world.latencyMs = 25_000

        app.call('scanAndPlan')
        expect(app.world.ui.lastAlert()).toContain('Scan paused')
        fireTriggersUntilQuiet(app)

        expect(app.world.spreadsheet.toasts.at(-1)).toContain(
          'Scan complete: 12'
        )
        expect(itemRow(app, 'Team Files/Roadmap').Action).toBe('MOVE')
      })

      it('wait for the menu when automatic continuation is switched off', () => {
        const { app, scenario } = ready(kind, {
          minutesPerRun: '1',
          autoContinue: 'No',
        })
        app.call('scanAndPlan')
        app.world.latencyMs = 9_000

        app.call('migrate')
        expect(app.world.triggers).toEqual([])
        for (
          let run = 0;
          run < 20 && !app.world.ui.lastAlert().includes('complete');
          run += 1
        ) {
          app.call('continueJob')
        }

        expect(scenario.drive.tree(scenario.sharedDriveId)).toEqual(
          EXPECTED_TREE
        )
      })

      it('stop on request: no more triggers, and Continue finishes the job', () => {
        const { app, scenario } = ready(kind, { minutesPerRun: '1' })
        app.call('scanAndPlan')
        app.world.latencyMs = 9_000
        app.call('migrate')
        expect(app.world.triggers).toHaveLength(1)

        app.call('stopJob')

        expect(app.world.triggers).toEqual([])
        expect(app.world.ui.lastAlert()).toContain('Stopping')
        expect(scenario.drive.tree(scenario.sharedDriveId)).not.toEqual(
          EXPECTED_TREE
        )

        app.call('continueJob')
        fireTriggersUntilQuiet(app)

        expect(scenario.drive.tree(scenario.sharedDriveId)).toEqual(
          EXPECTED_TREE
        )
      })

      it('clears a stray trigger when there is nothing left to continue', () => {
        const { app } = ready(kind)
        app.call('scanAndPlan')
        app.world.triggers.push({
          handler: 'continueFromTrigger',
          afterMs: 1,
          getHandlerFunction: () => 'continueFromTrigger',
        })

        expect(fireTriggersUntilQuiet(app)).toBe(1)
      })

      it('picks up changed settings when a job is started afresh', () => {
        const { app, scenario } = ready(kind)
        app.call('scanAndPlan')
        typeConfig(app, { othersFiles: 'SKIP' })

        app.call('migrate')

        expect(itemRow(app, 'Team Files/Budget/Notes').Status).toBe('SKIPPED')
        expect(scenario.drive.tree(scenario.sharedDriveId)).not.toContain(
          'Team Files/Budget/Notes'
        )
      })
    })

    it('surfaces a killed execution as an error the fake can throw', () => {
      expect(new ExecutionKilled().message).toBe(
        'Exceeded maximum execution time'
      )
    })
  }
)

describe('the generated Code.js', () => {
  const bundle = readFileSync(BUNDLE_PATH, 'utf8')

  it('defines exactly the entry points as top-level functions', () => {
    const app = startApp('bundle', buildScenario().drive)

    expect(app.functions().sort()).toEqual([
      'continueFromTrigger',
      'continueJob',
      'dryRun',
      'migrate',
      'onOpen',
      'scanAndPlan',
      'setUpSheets',
      'showHelp',
      'stopJob',
    ])
  })

  it('uses nothing the Apps Script runtime lacks', () => {
    for (const missing of [
      'URLSearchParams',
      'new URL(',
      'require(',
      'process.',
      'setTimeout',
      'fetch(',
      'import {',
      'export {',
      'export default',
    ]) {
      const hits = bundle
        .split('\n')
        .filter(
          (line) =>
            line.includes(missing) &&
            !line.trim().startsWith('*') &&
            !line.trim().startsWith('//')
        )
        .filter(
          (line) =>
            !(missing === 'fetch(' && line.includes('UrlFetchApp.fetch('))
        )
      expect(hits, `bundle uses ${missing}`).toEqual([])
    }
  })

  it('is plain script: no module syntax for Apps Script to choke on', () => {
    expect(() => new vm.Script(bundle)).not.toThrow()
  })
})
