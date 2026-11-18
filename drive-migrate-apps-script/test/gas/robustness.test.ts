import { afterEach, describe, expect, it, vi } from 'vitest'
import { SHEET_NAMES } from '../../src/gas/sheetStore'
import type { AppKind } from '../fakes/app'
import {
  EXPECTED_TREE,
  fireTrigger,
  fireTriggersUntilQuiet,
  itemRow,
  itemRows,
  ready,
  typeItemCell,
} from '../fakes/app'

const KILLED = 'Exceeded maximum execution time'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe.each<AppKind>(['sources', 'bundle'])(
  'robustness, run from %s',
  (kind) => {
    describe('when something goes wrong mid-run', () => {
      it('reports an unexpected failure and can carry on afterwards', () => {
        const { app, scenario } = ready(kind)
        app.call('scanAndPlan')
        app.world.flushFailsIn = 4 // part-way through the migration

        app.call('migrate')

        expect(app.world.ui.lastAlert()).toMatch(
          /^Migration stopped on an unexpected error: Service Spreadsheets failed.*choose "Continue a paused job" to carry on\.$/
        )
        expect(app.world.lockHeld).toBe(false)
        expect(app.world.triggers).toEqual([])
        const log = app.world.spreadsheet.sheet(SHEET_NAMES.log).rows()
        expect(log.some((row) => row[1] === 'ERROR')).toBe(true)
        expect(scenario.drive.tree(scenario.sharedDriveId)).not.toEqual(
          EXPECTED_TREE
        )

        app.call('continueJob')

        expect(app.world.ui.lastAlert()).toContain('Migration complete')
        expect(scenario.drive.tree(scenario.sharedDriveId)).toEqual(
          EXPECTED_TREE
        )
      })

      it('says to start again when the failure came before the job began', () => {
        const { app, scenario } = ready(kind)
        app.call('scanAndPlan')
        app.world.flushFailsIn = 1 // while preparing, before anything is recorded

        app.call('migrate')

        expect(app.world.ui.lastAlert()).toContain(
          'choose it from the menu again'
        )
        expect(scenario.drive.writes()).toEqual([])

        app.call('migrate')
        expect(scenario.drive.tree(scenario.sharedDriveId)).toEqual(
          EXPECTED_TREE
        )
      })

      it('rides out a dropped connection on a read', () => {
        const { app } = ready(kind)
        app.world.fetchFailures = 2

        app.call('scanAndPlan')

        expect(app.world.ui.lastAlert()).toContain('Scan complete: 12 item(s)')
        expect(app.world.sleeps).toHaveLength(2)
      })

      it('marks a write that got no response FAILED, then checks before retrying', () => {
        const { app, scenario } = ready(kind)
        app.call('scanAndPlan')
        const passThrough = scenario.drive.onRequest
        let armed = true
        scenario.drive.onRequest = (request) => {
          passThrough(request)
          if (armed && request.method === 'POST') {
            armed = false
            app.world.fetchFailures = 1
          }
        }

        app.call('migrate')
        expect(
          itemRows(app).filter((row) => row.Status === 'FAILED')
        ).toHaveLength(1)
        app.call('migrate')

        expect(scenario.drive.tree(scenario.sharedDriveId)).toEqual(
          EXPECTED_TREE
        )
      })

      it('says so if a row is deleted during a run', () => {
        const { app, scenario } = ready(kind)
        app.call('scanAndPlan')
        const sheet = app.world.spreadsheet.sheet(SHEET_NAMES.items)
        const passThrough = scenario.drive.onRequest
        let deleted = false
        scenario.drive.onRequest = (request) => {
          passThrough(request)
          if (!deleted && request.method !== 'GET') {
            deleted = true
            sheet.state.values.splice(1, 1) // the source folder's own row
          }
        }

        app.call('migrate')

        expect(app.world.ui.lastAlert()).toContain(
          'The Items row for "Team Files" has gone'
        )
      })
    })

    describe('keeping the sheet and Drive in step', () => {
      it('puts progress on the right rows when the sheet is sorted mid-run', () => {
        const { app, scenario } = ready(kind)
        app.call('scanAndPlan')
        const sheet = app.world.spreadsheet.sheet(SHEET_NAMES.items)
        const passThrough = scenario.drive.onRequest
        const sortAt = new Set([3, 9])
        let writes = 0
        scenario.drive.onRequest = (request) => {
          passThrough(request)
          if (request.method === 'GET') {
            return
          }
          writes += 1
          if (sortAt.has(writes)) {
            const rows = sheet.state.values
              .slice(1, sheet.getLastRow())
              .reverse()
            sheet.state.values.splice(1, rows.length, ...rows)
          }
        }

        app.call('migrate')

        expect(scenario.drive.tree(scenario.sharedDriveId)).toEqual(
          EXPECTED_TREE
        )
        for (const row of itemRows(app)) {
          if (row.Status === 'DONE') {
            // Each row's recorded destination really is that row's own item.
            const file = scenario.drive.files.get(row['Destination ID'] ?? '')
            expect(file?.name, row.Path).toBe(row.Name)
          } else {
            expect(row.Status, row.Path).toBe('SKIPPED')
          }
        }
        expect(itemRow(app, 'Team Files/Roadmap')['Destination ID']).toBe(
          scenario.ids.roadmap
        )
      })

      it('asks before scanning again, and keeps the Override column', () => {
        const { app, scenario } = ready(kind)
        app.call('scanAndPlan')
        typeItemCell(app, 'Team Files/Roadmap', 'Override', 'SKIP')
        const requests = scenario.drive.requests.length

        app.world.ui.nextAnswer = 'CANCEL'
        app.call('scanAndPlan')
        expect(app.world.ui.lastAlert()).toContain(
          'Your Override values are kept'
        )
        expect(scenario.drive.requests).toHaveLength(requests)

        app.world.ui.nextAnswer = 'OK'
        app.call('scanAndPlan')

        expect(itemRow(app, 'Team Files/Roadmap').Override).toBe('SKIP')
        expect(itemRow(app, 'Team Files/Shared spec').Override).toBe('')
      })

      it('forgets an Override that was cleared before scanning again', () => {
        const { app } = ready(kind)
        app.call('scanAndPlan')
        typeItemCell(app, 'Team Files/Roadmap', 'Override', 'SKIP')
        app.call('scanAndPlan')
        typeItemCell(app, 'Team Files/Roadmap', 'Override', '')

        app.call('scanAndPlan')

        expect(itemRow(app, 'Team Files/Roadmap').Override).toBe('')
      })

      it('counts only what the path filter covers in the confirmation', () => {
        const { app } = ready(kind, { pathFilter: 'Team Files/Budget' })
        app.call('scanAndPlan')
        app.world.ui.nextAnswer = 'CANCEL'

        app.call('migrate')

        expect(app.world.ui.lastAlert()).toContain(
          'under "Team Files/Budget": up to 1 file(s) moved, 1 copied, 0 shortcut(s) and 2 folder(s) created'
        )
      })

      it('asks before a different job displaces a paused migration', () => {
        const { app, scenario } = ready(kind, { minutesPerRun: '1' })
        app.call('scanAndPlan')
        app.world.latencyMs = 9_000
        app.call('migrate')
        const requests = scenario.drive.requests.length
        app.world.ui.nextAnswer = 'CANCEL'

        app.call('dryRun')

        expect(app.world.ui.lastAlert()).toContain(
          'A migration is paused part-way'
        )
        expect(scenario.drive.requests).toHaveLength(requests)
        expect(app.world.triggers).toHaveLength(1)
      })

      it('obeys Stop even if a trigger had already been released', () => {
        const { app, scenario } = ready(kind, { minutesPerRun: '1' })
        app.call('scanAndPlan')
        app.world.latencyMs = 9_000
        app.call('migrate')
        app.call('stopJob')
        const writes = scenario.drive.writes().length

        fireTrigger(app)

        expect(scenario.drive.writes()).toHaveLength(writes)
        expect(app.world.triggers).toEqual([])
      })
    })

    describe('an execution that Apps Script kills', () => {
      it('is picked up by the safety-net trigger and finished', () => {
        const { app, scenario } = ready(kind)
        app.call('scanAndPlan')
        scenario.drive.killAfterWrites = 5

        expect(() => {
          app.call('migrate')
        }).toThrow(KILLED)
        app.world.crash()

        expect(app.world.triggers.map((trigger) => trigger.afterMs)).toEqual([
          7 * 60_000,
        ])
        fireTriggersUntilQuiet(app)

        expect(scenario.drive.tree(scenario.sharedDriveId)).toEqual(
          EXPECTED_TREE
        )
        expect(app.world.spreadsheet.toasts.at(-1)).toContain(
          'Migration complete'
        )
      })

      it('stops continuing by itself after three kills in a row', () => {
        const { app, scenario } = ready(kind)
        app.call('scanAndPlan')
        const killed = (call: () => void): void => {
          scenario.drive.killAfterWrites = 1
          expect(call).toThrow(KILLED)
          app.world.crash()
        }
        killed(() => {
          app.call('migrate')
        })
        killed(() => {
          fireTrigger(app)
        })
        killed(() => {
          fireTrigger(app)
        })
        const writes = scenario.drive.writes().length

        fireTrigger(app)

        expect(scenario.drive.writes()).toHaveLength(writes)
        expect(app.world.triggers).toEqual([])
        const log = app.world.spreadsheet.sheet(SHEET_NAMES.log).rows()
        expect(log.at(-1)?.[2]).toContain('cut off 3 times in a row')

        app.call('continueJob')
        fireTriggersUntilQuiet(app)
        expect(scenario.drive.tree(scenario.sharedDriveId)).toEqual(
          EXPECTED_TREE
        )
      })

      it('does not set a safety net when automatic continuation is off', () => {
        const { app, scenario } = ready(kind, { autoContinue: 'No' })
        app.call('scanAndPlan')
        scenario.drive.killAfterWrites = 5

        expect(() => {
          app.call('migrate')
        }).toThrow(KILLED)
        app.world.crash()

        expect(app.world.triggers).toEqual([])
        app.call('continueJob')
        expect(scenario.drive.tree(scenario.sharedDriveId)).toEqual(
          EXPECTED_TREE
        )
      })
    })
  }
)
