import { ConfigError } from './errors'
import type { Config, MoveRefusedPolicy, OthersFilesPolicy } from './model'

export type ConfigKey = keyof Config

export interface ConfigField {
  key: ConfigKey
  label: string
  defaultValue: string
  help: string
  /** Allowed values, when the cell should be a drop-down. */
  choices?: readonly string[]
}

const YES_NO = ['Yes', 'No'] as const
const DEFAULT_MINUTES = 4
const MAX_MINUTES = 5

/** Rows of the Config sheet, in display order. The label is the lookup key. */
export const CONFIG_FIELDS: readonly ConfigField[] = [
  {
    key: 'sourceId',
    label: 'Source folder',
    defaultValue: '',
    help: 'URL or ID of the folder to migrate.',
  },
  {
    key: 'destinationId',
    label: 'Destination',
    defaultValue: '',
    help: 'URL or ID of the shared drive, or of a folder inside one.',
  },
  {
    key: 'createRootFolder',
    label: 'Create top-level folder',
    defaultValue: 'Yes',
    help: 'Yes: recreate the source folder itself inside the destination. No: merge its contents straight into the destination.',
    choices: YES_NO,
  },
  {
    key: 'pathFilter',
    label: 'Only this path',
    defaultValue: '',
    help: 'Optional. A value from the Path column; only that item and everything beneath it is migrated. Use it to try a small subtree first.',
  },
  {
    key: 'othersFiles',
    label: "Files I don't own",
    defaultValue: 'COPY',
    help: 'COPY: make a copy (revision history is lost). SHORTCUT: leave a shortcut to the original. SKIP: leave them out.',
    choices: ['COPY', 'SHORTCUT', 'SKIP'],
  },
  {
    key: 'tryMoveOthersFiles',
    label: "Try to move files I don't own",
    defaultValue: 'No',
    help: "Yes: attempt a real move first (keeps history; only works when the owner's Workspace admin lets editors move files into shared drives, and it takes the file out of the owner's My Drive). Falls back to the setting above when refused.",
    choices: YES_NO,
  },
  {
    key: 'moveRefused',
    label: 'If moving my own file is refused',
    defaultValue: 'FAIL',
    help: 'FAIL: mark the row FAILED so you can decide. COPY: copy it instead (revision history is lost).',
    choices: ['FAIL', 'COPY'],
  },
  {
    key: 'copyComments',
    label: 'Carry comments onto copies',
    defaultValue: 'Yes',
    help: 'Open comments are copied natively where Drive supports it; anything else is re-posted as text with the original author and date.',
    choices: YES_NO,
  },
  {
    key: 'allowDuplicateNames',
    label: 'Allow duplicate names',
    defaultValue: 'No',
    help: 'No: a file is skipped when the destination folder already holds one with the same name.',
    choices: YES_NO,
  },
  {
    key: 'autoContinue',
    label: 'Continue automatically',
    defaultValue: 'Yes',
    help: 'Yes: when a run nears the Apps Script time limit, schedule the next run a minute later. No: use the menu to continue.',
    choices: YES_NO,
  },
  {
    key: 'minutesPerRun',
    label: 'Minutes per run',
    defaultValue: String(DEFAULT_MINUTES),
    help: `How long one run works before pausing (1-${String(MAX_MINUTES)}). Apps Script kills a run at 6 minutes.`,
  },
]

const ID_PATTERN = /^[A-Za-z0-9_-]{10,}$/
const URL_ID_PATTERNS = [
  /\/folders\/([A-Za-z0-9_-]{10,})/,
  /\/drive\/u\/\d+\/folders\/([A-Za-z0-9_-]{10,})/,
  /[?&]id=([A-Za-z0-9_-]{10,})/,
  /\/d\/([A-Za-z0-9_-]{10,})/,
]

/** Accepts a bare Drive ID or any Drive URL that contains one. */
export function extractDriveId(input: string): string {
  const text = input.trim()
  if (ID_PATTERN.test(text)) {
    return text
  }
  for (const pattern of URL_ID_PATTERNS) {
    const match = pattern.exec(text)
    if (match?.[1] !== undefined) {
      return match[1]
    }
  }
  return ''
}

function yesNo(label: string, value: string): boolean {
  const text = value.trim().toLowerCase()
  if (['yes', 'y', 'true'].includes(text)) {
    return true
  }
  if (['no', 'n', 'false'].includes(text)) {
    return false
  }
  throw new ConfigError(`"${label}" must be Yes or No, not "${value}".`)
}

function oneOf<T extends string>(
  label: string,
  value: string,
  choices: readonly T[]
): T {
  const text = value.trim().toUpperCase()
  const found = choices.find((choice) => choice === text)
  if (found === undefined) {
    throw new ConfigError(
      `"${label}" must be one of ${choices.join(', ')}, not "${value}".`
    )
  }
  return found
}

function driveId(label: string, value: string): string {
  if (value.trim() === '') {
    throw new ConfigError(`Fill in "${label}" on the Config sheet.`)
  }
  const id = extractDriveId(value)
  if (id === '') {
    throw new ConfigError(
      `"${label}" is not a Drive URL or ID: "${value.trim()}".`
    )
  }
  return id
}

function minutes(label: string, value: string): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > MAX_MINUTES) {
    throw new ConfigError(
      `"${label}" must be a number from 1 to ${String(MAX_MINUTES)}, not "${value}".`
    )
  }
  return parsed
}

/** Trims slashes and whitespace so `/A/B/` and `A/B` filter alike. */
export function normalizePath(path: string): string {
  return path.trim().replace(/^\/+|\/+$/g, '')
}

/**
 * Turns the label -> text map read from the Config sheet into a typed
 * {@link Config}. Missing rows take their default; bad values throw
 * {@link ConfigError} with a message meant for the person running the tool.
 */
export function parseConfig(values: Record<string, string>): Config {
  const raw = (key: ConfigKey): { label: string; value: string } => {
    const field = CONFIG_FIELDS.find((candidate) => candidate.key === key)
    if (field === undefined) {
      throw new ConfigError(`Unknown config key ${key}.`)
    }
    const value = values[field.label]
    return {
      label: field.label,
      value:
        value === undefined || value.trim() === '' ? field.defaultValue : value,
    }
  }
  const bool = (key: ConfigKey): boolean => {
    const { label, value } = raw(key)
    return yesNo(label, value)
  }
  const source = raw('sourceId')
  const destination = raw('destinationId')
  const others = raw('othersFiles')
  const refused = raw('moveRefused')
  const perRun = raw('minutesPerRun')
  const config: Config = {
    sourceId: driveId(source.label, source.value),
    destinationId: driveId(destination.label, destination.value),
    createRootFolder: bool('createRootFolder'),
    pathFilter: normalizePath(raw('pathFilter').value),
    othersFiles: oneOf<OthersFilesPolicy>(others.label, others.value, [
      'COPY',
      'SHORTCUT',
      'SKIP',
    ]),
    tryMoveOthersFiles: bool('tryMoveOthersFiles'),
    moveRefused: oneOf<MoveRefusedPolicy>(refused.label, refused.value, [
      'FAIL',
      'COPY',
    ]),
    copyComments: bool('copyComments'),
    allowDuplicateNames: bool('allowDuplicateNames'),
    autoContinue: bool('autoContinue'),
    minutesPerRun: minutes(perRun.label, perRun.value),
  }
  if (config.sourceId === config.destinationId) {
    throw new ConfigError('Source and destination are the same folder.')
  }
  return config
}
