/**
 * Bundles `src/index.ts` into `dist/Code.js`, the single file that is pasted
 * (or pushed with clasp) into the Apps Script editor.
 *
 * Apps Script has no module system: every file runs in one global scope, and
 * the menu, `onOpen` and triggers can only call top-level functions. So the
 * bundle is an IIFE assigned to one global, followed by a generated one-line
 * top-level function for each export of the entry point.
 *
 *   node build.mjs           write dist/
 *   node build.mjs --check   fail if dist/ is not what the sources produce
 */

import { build } from 'esbuild'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const GLOBAL_NAME = 'DriveMigrate'

const BANNER = `/**
 * Drive migration: moves a My Drive folder into a shared drive, driven from
 * this spreadsheet.
 *
 * GENERATED FILE - do not edit. Built from the TypeScript sources in
 * https://github.com/heisencoder/ai-playground/tree/main/drive-migrate-apps-script
 */`

const shared = {
  entryPoints: [path.join(root, 'src/index.ts')],
  bundle: true,
  write: false,
  target: 'es2020',
  platform: 'neutral',
  charset: 'utf8',
  legalComments: 'none',
}

/** Names exported by the entry point, read from an ES-module build's metadata. */
async function entryPointNames() {
  const result = await build({ ...shared, format: 'esm', metafile: true })
  return Object.values(result.metafile.outputs).flatMap(
    (output) => output.exports
  )
}

async function bundle() {
  const result = await build({
    ...shared,
    format: 'iife',
    globalName: GLOBAL_NAME,
  })
  const output = result.outputFiles[0]
  const exportsOf = await entryPointNames()
  if (output === undefined || exportsOf.length === 0) {
    throw new Error('esbuild produced no output or no entry points')
  }
  const stubs = [...exportsOf]
    .sort()
    .map(
      (name) => `function ${name}() {\n  return ${GLOBAL_NAME}.${name}();\n}`
    )
  return `${BANNER}\n${output.text}\n${stubs.join('\n')}\n`
}

async function readOrEmpty(file) {
  try {
    return await readFile(file, 'utf8')
  } catch {
    return ''
  }
}

const outputs = {
  'dist/Code.js': await bundle(),
  'dist/appsscript.json': await readFile(
    path.join(root, 'appsscript.json'),
    'utf8'
  ),
}

if (process.argv.includes('--check')) {
  const stale = []
  for (const [file, content] of Object.entries(outputs)) {
    if ((await readOrEmpty(path.join(root, file))) !== content) {
      stale.push(file)
    }
  }
  if (stale.length > 0) {
    console.error(
      `Out of date: ${stale.join(', ')}. Run "npm run build" and commit the result.`
    )
    process.exit(1)
  }
  console.log('dist/ is up to date.')
} else {
  await mkdir(path.join(root, 'dist'), { recursive: true })
  for (const [file, content] of Object.entries(outputs)) {
    await writeFile(path.join(root, file), content)
    console.log(`wrote ${file} (${String(content.length)} bytes)`)
  }
}
