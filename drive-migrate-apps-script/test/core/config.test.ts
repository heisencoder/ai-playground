import { describe, expect, it } from 'vitest'
import {
  CONFIG_FIELDS,
  extractDriveId,
  normalizePath,
  parseConfig,
} from '../../src/core/config'
import { ConfigError } from '../../src/core/errors'
import { configValues } from '../fakes/scenario'

const SOURCE = '1AbCdEfGhIjKlMnOpQrStUvWxYz012345'
const DEST = '0AAbbCCddEEffUk9PVA'
const required = { sourceId: SOURCE, destinationId: DEST }

describe('extractDriveId', () => {
  it.each([
    [SOURCE, SOURCE],
    [`  ${SOURCE}  `, SOURCE],
    [`https://drive.google.com/drive/folders/${SOURCE}`, SOURCE],
    [`https://drive.google.com/drive/folders/${SOURCE}?usp=sharing`, SOURCE],
    [`https://drive.google.com/drive/u/2/folders/${DEST}`, DEST],
    [`https://drive.google.com/open?id=${SOURCE}`, SOURCE],
    [`https://docs.google.com/document/d/${SOURCE}/edit`, SOURCE],
    ['not a link', ''],
    ['', ''],
  ])('reads %s', (input, expected) => {
    expect(extractDriveId(input)).toBe(expected)
  })
})

describe('parseConfig', () => {
  it('applies the documented defaults', () => {
    expect(parseConfig(configValues(required))).toEqual({
      sourceId: SOURCE,
      destinationId: DEST,
      createRootFolder: true,
      pathFilter: '',
      othersFiles: 'COPY',
      tryMoveOthersFiles: false,
      moveRefused: 'FAIL',
      copyComments: true,
      allowDuplicateNames: false,
      autoContinue: true,
      minutesPerRun: 4,
    })
  })

  it('treats a blank cell as "use the default"', () => {
    const config = parseConfig(
      configValues({ ...required, othersFiles: '  ', minutesPerRun: '' })
    )

    expect(config.othersFiles).toBe('COPY')
    expect(config.minutesPerRun).toBe(4)
  })

  it('is forgiving about case and spelling of yes and no', () => {
    const config = parseConfig(
      configValues({
        ...required,
        createRootFolder: 'no',
        tryMoveOthersFiles: 'TRUE',
        othersFiles: 'shortcut',
        moveRefused: ' copy ',
      })
    )

    expect(config.createRootFolder).toBe(false)
    expect(config.tryMoveOthersFiles).toBe(true)
    expect(config.othersFiles).toBe('SHORTCUT')
    expect(config.moveRefused).toBe('COPY')
  })

  it.each([
    [{ destinationId: DEST }, 'Fill in "Source folder"'],
    [{ sourceId: SOURCE }, 'Fill in "Destination"'],
    [{ ...required, sourceId: 'see my drive' }, 'is not a Drive URL or ID'],
    [{ ...required, destinationId: SOURCE }, 'the same folder'],
    [{ ...required, copyComments: 'maybe' }, 'must be Yes or No'],
    [
      { ...required, othersFiles: 'DELETE' },
      'must be one of COPY, SHORTCUT, SKIP',
    ],
    [{ ...required, minutesPerRun: '9' }, 'must be a number from 1 to 5'],
    [{ ...required, minutesPerRun: 'four' }, 'must be a number from 1 to 5'],
  ])('explains what is wrong with %j', (values, message) => {
    expect(() => parseConfig(configValues(values))).toThrow(ConfigError)
    expect(() => parseConfig(configValues(values))).toThrow(message)
  })

  it('has a label, default and help text for every setting', () => {
    const labels = CONFIG_FIELDS.map((field) => field.label)

    expect(new Set(labels).size).toBe(labels.length)
    for (const field of CONFIG_FIELDS) {
      expect(field.help.length).toBeGreaterThan(10)
      if (field.choices !== undefined) {
        expect(field.choices).toContain(field.defaultValue)
      }
    }
  })
})

describe('normalizePath', () => {
  it('ignores surrounding slashes and spaces', () => {
    expect(normalizePath(' /Team Files/Budget/ ')).toBe('Team Files/Budget')
  })
})
