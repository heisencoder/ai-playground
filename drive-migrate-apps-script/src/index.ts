/**
 * Bundle entry point. Everything exported here becomes a top-level function in
 * the generated `Code.js`, which is how Apps Script finds menu handlers,
 * `onOpen` and trigger handlers. See `build.mjs`.
 */
export {
  continueFromTrigger,
  continueJob,
  dryRun,
  migrate,
  onOpen,
  scanAndPlan,
  setUpSheets,
  showHelp,
  stopJob,
} from './gas/main'
