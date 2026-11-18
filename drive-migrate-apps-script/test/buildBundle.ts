import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** Vitest global setup: the bundle tests always run against a fresh build. */
export default function buildBundle(): void {
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
  execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' })
}
