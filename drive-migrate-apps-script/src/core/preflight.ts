/**
 * Preflight: resolve the configured source and destination and confirm, before
 * anything else runs, that the signed-in account can read one and write to the
 * other. Read-only.
 */

import { ConfigError, DriveError } from './errors'
import type { Config, DriveFile, DrivePort } from './model'
import { FOLDER_MIME } from './model'

const HTTP_NOT_FOUND = 404

export interface Resolved {
  userEmail: string
  source: DriveFile
  sourceName: string
  /** Folder ID that receives the content (a shared drive's root ID is its own ID). */
  destRootId: string
  destDriveId: string
  destName: string
}

function fetchFile(
  drive: DrivePort,
  id: string,
  what: string,
  user: string
): DriveFile {
  try {
    return drive.getFile(id)
  } catch (error) {
    if (error instanceof DriveError && error.status === HTTP_NOT_FOUND) {
      throw new ConfigError(
        `${what} not found. Check the link, and that ${user} has access to it.`
      )
    }
    throw error
  }
}

function resolveDestination(
  drive: DrivePort,
  id: string,
  user: string
): { rootId: string; driveId: string; name: string; canAdd: boolean } {
  const sharedDrive = drive.getSharedDrive(id)
  if (sharedDrive !== null) {
    return {
      rootId: sharedDrive.id,
      driveId: sharedDrive.id,
      name: sharedDrive.name ?? sharedDrive.id,
      canAdd: sharedDrive.capabilities?.canAddChildren ?? true,
    }
  }
  const folder = fetchFile(drive, id, 'Destination', user)
  if (
    folder.mimeType !== FOLDER_MIME ||
    folder.driveId === undefined ||
    folder.driveId === ''
  ) {
    throw new ConfigError(
      'The destination must be a shared drive, or a folder inside a shared drive.'
    )
  }
  return {
    rootId: folder.id,
    driveId: folder.driveId,
    name: folder.name ?? folder.id,
    canAdd: folder.capabilities?.canAddChildren ?? true,
  }
}

export function preflight(drive: DrivePort, config: Config): Resolved {
  const userEmail = drive.about().emailAddress ?? 'your account'
  const source = fetchFile(drive, config.sourceId, 'Source folder', userEmail)
  if (source.mimeType !== FOLDER_MIME) {
    throw new ConfigError('The source must be a folder.')
  }
  if (source.driveId !== undefined && source.driveId !== '') {
    throw new ConfigError(
      'The source folder is already in a shared drive. This tool migrates folders from My Drive.'
    )
  }
  const destination = resolveDestination(drive, config.destinationId, userEmail)
  if (!destination.canAdd) {
    throw new ConfigError(
      `${userEmail} cannot add files to "${destination.name}". Ask a manager of the shared drive for Content manager (or Manager) access.`
    )
  }
  return {
    userEmail,
    source,
    sourceName: source.name ?? source.id,
    destRootId: destination.rootId,
    destDriveId: destination.driveId,
    destName: destination.name,
  }
}
