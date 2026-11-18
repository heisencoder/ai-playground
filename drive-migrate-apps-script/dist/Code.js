/**
 * Drive migration: moves a My Drive folder into a shared drive, driven from
 * this spreadsheet.
 *
 * GENERATED FILE - do not edit. Built from the TypeScript sources in
 * https://github.com/heisencoder/ai-playground/tree/main/drive-migrate-apps-script
 */
"use strict";
var DriveMigrate = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    continueFromTrigger: () => continueFromTrigger,
    continueJob: () => continueJob,
    dryRun: () => dryRun,
    migrate: () => migrate,
    onOpen: () => onOpen,
    scanAndPlan: () => scanAndPlan,
    setUpSheets: () => setUpSheets,
    showHelp: () => showHelp,
    stopJob: () => stopJob
  });

  // src/core/errors.ts
  var DriveError = class extends Error {
    constructor(message, status, reason) {
      super(message);
      this.name = "DriveError";
      this.status = status;
      this.reason = reason;
    }
  };
  var DisallowedOperationError = class extends Error {
    constructor(message) {
      super(message);
      this.name = "DisallowedOperationError";
    }
  };
  var ConfigError = class extends Error {
    constructor(message) {
      super(message);
      this.name = "ConfigError";
    }
  };
  function errorMessage(error) {
    if (typeof error === "object" && error !== null && "message" in error) {
      return String(error.message);
    }
    return String(error);
  }

  // src/core/comments.ts
  var COMMENT_BANNER = "[migrated comment]";
  var REPLY_BANNER = "[migrated reply]";
  var DATE_LENGTH = 10;
  var MAX_QUOTE = 500;
  var MAX_CONTENT = 4e3;
  var ELLIPSIS = "...";
  function clip(text, max) {
    return text.length <= max ? text : text.slice(0, max - ELLIPSIS.length) + ELLIPSIS;
  }
  function render(entry, banner, quoted = "") {
    const author = entry.author?.displayName ?? "Unknown author";
    const when = (entry.createdTime ?? "").slice(0, DATE_LENGTH);
    const lines = [`${banner} ${author}${when === "" ? "" : ` - ${when}`}`];
    if (quoted !== "") {
      lines.push(`> ${clip(quoted, MAX_QUOTE).replace(/\n/g, "\n> ")}`);
    }
    lines.push(entry.content ?? "");
    return clip(lines.join("\n").trim(), MAX_CONTENT);
  }
  function renderComment(comment) {
    return render(comment, COMMENT_BANNER, comment.quotedFileContent?.value);
  }
  function renderReply(reply) {
    return render(reply, REPLY_BANNER);
  }
  function live(comments) {
    return comments.filter((comment) => comment.deleted !== true);
  }
  function repostThread(drive, destId, thread, text, posted) {
    const commentId = posted?.id ?? drive.createComment(destId, text).id ?? "";
    const present = new Set((posted?.replies ?? []).map((reply) => reply.content));
    for (const reply of thread.replies ?? []) {
      const replyText = renderReply(reply);
      if (reply.deleted !== true && (reply.content ?? "") !== "" && !present.has(replyText)) {
        drive.createReply(destId, commentId, replyText, false);
      }
    }
    if (thread.resolved === true && posted?.resolved !== true) {
      drive.createReply(
        destId,
        commentId,
        `${COMMENT_BANNER} thread was resolved on the original.`,
        true
      );
    }
  }
  function sortDestination(source, existing) {
    const renders = new Set(source.map(renderComment));
    const reposts = /* @__PURE__ */ new Map();
    let native = 0;
    for (const comment of existing) {
      const text = comment.content ?? "";
      if (renders.has(text)) {
        reposts.set(text, [...reposts.get(text) ?? [], comment]);
      } else {
        native += 1;
      }
    }
    return { reposts, native };
  }
  function readThreads(drive, sourceId, destId, nativeExpected, outcome) {
    try {
      const source = live(drive.listComments(sourceId));
      outcome.total = source.length;
      if (source.length === 0) {
        return { source, reposts: /* @__PURE__ */ new Map(), native: 0 };
      }
      let sorted = sortDestination(source, live(drive.listComments(destId)));
      const openThreads = source.some((thread) => thread.resolved !== true);
      if (nativeExpected && openThreads && sorted.native === 0) {
        sorted = sortDestination(source, live(drive.listComments(destId)));
      }
      return { source, ...sorted };
    } catch (error) {
      if (!(error instanceof DriveError)) {
        throw error;
      }
      outcome.errors.push(`could not read comments: ${error.message}`);
      return null;
    }
  }
  function carryComments(drive, sourceId, destId, nativeExpected, shouldStop) {
    const outcome = {
      total: 0,
      native: 0,
      reposted: 0,
      errors: [],
      complete: true
    };
    const threads = readThreads(drive, sourceId, destId, nativeExpected, outcome);
    if (threads === null || threads.source.length === 0) {
      return outcome;
    }
    outcome.native = threads.native;
    const candidates = threads.native > 0 ? threads.source.filter((thread) => thread.resolved === true) : threads.source;
    for (const thread of candidates) {
      if (shouldStop()) {
        outcome.complete = false;
        break;
      }
      const text = renderComment(thread);
      const posted = threads.reposts.get(text)?.shift();
      try {
        repostThread(drive, destId, thread, text, posted);
        outcome.reposted += 1;
      } catch (error) {
        if (!(error instanceof DriveError)) {
          throw error;
        }
        outcome.errors.push(`comment ${thread.id ?? "?"}: ${error.message}`);
      }
    }
    return outcome;
  }
  var NATIVE_COMMENT_MIMES = /* @__PURE__ */ new Set([
    "application/vnd.google-apps.document",
    "application/vnd.google-apps.spreadsheet",
    "application/vnd.google-apps.presentation"
  ]);
  function describeComments(outcome) {
    if (outcome.total === 0 && outcome.errors.length === 0) {
      return "no comments";
    }
    const parts = [`${String(outcome.total)} comment thread(s)`];
    if (outcome.native > 0) {
      parts.push(`${String(outcome.native)} copied natively`);
    }
    if (outcome.reposted > 0) {
      parts.push(`${String(outcome.reposted)} re-posted as text`);
    }
    if (outcome.errors.length > 0) {
      parts.push(
        `${String(outcome.errors.length)} problem(s): ${outcome.errors[0] ?? ""}`
      );
    }
    return parts.join(", ");
  }

  // src/core/config.ts
  var YES_NO = ["Yes", "No"];
  var DEFAULT_MINUTES = 4;
  var MAX_MINUTES = 5;
  var CONFIG_FIELDS = [
    {
      key: "sourceId",
      label: "Source folder",
      defaultValue: "",
      help: "URL or ID of the folder to migrate."
    },
    {
      key: "destinationId",
      label: "Destination",
      defaultValue: "",
      help: "URL or ID of the shared drive, or of a folder inside one."
    },
    {
      key: "createRootFolder",
      label: "Create top-level folder",
      defaultValue: "Yes",
      help: "Yes: recreate the source folder itself inside the destination. No: merge its contents straight into the destination.",
      choices: YES_NO
    },
    {
      key: "pathFilter",
      label: "Only this path",
      defaultValue: "",
      help: "Optional. A value from the Path column; only that item and everything beneath it is migrated. Use it to try a small subtree first."
    },
    {
      key: "othersFiles",
      label: "Files I don't own",
      defaultValue: "COPY",
      help: "COPY: make a copy (revision history is lost). SHORTCUT: leave a shortcut to the original. SKIP: leave them out.",
      choices: ["COPY", "SHORTCUT", "SKIP"]
    },
    {
      key: "tryMoveOthersFiles",
      label: "Try to move files I don't own",
      defaultValue: "No",
      help: "Yes: attempt a real move first (keeps history; only works when the owner's Workspace admin lets editors move files into shared drives, and it takes the file out of the owner's My Drive). Falls back to the setting above when refused.",
      choices: YES_NO
    },
    {
      key: "moveRefused",
      label: "If moving my own file is refused",
      defaultValue: "FAIL",
      help: "FAIL: mark the row FAILED so you can decide. COPY: copy it instead (revision history is lost).",
      choices: ["FAIL", "COPY"]
    },
    {
      key: "copyComments",
      label: "Carry comments onto copies",
      defaultValue: "Yes",
      help: "Open comments are copied natively where Drive supports it; anything else is re-posted as text with the original author and date.",
      choices: YES_NO
    },
    {
      key: "allowDuplicateNames",
      label: "Allow duplicate names",
      defaultValue: "No",
      help: "No: a file is skipped when the destination folder already holds one with the same name.",
      choices: YES_NO
    },
    {
      key: "autoContinue",
      label: "Continue automatically",
      defaultValue: "Yes",
      help: "Yes: when a run nears the Apps Script time limit, schedule the next run a minute later. No: use the menu to continue.",
      choices: YES_NO
    },
    {
      key: "minutesPerRun",
      label: "Minutes per run",
      defaultValue: String(DEFAULT_MINUTES),
      help: `How long one run works before pausing (1-${String(MAX_MINUTES)}). Apps Script kills a run at 6 minutes.`
    }
  ];
  var ID_PATTERN = /^[A-Za-z0-9_-]{10,}$/;
  var URL_ID_PATTERNS = [
    /\/folders\/([A-Za-z0-9_-]{10,})/,
    /\/drive\/u\/\d+\/folders\/([A-Za-z0-9_-]{10,})/,
    /[?&]id=([A-Za-z0-9_-]{10,})/,
    /\/d\/([A-Za-z0-9_-]{10,})/
  ];
  function extractDriveId(input) {
    const text = input.trim();
    if (ID_PATTERN.test(text)) {
      return text;
    }
    for (const pattern of URL_ID_PATTERNS) {
      const match = pattern.exec(text);
      if (match?.[1] !== void 0) {
        return match[1];
      }
    }
    return "";
  }
  function yesNo(label, value) {
    const text = value.trim().toLowerCase();
    if (["yes", "y", "true"].includes(text)) {
      return true;
    }
    if (["no", "n", "false"].includes(text)) {
      return false;
    }
    throw new ConfigError(`"${label}" must be Yes or No, not "${value}".`);
  }
  function oneOf(label, value, choices) {
    const text = value.trim().toUpperCase();
    const found = choices.find((choice) => choice === text);
    if (found === void 0) {
      throw new ConfigError(
        `"${label}" must be one of ${choices.join(", ")}, not "${value}".`
      );
    }
    return found;
  }
  function driveId(label, value) {
    if (value.trim() === "") {
      throw new ConfigError(`Fill in "${label}" on the Config sheet.`);
    }
    const id = extractDriveId(value);
    if (id === "") {
      throw new ConfigError(
        `"${label}" is not a Drive URL or ID: "${value.trim()}".`
      );
    }
    return id;
  }
  function minutes(label, value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > MAX_MINUTES) {
      throw new ConfigError(
        `"${label}" must be a number from 1 to ${String(MAX_MINUTES)}, not "${value}".`
      );
    }
    return parsed;
  }
  function normalizePath(path) {
    return path.trim().replace(/^\/+|\/+$/g, "");
  }
  function parseConfig(values) {
    const raw = (key) => {
      const field = CONFIG_FIELDS.find((candidate) => candidate.key === key);
      if (field === void 0) {
        throw new ConfigError(`Unknown config key ${key}.`);
      }
      const value = values[field.label];
      return {
        label: field.label,
        value: value === void 0 || value.trim() === "" ? field.defaultValue : value
      };
    };
    const bool = (key) => {
      const { label, value } = raw(key);
      return yesNo(label, value);
    };
    const source = raw("sourceId");
    const destination = raw("destinationId");
    const others = raw("othersFiles");
    const refused = raw("moveRefused");
    const perRun = raw("minutesPerRun");
    const config = {
      sourceId: driveId(source.label, source.value),
      destinationId: driveId(destination.label, destination.value),
      createRootFolder: bool("createRootFolder"),
      pathFilter: normalizePath(raw("pathFilter").value),
      othersFiles: oneOf(others.label, others.value, [
        "COPY",
        "SHORTCUT",
        "SKIP"
      ]),
      tryMoveOthersFiles: bool("tryMoveOthersFiles"),
      moveRefused: oneOf(refused.label, refused.value, [
        "FAIL",
        "COPY"
      ]),
      copyComments: bool("copyComments"),
      allowDuplicateNames: bool("allowDuplicateNames"),
      autoContinue: bool("autoContinue"),
      minutesPerRun: minutes(perRun.label, perRun.value)
    };
    if (config.sourceId === config.destinationId) {
      throw new ConfigError("Source and destination are the same folder.");
    }
    return config;
  }

  // src/core/model.ts
  var FOLDER_MIME = "application/vnd.google-apps.folder";
  var SHORTCUT_MIME = "application/vnd.google-apps.shortcut";
  var UNCOPYABLE_MIMES = /* @__PURE__ */ new Set([
    "application/vnd.google-apps.map",
    "application/vnd.google-apps.site",
    "application/vnd.google-apps.fusiontable"
  ]);
  var SOURCE_ID_PROPERTY = "dmSourceId";
  var ACTIONS = [
    "CREATE_FOLDER",
    "MOVE",
    "COPY",
    "SHORTCUT",
    "SKIP"
  ];
  var FILE_OVERRIDES = [
    "MOVE",
    "COPY",
    "SHORTCUT",
    "SKIP"
  ];
  var STATUSES = [
    "PENDING",
    "IN_PROGRESS",
    "DONE",
    "SKIPPED",
    "FAILED",
    "BLOCKED"
  ];
  function isFolder(item) {
    return item.mimeType === FOLDER_MIME;
  }
  function isShortcut(item) {
    return item.mimeType === SHORTCUT_MIME;
  }
  function effectiveAction(item) {
    return item.override === "" ? item.action : item.override;
  }

  // src/core/plan.ts
  function ownerLabel(item) {
    return item.ownerEmail === "" ? "another user" : item.ownerEmail;
  }
  function copyBlocker(item) {
    if (UNCOPYABLE_MIMES.has(item.mimeType)) {
      return "this file type cannot be copied through the Drive API";
    }
    if (!item.canCopy) {
      return "copying is disabled on the file";
    }
    return "";
  }
  function fallbackForOthersFile(item, policy) {
    const owner = ownerLabel(item);
    if (policy === "SKIP") {
      return { action: "SKIP", reason: `owned by ${owner}; configured to skip` };
    }
    if (policy === "SHORTCUT") {
      return {
        action: "SHORTCUT",
        reason: `owned by ${owner}; a shortcut to the original is created`
      };
    }
    const blocker = copyBlocker(item);
    if (blocker !== "") {
      return { action: "SKIP", reason: `owned by ${owner} and ${blocker}` };
    }
    return {
      action: "COPY",
      reason: `owned by ${owner}; copied (revision history is lost)`
    };
  }
  function classifyOwnFile(item) {
    if (item.canMoveOut) {
      return {
        action: "MOVE",
        reason: "owned by me; a move keeps the file ID, history and comments"
      };
    }
    const blocker = copyBlocker(item);
    if (blocker !== "") {
      return {
        action: "SKIP",
        reason: `owned by me but Drive will not let it be moved, and ${blocker}`
      };
    }
    return {
      action: "COPY",
      reason: "owned by me but Drive will not let it be moved; copied (history is lost)"
    };
  }
  function classify(item, config) {
    if (isFolder(item)) {
      return {
        action: "CREATE_FOLDER",
        reason: "folders are recreated; only files can be moved"
      };
    }
    if (isShortcut(item)) {
      return {
        action: "SHORTCUT",
        reason: "shortcut recreated, pointing at the same target"
      };
    }
    if (item.ownedByMe) {
      return classifyOwnFile(item);
    }
    if (config.tryMoveOthersFiles) {
      const fallback = fallbackForOthersFile(item, config.othersFiles);
      return {
        action: "MOVE",
        reason: `owned by ${ownerLabel(item)}; will try a move, else ${fallback.action}`
      };
    }
    return fallbackForOthersFile(item, config.othersFiles);
  }
  function overrideProblem(item) {
    if (item.override === "") {
      return "";
    }
    if (isFolder(item)) {
      return item.override === "CREATE_FOLDER" || item.override === "SKIP" ? "" : `a folder can only be CREATE_FOLDER or SKIP, not ${item.override}`;
    }
    if (!FILE_OVERRIDES.includes(item.override)) {
      return `a file cannot be ${item.override}`;
    }
    if (item.override === "COPY") {
      const blocker = copyBlocker(item);
      return blocker === "" ? "" : `cannot COPY: ${blocker}`;
    }
    return "";
  }
  function replanned(status) {
    return status === "IN_PROGRESS" || status === "FAILED" ? "IN_PROGRESS" : "PENDING";
  }
  function emptyCounts() {
    return {
      total: 0,
      byAction: { CREATE_FOLDER: 0, MOVE: 0, COPY: 0, SHORTCUT: 0, SKIP: 0 }
    };
  }
  function planItems(items, config, keepStatus = false) {
    const counts = emptyCounts();
    const changed = [];
    for (const item of items) {
      if (item.status !== "DONE") {
        const decision = classify(item, config);
        const status = keepStatus ? item.status || "PENDING" : replanned(item.status);
        if (item.action !== decision.action || item.reason !== decision.reason || item.status !== status) {
          item.action = decision.action;
          item.reason = decision.reason;
          item.status = status;
          changed.push(item);
        }
      }
      const action = effectiveAction(item);
      if (action !== "") {
        counts.total += 1;
        counts.byAction[action] += 1;
      }
    }
    return { changed, counts };
  }

  // src/core/apply.ts
  var DRY_ID_PREFIX = "dryrun:";
  var EXECUTE_BATCH = 10;
  var DRY_RUN_BATCH = 200;
  var HTTP_FORBIDDEN = 403;
  var HTTP_NOT_FOUND = 404;
  var DATE_LENGTH2 = 10;
  var NOT_A_REFUSAL = /* @__PURE__ */ new Set([
    "rateLimitExceeded",
    "userRateLimitExceeded",
    "sharingRateLimitExceeded",
    "teamDrivesParentLimit",
    "teamDriveFileLimitExceeded",
    "storageQuotaExceeded"
  ]);
  var KIND_STATUS = {
    folderCreated: "DONE",
    folderAdopted: "DONE",
    moved: "DONE",
    copied: "DONE",
    shortcut: "DONE",
    skipped: "SKIPPED",
    failed: "FAILED",
    blocked: "BLOCKED",
    partial: "IN_PROGRESS"
  };
  var DRY_SKIP = "would skip: ";
  var DRY_BLOCKED = "blocked: ";
  var DRY_ERROR = "error: ";
  function formatDryRun(kind, message) {
    switch (KIND_STATUS[kind]) {
      case "SKIPPED":
        return DRY_SKIP + message;
      case "BLOCKED":
        return DRY_BLOCKED + message;
      case "FAILED":
        return DRY_ERROR + message;
      default:
        return message;
    }
  }
  function dryStatusOf(item) {
    const text = item.dryRun;
    if (text === "") {
      return "";
    }
    if (text.startsWith(DRY_SKIP)) {
      return "SKIPPED";
    }
    if (text.startsWith(DRY_BLOCKED)) {
      return "BLOCKED";
    }
    return text.startsWith(DRY_ERROR) ? "FAILED" : "DONE";
  }
  function inScope(path, filter) {
    if (filter === "") {
      return true;
    }
    const normal = normalizePath(path);
    return normal === filter || normal.startsWith(`${filter}/`) || filter.startsWith(`${normal}/`);
  }
  function provenance(item, today) {
    const owner = `${item.ownerName} <${item.ownerEmail === "" ? "unknown" : item.ownerEmail}>`;
    const parts = [
      `Copied into this shared drive on ${today.slice(0, DATE_LENGTH2)}.`,
      `Original owner: ${owner.trim()}.`,
      `Original created: ${item.createdTime.slice(0, DATE_LENGTH2)}; last modified: ${item.modifiedTime.slice(0, DATE_LENGTH2)}.`
    ];
    if (item.webViewLink !== "") {
      parts.push(`Original file: ${item.webViewLink}`);
    }
    parts.push(
      "Revision history could not be carried over because the original was copied, not moved."
    );
    return parts.join(" ");
  }
  function emptyCounts2() {
    return {
      folderCreated: 0,
      folderAdopted: 0,
      moved: 0,
      copied: 0,
      shortcut: 0,
      skipped: 0,
      failed: 0,
      blocked: 0,
      partial: 0
    };
  }
  function sourceIdOf(file) {
    return file.properties?.[SOURCE_ID_PROPERTY] ?? "";
  }
  function clearDryRun(items) {
    const changed = [];
    for (const item of items) {
      if (item.dryRun !== "" || item.dryDestId !== "" || item.dryPreExisting) {
        item.dryRun = "";
        item.dryDestId = "";
        item.dryPreExisting = false;
        changed.push(item);
      }
    }
    return changed;
  }
  var Applier = class {
    constructor(deps, mode, items) {
      this.deps = deps;
      this.mode = mode;
      this.items = items;
      this.byId = /* @__PURE__ */ new Map();
      /** Every source ID and every destination ID this migration knows about. */
      this.ownIds = /* @__PURE__ */ new Set();
      this.childrenCache = /* @__PURE__ */ new Map();
      /** Destination folders this run created or found in a fresh listing. */
      this.trusted = /* @__PURE__ */ new Set();
      this.folderProblems = /* @__PURE__ */ new Map();
      this.counts = emptyCounts2();
      this.dry = mode === "DRY_RUN";
      for (const item of items) {
        this.byId.set(item.id, item);
        this.ownIds.add(item.id);
        if (item.destId !== "") {
          this.ownIds.add(item.destId);
        }
      }
    }
    run() {
      const { budget, store: store2 } = this.deps;
      const todo = this.worklist();
      const batchSize = this.dry ? DRY_RUN_BATCH : EXECUTE_BATCH;
      let processed = 0;
      for (let start = 0; start < todo.length; start += batchSize) {
        if (budget.expired()) {
          break;
        }
        const batch = todo.slice(start, start + batchSize);
        const recovering = new Set(
          batch.filter(
            (item) => item.status === "IN_PROGRESS" || item.status === "FAILED"
          )
        );
        if (!this.dry) {
          this.markInProgress(batch);
        }
        for (const item of batch) {
          if (budget.expired()) {
            if (!this.dry && !recovering.has(item)) {
              item.status = "PENDING";
            }
          } else {
            this.record(item, this.process(item, recovering.has(item)));
            processed += 1;
          }
        }
        store2.writeItems(batch);
        store2.flush();
      }
      const remaining = this.worklist().length;
      return {
        mode: this.mode,
        complete: remaining === 0,
        processed,
        remaining,
        counts: this.counts
      };
    }
    /** Rows still to handle, in the order they must be handled. */
    worklist() {
      const filter = this.deps.config.pathFilter;
      const open = this.items.filter(
        (item) => inScope(item.path, filter) && this.isOpen(item)
      );
      const rank = (item) => isShortcut(item) ? 1 : 0;
      return open.sort(
        (a, b) => rank(a) - rank(b) || a.depth - b.depth || a.row - b.row
      );
    }
    isOpen(item) {
      if (this.dry) {
        return item.dryRun === "";
      }
      return item.status === "PENDING" || item.status === "IN_PROGRESS" || item.status === "";
    }
    markInProgress(batch) {
      for (const item of batch) {
        item.status = "IN_PROGRESS";
      }
      this.deps.store.writeItems(batch);
      this.deps.store.flush();
    }
    record(item, outcome) {
      this.counts[outcome.kind] += 1;
      const destId = outcome.destId ?? "";
      const preExisting = outcome.preExisting ?? false;
      if (this.dry) {
        item.dryRun = formatDryRun(outcome.kind, outcome.message);
        item.dryDestId = destId;
        item.dryPreExisting = preExisting;
      } else {
        item.status = KIND_STATUS[outcome.kind];
        item.destId = destId;
        item.destPreExisting = preExisting;
        item.result = outcome.message;
        item.updatedAt = this.deps.timestamp();
        if (destId !== "") {
          this.ownIds.add(destId);
        }
      }
      if (isFolder(item) && destId !== "") {
        this.trusted.add(destId);
      }
      if (outcome.kind === "failed") {
        this.deps.store.log("ERROR", `${item.path}: ${outcome.message}`);
      }
    }
    process(item, recovering) {
      if (item.status === "DONE") {
        return this.alreadyMigrated(item);
      }
      const action = effectiveAction(item);
      if (action === "") {
        return { kind: "failed", message: "not planned yet; run Scan again" };
      }
      const problem = overrideProblem(item);
      if (problem !== "") {
        return { kind: "failed", message: `Override: ${problem}` };
      }
      if (action === "SKIP") {
        return {
          kind: "skipped",
          message: item.override === "SKIP" ? "skipped by override" : item.reason
        };
      }
      if (item.scanState === "ERROR") {
        return {
          kind: "failed",
          message: 'its contents could not be listed during the scan; run "Scan and plan" again'
        };
      }
      try {
        const parent = this.destParentOf(item);
        return "kind" in parent ? parent : this.perform(action, item, parent, recovering);
      } catch (error) {
        if (!(error instanceof DriveError)) {
          throw error;
        }
        return { kind: "failed", message: error.message };
      }
    }
    /** A dry run reports rows the real migration has already finished. */
    alreadyMigrated(item) {
      return {
        kind: isFolder(item) ? "folderAdopted" : "moved",
        message: "already migrated",
        destId: item.destId,
        preExisting: item.destPreExisting
      };
    }
    /**
     * The destination folder the item goes into, or the outcome that explains
     * why it cannot go anywhere (its parent folder was skipped or failed).
     */
    destParentOf(item) {
      if (item.parentId === "") {
        const problem2 = this.folderProblem(this.deps.destRootId);
        return problem2 === "" ? { id: this.deps.destRootId, preExisting: true } : { kind: "blocked", message: problem2 };
      }
      const blocked = {
        kind: "blocked",
        message: "the parent folder has not been created"
      };
      const parent = this.byId.get(item.parentId);
      if (parent === void 0) {
        return blocked;
      }
      const real = parent.status === "DONE";
      const status = real ? "DONE" : this.liveStatus(parent);
      if (status === "SKIPPED") {
        return { kind: "skipped", message: "the parent folder was skipped" };
      }
      const id = real ? parent.destId : parent.dryDestId;
      if (status !== "DONE" || id === "") {
        return blocked;
      }
      const problem = this.folderProblem(id);
      if (problem !== "") {
        return { kind: "blocked", message: problem };
      }
      return {
        id,
        preExisting: real ? parent.destPreExisting : parent.dryPreExisting
      };
    }
    /**
     * Checks, once per run, that a destination folder recorded by an earlier run
     * is still there. Someone may have trashed it since, and a file moved into a
     * trashed folder would be deleted along with it.
     */
    folderProblem(folderId) {
      if (this.isVirtual(folderId) || this.trusted.has(folderId)) {
        return "";
      }
      let problem = this.folderProblems.get(folderId);
      if (problem === void 0) {
        problem = this.inspectFolder(folderId);
        this.folderProblems.set(folderId, problem);
      }
      return problem;
    }
    inspectFolder(folderId) {
      const advice = '; run "Scan and plan" again';
      try {
        const folder = this.deps.drive.getFile(folderId);
        if (folder.trashed === true) {
          return `its destination folder is in the trash${advice}`;
        }
        const drive = folder.driveId ?? "";
        return drive === this.deps.destDriveId ? "" : `its destination folder is not in the destination shared drive${advice}`;
      } catch (error) {
        if (error instanceof DriveError && error.status === HTTP_NOT_FOUND) {
          return `its destination folder no longer exists${advice}`;
        }
        throw error;
      }
    }
    liveStatus(item) {
      return this.dry ? dryStatusOf(item) : item.status;
    }
    perform(action, item, parent, recovering) {
      if (action === "CREATE_FOLDER") {
        return this.createFolder(item, parent, recovering);
      }
      if (isFolder(item)) {
        return { kind: "failed", message: `a folder cannot be ${action}` };
      }
      const found = this.lookFor(item, parent, recovering);
      if (found !== null) {
        return found;
      }
      switch (action) {
        case "MOVE":
          return this.move(item, parent);
        case "COPY":
          return this.copy(item, parent);
        case "SHORTCUT":
          return this.shortcut(item, parent);
        default:
          return { kind: "failed", message: `unknown action ${String(action)}` };
      }
    }
    // -- destination lookups ---------------------------------------------------
    isVirtual(parentId) {
      return parentId.startsWith(DRY_ID_PREFIX);
    }
    childrenOf(parentId) {
      if (this.isVirtual(parentId)) {
        return [];
      }
      let children = this.childrenCache.get(parentId);
      if (children === void 0) {
        children = this.deps.drive.listChildren(parentId, this.deps.destDriveId).filter((child) => child.trashed !== true);
        this.childrenCache.set(parentId, children);
      }
      return children;
    }
    remember(parentId, child) {
      this.childrenCache.get(parentId)?.push(child);
    }
    /**
     * Checks the destination folder for evidence that this file has been handled
     * already, or that a same-named file is in the way. Only needed when the
     * folder existed before this run created it, or when recovering.
     */
    lookFor(item, parent, recovering) {
      if (!parent.preExisting && !recovering) {
        return null;
      }
      const children = this.childrenOf(parent.id);
      const moved = children.find((child) => child.id === item.id);
      if (moved !== void 0) {
        return {
          kind: "moved",
          message: "already in the destination",
          destId: item.id
        };
      }
      const mine = children.find((child) => sourceIdOf(child) === item.id);
      if (mine !== void 0) {
        return this.foundOurs(item, mine);
      }
      if (this.deps.config.allowDuplicateNames) {
        return null;
      }
      const clash = children.find(
        (child) => child.name === item.name && child.mimeType !== FOLDER_MIME && sourceIdOf(child) === "" && !this.ownIds.has(child.id)
      );
      return clash === void 0 ? null : {
        kind: "skipped",
        message: "a file with the same name is already in the destination folder"
      };
    }
    /**
     * The destination already holds something this tool made from the item. What
     * it is decides what is left to do, whatever the row's planned action says
     * (a planned move may have fallen back to a copy).
     */
    foundOurs(item, ours) {
      if (ours.mimeType === SHORTCUT_MIME) {
        return {
          kind: "shortcut",
          message: "already in the destination",
          destId: ours.id
        };
      }
      return this.dry ? { kind: "copied", message: "already copied", destId: ours.id } : this.finishCopy(item, ours.id);
    }
    // -- actions ---------------------------------------------------------------
    createFolder(item, parent, recovering) {
      if (item.parentId === "" && !this.deps.config.createRootFolder) {
        return {
          kind: "folderAdopted",
          message: this.say("merged into", "would merge into") + " the destination",
          destId: parent.id,
          preExisting: true
        };
      }
      if (parent.preExisting || recovering) {
        const folders = this.childrenOf(parent.id).filter(
          (child) => child.mimeType === FOLDER_MIME
        );
        const existing = folders.find((child) => sourceIdOf(child) === item.id) ?? folders.find(
          (child) => child.name === item.name && sourceIdOf(child) === ""
        );
        if (existing !== void 0) {
          return {
            kind: "folderAdopted",
            message: this.say("merged into", "would merge into") + " an existing folder",
            destId: existing.id,
            preExisting: true
          };
        }
      }
      if (this.dry) {
        return {
          kind: "folderCreated",
          message: "would create folder",
          destId: DRY_ID_PREFIX + item.id
        };
      }
      const created = this.deps.drive.createFolder(item.name, parent.id, item.id);
      this.remember(parent.id, created);
      return {
        kind: "folderCreated",
        message: "folder created",
        destId: created.id
      };
    }
    move(item, parent) {
      if (this.dry) {
        return {
          kind: "moved",
          message: item.ownedByMe ? "would move (keeps ID, history and comments)" : `would try to move; if refused: ${fallbackForOthersFile(item, this.deps.config.othersFiles).action}`,
          destId: item.id
        };
      }
      const current = this.deps.drive.getFile(item.id);
      const parents = current.parents ?? [];
      if (parents.includes(parent.id)) {
        return {
          kind: "moved",
          message: "already in the destination",
          destId: item.id
        };
      }
      if (current.trashed === true) {
        return { kind: "skipped", message: "in the trash since the scan" };
      }
      if (!parents.includes(item.parentId)) {
        return {
          kind: "failed",
          message: 'no longer in the folder it was scanned in; run "Scan and plan" again'
        };
      }
      try {
        this.deps.drive.moveFile(item.id, parent.id, parents);
      } catch (error) {
        const refused = error instanceof DriveError && error.status === HTTP_FORBIDDEN && !NOT_A_REFUSAL.has(error.reason);
        if (!refused) {
          throw error;
        }
        return this.moveRefused(item, parent, error);
      }
      return { kind: "moved", message: "moved", destId: item.id };
    }
    /** Drive said no to a move. Fall back as configured, unless overridden. */
    moveRefused(item, parent, error) {
      const refusal = `move refused (${error.reason === "" ? error.message : error.reason})`;
      let fallback = null;
      if (item.override === "" && !item.ownedByMe) {
        const decision = fallbackForOthersFile(item, this.deps.config.othersFiles);
        if (decision.action === "SKIP") {
          return { kind: "skipped", message: `${refusal}; ${decision.reason}` };
        }
        fallback = decision.action;
      } else if (item.override === "" && this.deps.config.moveRefused === "COPY" && copyBlocker(item) === "") {
        fallback = "COPY";
      }
      if (fallback === null) {
        return { kind: "failed", message: refusal };
      }
      const outcome = fallback === "COPY" ? this.copy(item, parent) : this.shortcut(item, parent);
      return { ...outcome, message: `${refusal}; ${outcome.message}` };
    }
    copy(item, parent) {
      if (this.dry) {
        return {
          kind: "copied",
          message: "would copy (revision history is not carried over)",
          destId: DRY_ID_PREFIX + item.id
        };
      }
      const copied = this.deps.drive.copyFile(item.id, {
        name: item.name,
        parentId: parent.id,
        description: provenance(item, this.deps.timestamp()),
        properties: { [SOURCE_ID_PROPERTY]: item.id },
        copyComments: this.deps.config.copyComments
      });
      this.remember(parent.id, copied);
      return this.finishCopy(item, copied.id);
    }
    /** Carries comments onto an existing copy; safe to call again after a cut-off. */
    finishCopy(item, copyId) {
      if (!this.deps.config.copyComments) {
        return { kind: "copied", message: "copied", destId: copyId };
      }
      let note;
      try {
        const comments = carryComments(
          this.deps.drive,
          item.id,
          copyId,
          NATIVE_COMMENT_MIMES.has(item.mimeType),
          () => this.deps.budget.expired()
        );
        if (!comments.complete) {
          return {
            kind: "partial",
            message: "copied; comments are still being carried over",
            destId: copyId
          };
        }
        note = describeComments(comments);
      } catch (error) {
        if (!(error instanceof DriveError)) {
          throw error;
        }
        note = `comments not carried over: ${errorMessage(error)}`;
      }
      return { kind: "copied", message: `copied; ${note}`, destId: copyId };
    }
    shortcut(item, parent) {
      const targetId = this.shortcutTarget(item);
      if (targetId === "") {
        return { kind: "skipped", message: "the shortcut has no known target" };
      }
      if (this.dry) {
        return {
          kind: "shortcut",
          message: isShortcut(item) ? "would recreate shortcut" : "would create a shortcut to the original",
          destId: DRY_ID_PREFIX + item.id
        };
      }
      const created = this.deps.drive.createShortcut(
        item.name,
        parent.id,
        targetId,
        item.id
      );
      this.remember(parent.id, created);
      return {
        kind: "shortcut",
        message: isShortcut(item) ? "shortcut recreated" : "shortcut to the original created",
        destId: created.id
      };
    }
    /**
     * What a shortcut should point at. A shortcut to something this migration
     * copied or recreated (a copied file, a folder) is pointed at the new item,
     * not at the original left behind in the source.
     */
    shortcutTarget(item) {
      if (!isShortcut(item)) {
        return item.id;
      }
      const target = this.byId.get(item.shortcutTargetId);
      if (this.dry || target?.status !== "DONE" || target.destId === "" || target.destId === target.id) {
        return item.shortcutTargetId;
      }
      const replacement = this.deps.drive.getFile(target.destId);
      return replacement.mimeType === SHORTCUT_MIME ? item.shortcutTargetId : target.destId;
    }
    say(done, would) {
      return this.dry ? would : done;
    }
  };
  function apply(deps, mode, items) {
    return new Applier(deps, mode, items).run();
  }

  // src/core/budget.ts
  var MS_PER_MINUTE = 6e4;
  var STOP_POLL_MS = 5e3;
  var Budget = class {
    constructor(clock, minutes2, stopRequested = () => false) {
      this.clock = clock;
      this.stopRequested = stopRequested;
      this.lastStopPoll = Number.NEGATIVE_INFINITY;
      this.stopped = false;
      this.deadline = clock.now() + minutes2 * MS_PER_MINUTE;
    }
    /** True once the time is used up or someone chose Stop from the menu. */
    expired() {
      const now = this.clock.now();
      if (now >= this.deadline) {
        return true;
      }
      if (!this.stopped && now - this.lastStopPoll >= STOP_POLL_MS) {
        this.lastStopPoll = now;
        this.stopped = this.stopRequested();
      }
      return this.stopped;
    }
    /** True when the run ended because of the Stop menu item, not the clock. */
    wasStopped() {
      return this.stopped;
    }
  };

  // src/core/preflight.ts
  var HTTP_NOT_FOUND2 = 404;
  function fetchFile(drive, id, what, user) {
    try {
      return drive.getFile(id);
    } catch (error) {
      if (error instanceof DriveError && error.status === HTTP_NOT_FOUND2) {
        throw new ConfigError(
          `${what} not found. Check the link, and that ${user} has access to it.`
        );
      }
      throw error;
    }
  }
  function resolveDestination(drive, id, user) {
    const sharedDrive = drive.getSharedDrive(id);
    if (sharedDrive !== null) {
      return {
        rootId: sharedDrive.id,
        driveId: sharedDrive.id,
        name: sharedDrive.name ?? sharedDrive.id,
        canAdd: sharedDrive.capabilities?.canAddChildren ?? true
      };
    }
    const folder = fetchFile(drive, id, "Destination", user);
    if (folder.mimeType !== FOLDER_MIME || folder.driveId === void 0 || folder.driveId === "") {
      throw new ConfigError(
        "The destination must be a shared drive, or a folder inside a shared drive."
      );
    }
    return {
      rootId: folder.id,
      driveId: folder.driveId,
      name: folder.name ?? folder.id,
      canAdd: folder.capabilities?.canAddChildren ?? true
    };
  }
  function preflight(drive, config) {
    const userEmail = drive.about().emailAddress ?? "your account";
    const source = fetchFile(drive, config.sourceId, "Source folder", userEmail);
    if (source.mimeType !== FOLDER_MIME) {
      throw new ConfigError("The source must be a folder.");
    }
    if (source.driveId !== void 0 && source.driveId !== "") {
      throw new ConfigError(
        "The source folder is already in a shared drive. This tool migrates folders from My Drive."
      );
    }
    const destination = resolveDestination(drive, config.destinationId, userEmail);
    if (!destination.canAdd) {
      throw new ConfigError(
        `${userEmail} cannot add files to "${destination.name}". Ask a manager of the shared drive for Content manager (or Manager) access.`
      );
    }
    return {
      userEmail,
      source,
      sourceName: source.name ?? source.id,
      destRootId: destination.rootId,
      destDriveId: destination.driveId,
      destName: destination.name
    };
  }

  // src/core/scan.ts
  var FLUSH_EVERY_FOLDERS = 10;
  function sizeOf(file) {
    const size = file.size === void 0 ? Number.NaN : Number(file.size);
    return Number.isFinite(size) ? size : null;
  }
  function untouched() {
    return {
      action: "",
      reason: "",
      override: "",
      status: "",
      destId: "",
      destPreExisting: false,
      result: "",
      dryRun: "",
      dryDestId: "",
      dryPreExisting: false,
      updatedAt: ""
    };
  }
  function ownership(file) {
    const owner = file.owners?.[0];
    return {
      ownerEmail: owner?.emailAddress ?? "",
      ownerName: owner?.displayName ?? "",
      ownedByMe: file.ownedByMe ?? false
    };
  }
  function facts(file) {
    return {
      createdTime: file.createdTime ?? "",
      modifiedTime: file.modifiedTime ?? "",
      canCopy: file.capabilities?.canCopy ?? true,
      // If Drive does not say, assume an owner may move their own file; the
      // executor copes with being refused.
      canMoveOut: file.capabilities?.canMoveItemOutOfDrive ?? file.ownedByMe ?? false,
      webViewLink: file.webViewLink ?? ""
    };
  }
  function toNewItem(file, parent) {
    const name = file.name ?? "(unnamed)";
    const mimeType = file.mimeType ?? "";
    const isShortcutFile = mimeType === SHORTCUT_MIME;
    return {
      id: file.id,
      path: parent === null ? name : `${parent.path}/${name}`,
      name,
      mimeType,
      parentId: parent === null ? "" : parent.id,
      depth: parent === null ? 0 : parent.depth + 1,
      ...ownership(file),
      size: sizeOf(file),
      ...facts(file),
      shortcutTargetId: isShortcutFile ? file.shortcutDetails?.targetId ?? "" : "",
      scanState: mimeType === FOLDER_MIME ? "PENDING" : "",
      ...untouched()
    };
  }
  function byKindThenName(a, b) {
    const aFolder = a.mimeType === FOLDER_MIME ? 0 : 1;
    const bFolder = b.mimeType === FOLDER_MIME ? 0 : 1;
    if (aFolder !== bFolder) {
      return aFolder - bFolder;
    }
    return (a.name ?? "").localeCompare(b.name ?? "");
  }
  function startScan(store2, sourceFolder) {
    store2.clearItems();
    store2.appendItems([toNewItem(sourceFolder, null)]);
    store2.setMeta("scan", "RUNNING");
    store2.flush();
  }
  function continueScan(drive, store2, budget) {
    const items = store2.readItems();
    const seen = new Set(items.map((item) => item.id));
    const queue = items.filter(
      (item) => isFolder(item) && item.scanState === "PENDING"
    );
    const result = {
      complete: false,
      total: items.length,
      added: 0,
      errors: 0
    };
    let sinceFlush = 0;
    for (let folder = queue.shift(); folder !== void 0; folder = queue.shift()) {
      if (budget.expired()) {
        queue.unshift(folder);
        break;
      }
      const children = listOrNote(drive, store2, folder, result);
      const fresh = [];
      for (const child of children.sort(byKindThenName)) {
        if (seen.has(child.id)) {
          store2.log(
            "WARN",
            `"${child.name ?? child.id}" appears in more than one place; kept only its first location.`
          );
        } else {
          seen.add(child.id);
          fresh.push(toNewItem(child, folder));
        }
      }
      const appended = store2.appendItems(fresh);
      queue.push(...appended.filter((item) => isFolder(item)));
      if (folder.scanState !== "ERROR") {
        folder.scanState = "DONE";
      }
      store2.writeItems([folder]);
      result.added += appended.length;
      result.total += appended.length;
      sinceFlush += 1;
      if (sinceFlush >= FLUSH_EVERY_FOLDERS) {
        store2.flush();
        sinceFlush = 0;
      }
    }
    result.complete = queue.length === 0;
    if (result.complete) {
      store2.setMeta("scan", "DONE");
    }
    store2.flush();
    return result;
  }
  function listOrNote(drive, store2, folder, result) {
    try {
      return drive.listChildren(folder.id);
    } catch (error) {
      if (!(error instanceof DriveError)) {
        throw error;
      }
      result.errors += 1;
      folder.scanState = "ERROR";
      folder.result = `could not list this folder: ${error.message}`;
      store2.log("ERROR", `${folder.path}: ${folder.result}`);
      return [];
    }
  }

  // src/core/summary.ts
  var BYTES_PER_UNIT = 1024;
  var UNITS = ["B", "KB", "MB", "GB", "TB"];
  function formatBytes(bytes) {
    let value = bytes;
    let unit = 0;
    while (value >= BYTES_PER_UNIT && unit < UNITS.length - 1) {
      value /= BYTES_PER_UNIT;
      unit += 1;
    }
    const text = unit === 0 ? String(value) : value.toFixed(1);
    return `${text} ${UNITS[unit] ?? ""}`;
  }
  function ownerTotals(items) {
    const totals = /* @__PURE__ */ new Map();
    for (const item of items) {
      if (isFolder(item)) {
        continue;
      }
      const owner = item.ownerEmail === "" ? "(unknown)" : item.ownerEmail;
      const entry = totals.get(owner) ?? {
        files: 0,
        bytes: 0,
        moved: 0,
        copied: 0
      };
      const action = effectiveAction(item);
      entry.files += 1;
      entry.bytes += item.size ?? 0;
      entry.moved += action === "MOVE" ? 1 : 0;
      entry.copied += action === "COPY" ? 1 : 0;
      totals.set(owner, entry);
    }
    return totals;
  }
  function countBy(keys, values) {
    return keys.map((key) => [
      key,
      values.filter((value) => value === key).length
    ]);
  }
  function buildSummary(items, headline, generatedAt) {
    const rows = [
      ["Drive migration summary", generatedAt],
      [headline, ""],
      ["", ""],
      ["Planned action", "Items"]
    ];
    const actions = countBy(ACTIONS, items.map(effectiveAction));
    for (const [action, count] of actions) {
      rows.push([action, String(count)]);
    }
    rows.push(["", ""], ["Status", "Items"]);
    const statuses = countBy(
      STATUSES,
      items.map((item) => item.status)
    );
    for (const [status, count] of statuses) {
      rows.push([status, String(count)]);
    }
    rows.push(
      ["", ""],
      ["Owner", "Files", "Size", "Moved (history kept)", "Copied (history lost)"]
    );
    const owners = [...ownerTotals(items).entries()].sort(
      (a, b) => b[1].files - a[1].files
    );
    for (const [owner, total] of owners) {
      rows.push([
        owner,
        String(total.files),
        formatBytes(total.bytes),
        String(total.moved),
        String(total.copied)
      ]);
    }
    return rows;
  }

  // src/core/jobs.ts
  var JOB_KINDS = ["SCAN", "DRY_RUN", "EXECUTE"];
  function isoTime(clock) {
    return new Date(clock.now()).toISOString();
  }
  function describePlan(counts) {
    const by = counts.byAction;
    return `${String(by.MOVE)} to move, ${String(by.COPY)} to copy, ${String(by.SHORTCUT)} shortcut(s), ${String(by.SKIP)} to skip, ${String(by.CREATE_FOLDER)} folder(s)`;
  }
  function describeCounts(counts) {
    const folders = counts.folderCreated + counts.folderAdopted;
    return [
      `${String(counts.moved)} moved`,
      `${String(counts.copied)} copied`,
      `${String(counts.shortcut)} shortcut(s)`,
      `${String(folders)} folder(s)`,
      `${String(counts.skipped)} skipped`,
      `${String(counts.failed)} failed`,
      `${String(counts.blocked)} blocked`
    ].join(", ");
  }
  function prepareScan(context) {
    const { deps, config } = context;
    const { store: store2 } = deps;
    const resolved = preflight(deps.makeDrive(true), config);
    store2.setMeta("user", resolved.userEmail);
    store2.setMeta("sourceName", resolved.sourceName);
    store2.setMeta("destRootId", resolved.destRootId);
    store2.setMeta("destDriveId", resolved.destDriveId);
    store2.log(
      "INFO",
      `Scanning "${resolved.sourceName}" as ${resolved.userEmail}; destination "${resolved.destName}".`
    );
    startScan(store2, resolved.source);
  }
  function scanJob(context) {
    const { deps, config, budget } = context;
    const { store: store2 } = deps;
    const result = continueScan(deps.makeDrive(true), store2, budget);
    if (!result.complete) {
      return {
        complete: false,
        text: `Scan paused after ${String(result.total)} item(s)`
      };
    }
    const items = store2.readItems();
    const plan = planItems(items, config);
    store2.writeItems(plan.changed);
    const unlisted = items.filter((item) => item.scanState === "ERROR").length;
    const problems = unlisted === 0 ? "" : ` WARNING: ${String(unlisted)} folder(s) could not be listed, so their contents are missing from the plan; see the Log sheet, then scan again.`;
    return {
      complete: true,
      text: `Scan complete: ${String(items.length)} item(s). Plan: ${describePlan(plan.counts)}.${problems}`
    };
  }
  function assertSameUser(context) {
    const { deps } = context;
    const scannedBy = deps.store.getMeta("user");
    const current = deps.makeDrive(true).about().emailAddress ?? "";
    if (scannedBy !== "" && current !== scannedBy) {
      throw new ConfigError(
        `This sheet was scanned by ${scannedBy}, but you are ${current === "" ? "someone else" : current}. Ownership decides what can be moved, so either ${scannedBy} runs it or you run "Scan and plan" yourself.`
      );
    }
  }
  function assertScanned(store2) {
    if (store2.getMeta("scan") !== "DONE") {
      throw new ConfigError('Run "Scan and plan" first, and let it finish.');
    }
  }
  function prepareApply(context, mode) {
    const { deps, config } = context;
    const { store: store2 } = deps;
    assertScanned(store2);
    const items = store2.readItems();
    const resolved = preflight(deps.makeDrive(true), config);
    const root = items.find((item) => item.parentId === "");
    if (root?.id !== resolved.source.id) {
      throw new ConfigError(
        'The Source folder has changed since the last scan. Run "Scan and plan" again.'
      );
    }
    const started = items.some(
      (item) => item.destId !== "" && item.status !== "SKIPPED"
    );
    if (started && resolved.destRootId !== store2.getMeta("destRootId")) {
      throw new ConfigError(
        'The Destination has changed since this migration began, and part of it has already gone to the old one. Put the old Destination back to finish it, or run "Scan and plan" again to start over with what is left.'
      );
    }
    store2.setMeta("destRootId", resolved.destRootId);
    store2.setMeta("destDriveId", resolved.destDriveId);
    const dry = mode === "DRY_RUN";
    const changed = new Set(planItems(items, config, dry).changed);
    if (dry) {
      for (const item of clearDryRun(items)) {
        changed.add(item);
      }
    }
    store2.writeItems([...changed].sort((a, b) => a.row - b.row));
    store2.flush();
  }
  function applyJob(context, mode) {
    const { deps, config, budget } = context;
    const { store: store2 } = deps;
    assertScanned(store2);
    const dry = mode === "DRY_RUN";
    const result = apply(
      {
        drive: deps.makeDrive(dry),
        store: store2,
        config,
        budget,
        destRootId: store2.getMeta("destRootId"),
        destDriveId: store2.getMeta("destDriveId"),
        timestamp: () => isoTime(deps.clock)
      },
      mode,
      store2.readItems()
    );
    const label = dry ? "Dry run" : "Migration";
    const counts = describeCounts(result.counts);
    const wording = dry ? `would be: ${counts}` : counts;
    return {
      complete: result.complete,
      text: result.complete ? `${label} complete. This run: ${wording}.` : `${label} paused with ${String(result.remaining)} item(s) to go. This run: ${wording}`
    };
  }
  function pausedSuffix(report) {
    if (report.complete) {
      return "";
    }
    if (report.stopped) {
      return ' Stopped on request; choose "Continue a paused job" to carry on.';
    }
    return report.continueAutomatically ? " It will continue by itself in about a minute." : ' Choose "Continue a paused job" to carry on.';
  }
  function runJob(kind, start, deps) {
    const { store: store2, clock } = deps;
    const config = parseConfig(store2.readConfigValues());
    const stopRequested = () => store2.getMeta("stop") !== "";
    if (start !== "TRIGGER") {
      store2.setMeta("stop", "");
    }
    const budget = new Budget(clock, config.minutesPerRun, stopRequested);
    const fresh = start === "FRESH";
    const context = { deps, config, budget, fresh };
    const mode = kind === "DRY_RUN" ? "DRY_RUN" : "EXECUTE";
    let outcome;
    if (start === "TRIGGER" && stopRequested()) {
      outcome = { complete: false, text: `${kind} is stopped.` };
    } else {
      if (fresh && kind === "SCAN") {
        prepareScan(context);
      } else {
        assertSameUser(context);
        if (fresh) {
          prepareApply(context, mode);
        }
      }
      store2.setMeta("job", kind);
      outcome = kind === "SCAN" ? scanJob(context) : applyJob(context, mode);
    }
    const stopped = !outcome.complete && stopRequested();
    const report = {
      kind,
      complete: outcome.complete,
      stopped,
      continueAutomatically: !outcome.complete && !stopped && config.autoContinue,
      headline: outcome.text
    };
    report.headline += pausedSuffix(report);
    store2.setMeta("job", report.complete ? "" : kind);
    store2.writeSummary(
      buildSummary(store2.readItems(), report.headline, isoTime(clock))
    );
    store2.log("INFO", report.headline);
    store2.flush();
    return report;
  }

  // src/drive/client.ts
  var DRIVE_BASE_URL = "https://www.googleapis.com/drive/v3";
  var FILE_FIELDS = "id,name,mimeType,parents,driveId,ownedByMe,owners(emailAddress,displayName),size,createdTime,modifiedTime,trashed,webViewLink,properties,shortcutDetails(targetId,targetMimeType),capabilities(canCopy,canMoveItemOutOfDrive,canAddChildren)";
  var COMMENT_FIELDS = "nextPageToken,comments(id,content,author(displayName,emailAddress),createdTime,resolved,deleted,quotedFileContent(value),replies(id,content,author(displayName,emailAddress),createdTime,action,deleted))";
  var PAGE_SIZE = 200;
  var COMMENT_PAGE_SIZE = 100;
  var MAX_ATTEMPTS = 6;
  var BASE_DELAY_MS = 1e3;
  var HTTP_OK_MIN = 200;
  var HTTP_OK_MAX = 299;
  var HTTP_FORBIDDEN2 = 403;
  var HTTP_NOT_FOUND3 = 404;
  var HTTP_TOO_MANY_REQUESTS = 429;
  var HTTP_SERVER_ERROR = 500;
  var NO_RESPONSE = 0;
  var RETRYABLE_403_REASONS = /* @__PURE__ */ new Set([
    "rateLimitExceeded",
    "userRateLimitExceeded",
    "sharingRateLimitExceeded"
  ]);
  var ID = "[A-Za-z0-9_-]+";
  var ALLOWED_REQUESTS = [
    { method: "GET", path: /^\/about$/, write: false },
    { method: "GET", path: /^\/files$/, write: false },
    { method: "GET", path: new RegExp(`^/files/${ID}$`), write: false },
    { method: "GET", path: new RegExp(`^/drives/${ID}$`), write: false },
    { method: "GET", path: new RegExp(`^/files/${ID}/comments$`), write: false },
    { method: "POST", path: /^\/files$/, write: true },
    { method: "POST", path: new RegExp(`^/files/${ID}/copy$`), write: true },
    { method: "PATCH", path: new RegExp(`^/files/${ID}$`), write: true },
    { method: "POST", path: new RegExp(`^/files/${ID}/comments$`), write: true },
    {
      method: "POST",
      path: new RegExp(`^/files/${ID}/comments/${ID}/replies$`),
      write: true
    }
  ];
  var FORBIDDEN_BODY_FIELDS = ["trashed", "permissions", "permissionIds"];
  function buildUrl(path, query) {
    const pairs = Object.keys(query).map(
      (key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(query[key]))}`
    );
    return `${DRIVE_BASE_URL}${path}${pairs.length === 0 ? "" : `?${pairs.join("&")}`}`;
  }
  function pathOf(url) {
    if (!url.startsWith(DRIVE_BASE_URL)) {
      return "";
    }
    const rest = url.slice(DRIVE_BASE_URL.length);
    const queryStart = rest.indexOf("?");
    return queryStart === -1 ? rest : rest.slice(0, queryStart);
  }
  function assertAllowed(request, readOnly) {
    const path = pathOf(request.url);
    const rule = ALLOWED_REQUESTS.find(
      (candidate) => candidate.method === request.method && candidate.path.test(path)
    );
    if (rule === void 0) {
      throw new DisallowedOperationError(
        `Blocked: ${request.method} ${request.url} is not an operation this tool performs.`
      );
    }
    if (rule.write && readOnly) {
      throw new DisallowedOperationError(
        `Blocked: ${request.method} ${path} would change Drive, but this is a read-only run.`
      );
    }
    if (request.body !== void 0) {
      const body = JSON.parse(request.body);
      const forbidden = FORBIDDEN_BODY_FIELDS.find((field) => field in body);
      if (forbidden !== void 0) {
        throw new DisallowedOperationError(
          `Blocked: a request tried to set "${forbidden}".`
        );
      }
    }
  }
  function parseError(response) {
    let message = `HTTP ${String(response.status)}`;
    let reason = "";
    try {
      const parsed = JSON.parse(response.body);
      message = parsed.error?.message ?? message;
      reason = parsed.error?.errors?.[0]?.reason ?? "";
    } catch {
    }
    return new DriveError(
      reason === "" ? message : `${message} [${reason}]`,
      response.status,
      reason
    );
  }
  function isRetryable(method, status, reason) {
    if (status === HTTP_TOO_MANY_REQUESTS) {
      return true;
    }
    if (status === HTTP_FORBIDDEN2) {
      return RETRYABLE_403_REASONS.has(reason);
    }
    return method === "GET" && (status === NO_RESPONSE || status >= HTTP_SERVER_ERROR);
  }
  function escapeQueryValue(value) {
    return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  }
  var DriveClient = class {
    constructor(options) {
      this.options = options;
      this.random = options.random ?? Math.random;
    }
    about() {
      const result = this.call("GET", "/about", {
        fields: "user(displayName,emailAddress)"
      });
      return result.user ?? {};
    }
    getFile(fileId) {
      return this.call("GET", `/files/${fileId}`, {
        fields: FILE_FIELDS,
        supportsAllDrives: true
      });
    }
    getSharedDrive(driveId2) {
      try {
        return this.call("GET", `/drives/${driveId2}`, {
          fields: "id,name,capabilities(canAddChildren)"
        });
      } catch (error) {
        if (error instanceof DriveError && (error.status === HTTP_NOT_FOUND3 || error.status === HTTP_FORBIDDEN2)) {
          return null;
        }
        throw error;
      }
    }
    listChildren(folderId, driveId2) {
      const query = {
        q: `'${escapeQueryValue(folderId)}' in parents and trashed = false`,
        fields: `nextPageToken,files(${FILE_FIELDS})`,
        pageSize: PAGE_SIZE,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      };
      if (driveId2 !== void 0 && driveId2 !== "") {
        query.corpora = "drive";
        query.driveId = driveId2;
      }
      const files = [];
      let pageToken;
      do {
        const page = this.call(
          "GET",
          "/files",
          pageToken === void 0 ? query : { ...query, pageToken }
        );
        files.push(...page.files ?? []);
        pageToken = page.nextPageToken;
      } while (pageToken !== void 0 && pageToken !== "");
      return files;
    }
    createFolder(name, parentId, sourceId) {
      return this.call(
        "POST",
        "/files",
        { fields: FILE_FIELDS, supportsAllDrives: true },
        {
          name,
          mimeType: FOLDER_MIME,
          parents: [parentId],
          properties: { [SOURCE_ID_PROPERTY]: sourceId }
        }
      );
    }
    createShortcut(name, parentId, targetId, sourceId) {
      return this.call(
        "POST",
        "/files",
        { fields: FILE_FIELDS, supportsAllDrives: true },
        {
          name,
          mimeType: SHORTCUT_MIME,
          parents: [parentId],
          shortcutDetails: { targetId },
          properties: { [SOURCE_ID_PROPERTY]: sourceId }
        }
      );
    }
    moveFile(fileId, addParent, removeParents) {
      return this.call(
        "PATCH",
        `/files/${fileId}`,
        {
          addParents: addParent,
          removeParents: removeParents.join(","),
          fields: FILE_FIELDS,
          supportsAllDrives: true
        },
        {}
      );
    }
    copyFile(fileId, request) {
      return this.call(
        "POST",
        `/files/${fileId}/copy`,
        {
          fields: FILE_FIELDS,
          supportsAllDrives: true,
          copyComments: request.copyComments
        },
        {
          name: request.name,
          parents: [request.parentId],
          description: request.description,
          properties: request.properties
        }
      );
    }
    listComments(fileId) {
      const query = {
        fields: COMMENT_FIELDS,
        pageSize: COMMENT_PAGE_SIZE,
        includeDeleted: false
      };
      const comments = [];
      let pageToken;
      do {
        const page = this.call(
          "GET",
          `/files/${fileId}/comments`,
          pageToken === void 0 ? query : { ...query, pageToken }
        );
        comments.push(...page.comments ?? []);
        pageToken = page.nextPageToken;
      } while (pageToken !== void 0 && pageToken !== "");
      return comments;
    }
    createComment(fileId, content) {
      return this.call(
        "POST",
        `/files/${fileId}/comments`,
        { fields: "id" },
        { content }
      );
    }
    createReply(fileId, commentId, content, resolve) {
      return this.call(
        "POST",
        `/files/${fileId}/comments/${commentId}/replies`,
        { fields: "id" },
        resolve ? { content, action: "resolve" } : { content }
      );
    }
    // The type parameter names the response shape each endpoint is documented to
    // return; JSON from the network cannot be checked any more strictly than that.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
    call(method, path, query, body) {
      const request = { method, url: buildUrl(path, query) };
      if (body !== void 0) {
        request.body = JSON.stringify(body);
      }
      assertAllowed(request, this.options.readOnly);
      for (let attempt = 1; ; attempt += 1) {
        const response = this.options.transport(request);
        if (response.status >= HTTP_OK_MIN && response.status <= HTTP_OK_MAX) {
          return response.body === "" ? {} : JSON.parse(response.body);
        }
        const error = parseError(response);
        if (!isRetryable(method, response.status, error.reason) || attempt >= MAX_ATTEMPTS) {
          throw error;
        }
        const backoff = BASE_DELAY_MS * 2 ** (attempt - 1);
        this.options.sleep(backoff + Math.floor(this.random() * BASE_DELAY_MS));
      }
    }
  };

  // src/gas/sheetStore.ts
  var SHEET_NAMES = {
    config: "Config",
    items: "Items",
    summary: "Summary",
    log: "Log",
    /** Override values set aside while a new scan rebuilds the Items sheet. */
    overrides: "Overrides (kept)"
  };
  var PLAIN_TEXT = "@";
  var YES = "Yes";
  var MAX_CELL_TEXT = 2e3;
  var META_PREFIX = "driveMigrate.";
  var DRIVE_OPEN_URL = "https://drive.google.com/open?id=";
  var HEADER_ROW = 1;
  var FIRST_DATA_ROW = 2;
  var CONFIG_COLUMNS = 3;
  var TYPE_NAMES = {
    [FOLDER_MIME]: "Folder",
    [SHORTCUT_MIME]: "Shortcut",
    "application/vnd.google-apps.document": "Google Doc",
    "application/vnd.google-apps.spreadsheet": "Google Sheet",
    "application/vnd.google-apps.presentation": "Google Slides",
    "application/vnd.google-apps.form": "Google Form",
    "application/vnd.google-apps.drawing": "Google Drawing",
    "application/pdf": "PDF"
  };
  function typeName(mimeType) {
    return TYPE_NAMES[mimeType] ?? mimeType;
  }
  function yes(value) {
    return value ? YES : "";
  }
  function isYes(text) {
    return text === YES;
  }
  function oneOf2(text, allowed) {
    const upper = text.trim().toUpperCase();
    return allowed.find((candidate) => candidate === upper) ?? "";
  }
  function destinationLink(item) {
    return item.destId === "" || item.destId.startsWith(DRY_ID_PREFIX) ? "" : DRIVE_OPEN_URL + item.destId;
  }
  var FIXED_COLUMNS = [
    {
      header: "Path",
      read: (i) => i.path,
      write: (i, t) => i.path = t,
      width: 360
    },
    { header: "Type", read: (i) => typeName(i.mimeType), width: 110 },
    {
      header: "Owner",
      read: (i) => i.ownerEmail,
      write: (i, t) => i.ownerEmail = t,
      width: 200
    },
    {
      header: "Mine",
      read: (i) => yes(i.ownedByMe),
      write: (i, t) => i.ownedByMe = isYes(t),
      width: 50
    },
    {
      header: "Size (bytes)",
      read: (i) => i.size === null ? "" : String(i.size),
      write: (i, t) => i.size = t === "" ? null : Number(t),
      width: 90
    },
    {
      header: "Override",
      read: (i) => i.override,
      write: (i, t) => i.override = oneOf2(t, ACTIONS),
      width: 110
    }
  ];
  var PROGRESS_COLUMNS = [
    {
      header: "Action",
      read: (i) => i.action,
      write: (i, t) => i.action = oneOf2(t, ACTIONS),
      width: 120
    },
    {
      header: "Reason",
      read: (i) => i.reason,
      write: (i, t) => i.reason = t,
      width: 320
    },
    {
      header: "Status",
      read: (i) => i.status,
      write: (i, t) => i.status = oneOf2(t, STATUSES),
      width: 100
    },
    {
      header: "Result",
      read: (i) => i.result,
      write: (i, t) => i.result = t,
      width: 320
    },
    {
      header: "Dry run",
      read: (i) => i.dryRun,
      write: (i, t) => i.dryRun = t,
      width: 320
    },
    { header: "Destination", read: destinationLink, width: 200 },
    {
      header: "Updated",
      read: (i) => i.updatedAt,
      write: (i, t) => i.updatedAt = t,
      width: 170
    },
    {
      header: "Scan state",
      read: (i) => i.scanState,
      write: (i, t) => i.scanState = oneOf2(t, [
        "PENDING",
        "DONE",
        "ERROR"
      ])
    },
    {
      header: "Destination ID",
      read: (i) => i.destId,
      write: (i, t) => i.destId = t
    },
    {
      header: "Destination existed",
      read: (i) => yes(i.destPreExisting),
      write: (i, t) => i.destPreExisting = isYes(t)
    },
    {
      header: "Dry-run destination ID",
      read: (i) => i.dryDestId,
      write: (i, t) => i.dryDestId = t
    },
    {
      header: "Dry-run destination existed",
      read: (i) => yes(i.dryPreExisting),
      write: (i, t) => i.dryPreExisting = isYes(t)
    }
  ];
  var TECHNICAL_COLUMNS = [
    { header: "ID", read: (i) => i.id, write: (i, t) => i.id = t },
    { header: "Name", read: (i) => i.name, write: (i, t) => i.name = t },
    {
      header: "MIME type",
      read: (i) => i.mimeType,
      write: (i, t) => i.mimeType = t
    },
    {
      header: "Parent ID",
      read: (i) => i.parentId,
      write: (i, t) => i.parentId = t
    },
    {
      header: "Depth",
      read: (i) => String(i.depth),
      write: (i, t) => i.depth = Number(t)
    },
    {
      header: "Owner name",
      read: (i) => i.ownerName,
      write: (i, t) => i.ownerName = t
    },
    {
      header: "Created",
      read: (i) => i.createdTime,
      write: (i, t) => i.createdTime = t
    },
    {
      header: "Modified",
      read: (i) => i.modifiedTime,
      write: (i, t) => i.modifiedTime = t
    },
    {
      header: "Can copy",
      read: (i) => yes(i.canCopy),
      write: (i, t) => i.canCopy = isYes(t)
    },
    {
      header: "Can move",
      read: (i) => yes(i.canMoveOut),
      write: (i, t) => i.canMoveOut = isYes(t)
    },
    {
      header: "Shortcut target",
      read: (i) => i.shortcutTargetId,
      write: (i, t) => i.shortcutTargetId = t
    },
    {
      header: "Link",
      read: (i) => i.webViewLink,
      write: (i, t) => i.webViewLink = t
    }
  ];
  var ITEM_COLUMNS = [
    ...FIXED_COLUMNS,
    ...PROGRESS_COLUMNS,
    ...TECHNICAL_COLUMNS
  ];
  var PROGRESS_START = FIXED_COLUMNS.length + 1;
  var OVERRIDE_COLUMN = FIXED_COLUMNS.length;
  var ID_COLUMN_INDEX = ITEM_COLUMNS.findIndex(
    (column) => column.header === "ID"
  );
  function toCell(text) {
    const clipped = text.length > MAX_CELL_TEXT ? `${text.slice(0, MAX_CELL_TEXT)}...` : text;
    return /^[=+\-@']/.test(clipped) ? `'${clipped}` : clipped;
  }
  function fromCell(value) {
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    return value instanceof Date ? value.toISOString() : "";
  }
  function blankItem(row) {
    return {
      row,
      id: "",
      path: "",
      name: "",
      mimeType: "",
      parentId: "",
      depth: 0,
      ownerEmail: "",
      ownerName: "",
      ownedByMe: false,
      size: null,
      createdTime: "",
      modifiedTime: "",
      canCopy: false,
      canMoveOut: false,
      shortcutTargetId: "",
      webViewLink: "",
      scanState: "",
      action: "",
      reason: "",
      override: "",
      status: "",
      destId: "",
      destPreExisting: false,
      result: "",
      dryRun: "",
      dryDestId: "",
      dryPreExisting: false,
      updatedAt: ""
    };
  }
  function rowValues(item, columns) {
    return columns.map((column) => toCell(column.read(item)));
  }
  function ensureSize(sheet, rows, columns) {
    const maxRows = sheet.getMaxRows();
    if (rows > maxRows) {
      sheet.insertRowsAfter(maxRows, rows - maxRows);
    }
    const maxColumns = sheet.getMaxColumns();
    if (columns > maxColumns) {
      sheet.insertColumnsAfter(maxColumns, columns - maxColumns);
    }
  }
  function writeBlock(sheet, row, column, values, fresh = true) {
    const width = values[0]?.length ?? 0;
    if (values.length === 0 || width === 0) {
      return;
    }
    if (fresh) {
      ensureSize(sheet, row + values.length - 1, column + width - 1);
    }
    const range = sheet.getRange(row, column, values.length, width);
    if (fresh) {
      range.setNumberFormat(PLAIN_TEXT);
    }
    range.setValues(values);
  }
  var SheetStore = class {
    constructor(spreadsheet, now = () => /* @__PURE__ */ new Date()) {
      this.spreadsheet = spreadsheet;
      this.now = now;
      this.pendingLogs = [];
      /** Overrides set aside by `clearItems`, by file ID; loaded on first use. */
      this.keptOverrides = null;
    }
    /** Creates any missing sheet and Config row. Existing values are kept. */
    setUp() {
      this.setUpConfig();
      this.setUpItems();
      this.sheet(SHEET_NAMES.summary);
      const log = this.sheet(SHEET_NAMES.log);
      if (log.getLastRow() === 0) {
        writeBlock(log, HEADER_ROW, 1, [["Time", "Level", "Message"]]);
        log.setFrozenRows(HEADER_ROW);
      }
    }
    /** Sets up only if something is missing; cheap enough to call on every run. */
    ensureReady() {
      const ready = [
        SHEET_NAMES.config,
        SHEET_NAMES.items,
        SHEET_NAMES.log
      ].every(
        (name) => (this.spreadsheet.getSheetByName(name)?.getLastRow() ?? 0) > 0
      );
      if (!ready) {
        this.setUp();
      }
    }
    readConfigValues() {
      const sheet = this.sheet(SHEET_NAMES.config);
      const values = {};
      for (const row of this.dataRows(sheet, 2)) {
        const label = fromCell(row[0]).trim();
        if (label !== "") {
          values[label] = fromCell(row[1]).trim();
        }
      }
      return values;
    }
    readItems() {
      const sheet = this.sheet(SHEET_NAMES.items);
      const items = [];
      this.dataRows(sheet, ITEM_COLUMNS.length).forEach((cells, index) => {
        if (fromCell(cells[ID_COLUMN_INDEX]) === "") {
          return;
        }
        const item = blankItem(FIRST_DATA_ROW + index);
        ITEM_COLUMNS.forEach((column, columnIndex) => {
          column.write?.(item, fromCell(cells[columnIndex]));
        });
        items.push(item);
      });
      return items;
    }
    appendItems(newItems) {
      if (newItems.length === 0) {
        return [];
      }
      const sheet = this.sheet(SHEET_NAMES.items);
      const kept = this.overridesKept();
      const firstRow = Math.max(sheet.getLastRow(), HEADER_ROW) + 1;
      const items = newItems.map((item, index) => ({
        ...item,
        override: oneOf2(kept.get(item.id) ?? item.override, ACTIONS),
        row: firstRow + index
      }));
      writeBlock(
        sheet,
        firstRow,
        1,
        items.map((item) => rowValues(item, ITEM_COLUMNS))
      );
      return items;
    }
    /**
     * Writes the progress columns only; the Override column is never touched.
     *
     * Row numbers were read at the start of the run, and a person may have
     * sorted, inserted or deleted rows since. So each row's ID is checked first,
     * and rows that have moved are found again by ID. Writing progress onto the
     * wrong file's row would be far worse than the extra read.
     */
    writeItems(items) {
      if (items.length === 0) {
        return;
      }
      const sheet = this.sheet(SHEET_NAMES.items);
      this.relocate(sheet, items);
      const sorted = [...items].sort((a, b) => a.row - b.row);
      let run2 = [];
      const writeRun = () => {
        const first = run2[0];
        if (first !== void 0) {
          writeBlock(
            sheet,
            first.row,
            PROGRESS_START,
            run2.map((item) => rowValues(item, PROGRESS_COLUMNS)),
            false
          );
        }
        run2 = [];
      };
      for (const item of sorted) {
        const previous = run2[run2.length - 1];
        if (previous !== void 0 && item.row !== previous.row + 1) {
          writeRun();
        }
        run2.push(item);
      }
      writeRun();
    }
    /**
     * Remembers Override values by file ID, then empties the inventory. A new
     * scan gives them back to the same files as it finds them (`appendItems`).
     */
    clearItems() {
      const kept = new Map(this.overridesKept());
      for (const item of this.readItems()) {
        if (item.override === "") {
          kept.delete(item.id);
        } else {
          kept.set(item.id, item.override);
        }
      }
      const stash = this.sheet(SHEET_NAMES.overrides);
      stash.clearContents();
      writeBlock(stash, HEADER_ROW, 1, [
        ["File ID", "Override"],
        ...[...kept.entries()].map(([id, override]) => [toCell(id), override])
      ]);
      this.keptOverrides = kept;
      const sheet = this.sheet(SHEET_NAMES.items);
      const lastRow = sheet.getLastRow();
      if (lastRow >= FIRST_DATA_ROW) {
        sheet.getRange(FIRST_DATA_ROW, 1, lastRow - HEADER_ROW, ITEM_COLUMNS.length).clearContent();
      }
    }
    getMeta(key) {
      return PropertiesService.getDocumentProperties().getProperty(
        META_PREFIX + key
      ) ?? "";
    }
    setMeta(key, value) {
      PropertiesService.getDocumentProperties().setProperty(
        META_PREFIX + key,
        value
      );
    }
    log(level, message) {
      this.pendingLogs.push([this.now().toISOString(), level, toCell(message)]);
    }
    writeSummary(rows) {
      const sheet = this.sheet(SHEET_NAMES.summary);
      sheet.clearContents();
      const width = Math.max(...rows.map((row) => row.length));
      writeBlock(
        sheet,
        HEADER_ROW,
        1,
        rows.map(
          (row) => Array.from({ length: width }, (_, index) => toCell(row[index] ?? ""))
        )
      );
    }
    flush() {
      if (this.pendingLogs.length > 0) {
        const sheet = this.sheet(SHEET_NAMES.log);
        writeBlock(
          sheet,
          Math.max(sheet.getLastRow(), HEADER_ROW) + 1,
          1,
          this.pendingLogs.splice(0)
        );
      }
      SpreadsheetApp.flush();
    }
    overridesKept() {
      if (this.keptOverrides === null) {
        const stash = this.spreadsheet.getSheetByName(SHEET_NAMES.overrides);
        this.keptOverrides = new Map(
          (stash === null ? [] : this.dataRows(stash, 2)).map((row) => [
            fromCell(row[0]),
            fromCell(row[1])
          ])
        );
      }
      return this.keptOverrides;
    }
    /** Makes every item's `row` point at the row that holds its ID right now. */
    relocate(sheet, items) {
      const rows = items.map((item) => item.row);
      const first = Math.min(...rows);
      const last = Math.max(...rows);
      const inPlace = first >= FIRST_DATA_ROW && last <= sheet.getMaxRows() && this.idsMatch(sheet, items, first, last);
      if (inPlace) {
        return;
      }
      const rowById = /* @__PURE__ */ new Map();
      this.readIds(sheet, FIRST_DATA_ROW, sheet.getLastRow()).forEach(
        (id, index) => {
          if (id !== "") {
            rowById.set(id, FIRST_DATA_ROW + index);
          }
        }
      );
      for (const item of items) {
        const row = rowById.get(item.id);
        if (row === void 0) {
          throw new Error(
            `The Items row for "${item.path}" has gone. Rows must not be deleted while a job is running; run "Scan and plan" again.`
          );
        }
        item.row = row;
      }
    }
    idsMatch(sheet, items, first, last) {
      const ids = this.readIds(sheet, first, last);
      return items.every((item) => ids[item.row - first] === item.id);
    }
    readIds(sheet, first, last) {
      if (last < first) {
        return [];
      }
      return sheet.getRange(first, ID_COLUMN_INDEX + 1, last - first + 1, 1).getValues().map((row) => fromCell(row[0]));
    }
    sheet(name) {
      return this.spreadsheet.getSheetByName(name) ?? this.spreadsheet.insertSheet(name);
    }
    /** Every row below the header, `columns` wide. */
    dataRows(sheet, columns) {
      const lastRow = sheet.getLastRow();
      if (lastRow < FIRST_DATA_ROW || sheet.getMaxColumns() < columns) {
        return [];
      }
      return sheet.getRange(FIRST_DATA_ROW, 1, lastRow - HEADER_ROW, columns).getValues();
    }
    setUpConfig() {
      const sheet = this.sheet(SHEET_NAMES.config);
      if (sheet.getLastRow() === 0) {
        writeBlock(sheet, HEADER_ROW, 1, [["Setting", "Value", "What it does"]]);
        sheet.setFrozenRows(HEADER_ROW);
        sheet.setColumnWidth(1, 240);
        sheet.setColumnWidth(2, 360);
        sheet.setColumnWidth(CONFIG_COLUMNS, 720);
      }
      const existing = this.readConfigValues();
      for (const field of CONFIG_FIELDS) {
        if (!(field.label in existing)) {
          const row = sheet.getLastRow() + 1;
          writeBlock(sheet, row, 1, [
            [field.label, field.defaultValue, field.help]
          ]);
          if (field.choices !== void 0) {
            sheet.getRange(row, 2).setDataValidation(
              SpreadsheetApp.newDataValidation().requireValueInList([...field.choices], true).setAllowInvalid(false).build()
            );
          }
        }
      }
    }
    setUpItems() {
      const sheet = this.sheet(SHEET_NAMES.items);
      writeBlock(sheet, HEADER_ROW, 1, [
        ITEM_COLUMNS.map((column) => column.header)
      ]);
      sheet.setFrozenRows(HEADER_ROW);
      ITEM_COLUMNS.forEach((column, index) => {
        if (column.width !== void 0) {
          sheet.setColumnWidth(index + 1, column.width);
        }
      });
      ensureSize(sheet, FIRST_DATA_ROW, ITEM_COLUMNS.length);
      sheet.getRange(
        FIRST_DATA_ROW,
        OVERRIDE_COLUMN,
        sheet.getMaxRows() - HEADER_ROW,
        1
      ).setDataValidation(
        SpreadsheetApp.newDataValidation().requireValueInList(["CREATE_FOLDER", ...FILE_OVERRIDES], true).setAllowInvalid(true).build()
      );
    }
  };

  // src/gas/transport.ts
  var METHODS = { GET: "get", POST: "post", PATCH: "patch" };
  var TIMEOUT_SECONDS = 120;
  var urlFetchTransport = (request) => {
    const params = {
      method: METHODS[request.method],
      headers: { Authorization: `Bearer ${ScriptApp.getOAuthToken()}` },
      muteHttpExceptions: true,
      timeoutSeconds: TIMEOUT_SECONDS
    };
    if (request.body !== void 0) {
      params.contentType = "application/json";
      params.payload = request.body;
    }
    try {
      const response = UrlFetchApp.fetch(request.url, params);
      return {
        status: response.getResponseCode(),
        body: response.getContentText()
      };
    } catch (error) {
      const message = errorMessage(error);
      return {
        status: NO_RESPONSE,
        body: JSON.stringify({ error: { message: `No response: ${message}` } })
      };
    }
  };

  // src/gas/main.ts
  var MENU_TITLE = "Drive migration";
  var TRIGGER_HANDLER = "continueFromTrigger";
  var CONTINUE_DELAY_MS = 6e4;
  var SAFETY_DELAY_MS = 7 * 6e4;
  var MAX_STRIKES = 3;
  var LOCK_WAIT_MS = 1e3;
  var TOAST_SECONDS = 15;
  var JOB_NAMES = {
    SCAN: "Scan",
    DRY_RUN: "Dry run",
    EXECUTE: "Migration"
  };
  var HELP_TEXT = [
    '1. "Set up sheets", then fill in Source folder and Destination on the Config sheet.',
    '2. "Scan and plan" lists every file on the Items sheet with the action planned for it. Nothing in Drive changes.',
    "3. Review the Items sheet. Type MOVE, COPY, SHORTCUT or SKIP in the Override column to change a row.",
    '4. "Dry run" fills the Dry run column with exactly what would happen. Nothing in Drive changes.',
    '5. "Migrate" does it. Long jobs pause and continue by themselves; "Stop" halts them and "Continue" picks up again.',
    "",
    "Do not sort, insert or delete rows on the Items sheet while a job is running.",
    "Nothing is ever deleted. Moved files keep their ID, revision history and comments. Copies cannot keep revision history."
  ].join("\n");
  function store() {
    return new SheetStore(SpreadsheetApp.getActiveSpreadsheet());
  }
  function tell(message, interactive) {
    if (interactive) {
      const ui = SpreadsheetApp.getUi();
      ui.alert(MENU_TITLE, message, ui.ButtonSet.OK);
    } else {
      SpreadsheetApp.getActiveSpreadsheet().toast(
        message,
        MENU_TITLE,
        TOAST_SECONDS
      );
    }
  }
  function confirm(message) {
    const ui = SpreadsheetApp.getUi();
    return ui.alert(MENU_TITLE, message, ui.ButtonSet.OK_CANCEL) === ui.Button.OK;
  }
  function deleteContinuations() {
    for (const trigger of ScriptApp.getProjectTriggers()) {
      if (trigger.getHandlerFunction() === TRIGGER_HANDLER) {
        ScriptApp.deleteTrigger(trigger);
      }
    }
  }
  function scheduleContinuation(delayMs) {
    ScriptApp.newTrigger(TRIGGER_HANDLER).timeBased().after(delayMs).create();
  }
  function configOrNull(sheets) {
    try {
      return parseConfig(sheets.readConfigValues());
    } catch (error) {
      if (error instanceof ConfigError) {
        return null;
      }
      throw error;
    }
  }
  function execute(kind, start, sheets) {
    return runJob(kind, start, {
      store: sheets,
      clock: { now: () => Date.now() },
      makeDrive: (readOnly) => new DriveClient({
        transport: urlFetchTransport,
        sleep: (milliseconds) => {
          Utilities.sleep(milliseconds);
        },
        readOnly
      })
    });
  }
  function run(kind, start) {
    const interactive = start !== "TRIGGER";
    const lock = LockService.getDocumentLock();
    if (!lock.tryLock(LOCK_WAIT_MS)) {
      tell(
        'A run is already in progress. Wait for it, or choose "Stop".',
        interactive
      );
      return;
    }
    const sheets = store();
    try {
      sheets.ensureReady();
      deleteContinuations();
      if (configOrNull(sheets)?.autoContinue === true) {
        scheduleContinuation(SAFETY_DELAY_MS);
      }
      const strikes = Number(sheets.getMeta("strikes") || "0");
      sheets.setMeta("strikes", String(strikes + 1));
      const report = execute(kind, start, sheets);
      deleteContinuations();
      if (report.continueAutomatically && sheets.getMeta("stop") === "") {
        scheduleContinuation(CONTINUE_DELAY_MS);
      }
      tell(report.headline, interactive);
    } catch (error) {
      deleteContinuations();
      const expected = error instanceof ConfigError;
      const next = pausedJob(sheets) === kind ? 'choose "Continue a paused job" to carry on' : "choose it from the menu again";
      const message = expected ? errorMessage(error) : `${JOB_NAMES[kind]} stopped on an unexpected error: ${errorMessage(error)}. Nothing was lost; ${next}.`;
      sheets.log(expected ? "WARN" : "ERROR", message);
      tell(message, interactive);
    } finally {
      sheets.setMeta("strikes", "0");
      sheets.flush();
      lock.releaseLock();
    }
  }
  function pausedJob(sheets) {
    const name = sheets.getMeta("job");
    return JOB_KINDS.find((kind) => kind === name);
  }
  function okToStart(kind, sheets) {
    const paused = pausedJob(sheets);
    return paused === void 0 || paused === kind || confirm(
      `A ${JOB_NAMES[paused].toLowerCase()} is paused part-way. Starting a ${JOB_NAMES[kind].toLowerCase()} now means it will not continue by itself. Start anyway?`
    );
  }
  function onOpen() {
    SpreadsheetApp.getUi().createMenu(MENU_TITLE).addItem("1. Set up sheets", "setUpSheets").addItem("2. Scan and plan", "scanAndPlan").addItem("3. Dry run", "dryRun").addItem("4. Migrate", "migrate").addSeparator().addItem("Continue a paused job", "continueJob").addItem("Stop", "stopJob").addSeparator().addItem("Help", "showHelp").addToUi();
  }
  function setUpSheets() {
    const sheets = store();
    sheets.setUp();
    sheets.flush();
    tell(
      'Sheets are ready. Fill in "Source folder" and "Destination" on the Config sheet, then choose "Scan and plan".',
      true
    );
  }
  function scanAndPlan() {
    const sheets = store();
    sheets.ensureReady();
    if (!okToStart("SCAN", sheets)) {
      return;
    }
    const rescan = sheets.readItems().length === 0 || confirm(
      "Scanning again rebuilds the Items sheet from what is in Drive now. Your Override values are kept. Progress is not lost: files already moved are no longer in the source, and copies and folders already made are recognised when you migrate. Scan again?"
    );
    if (rescan) {
      run("SCAN", "FRESH");
    }
  }
  function dryRun() {
    const sheets = store();
    sheets.ensureReady();
    if (okToStart("DRY_RUN", sheets)) {
      run("DRY_RUN", "FRESH");
    }
  }
  function migrate() {
    const sheets = store();
    sheets.ensureReady();
    const filter = configOrNull(sheets)?.pathFilter ?? "";
    const todo = sheets.readItems().filter((item) => item.status !== "DONE" && inScope(item.path, filter));
    const count = (action) => String(todo.filter((item) => effectiveAction(item) === action).length);
    const scope = filter === "" ? "" : ` under "${filter}"`;
    const question = `This will change Google Drive${scope}: up to ${count("MOVE")} file(s) moved, ${count("COPY")} copied, ${count("SHORTCUT")} shortcut(s) and ${count("CREATE_FOLDER")} folder(s) created. Nothing is deleted.

Moved files leave the source folder for the shared drive, and the shared drive's organisation becomes their owner. Continue?`;
    if (okToStart("EXECUTE", sheets) && confirm(question)) {
      run("EXECUTE", "FRESH");
    }
  }
  function continueJob() {
    const kind = pausedJob(store());
    if (kind === void 0) {
      tell("There is no paused job to continue.", true);
    } else {
      run(kind, "CONTINUE");
    }
  }
  function continueFromTrigger() {
    const sheets = store();
    const kind = pausedJob(sheets);
    const strikes = Number(sheets.getMeta("strikes") || "0");
    if (kind === void 0 || sheets.getMeta("stop") !== "") {
      deleteContinuations();
    } else if (strikes >= MAX_STRIKES) {
      deleteContinuations();
      sheets.log(
        "ERROR",
        `${JOB_NAMES[kind]} was cut off ${String(strikes)} times in a row, so it has stopped continuing by itself. Choose "Continue a paused job" to try again.`
      );
      sheets.flush();
    } else {
      run(kind, "TRIGGER");
    }
  }
  function stopJob() {
    store().setMeta("stop", "1");
    deleteContinuations();
    tell(
      'Stopping. A run that is in progress finishes its current file first. Choose "Continue a paused job" to carry on later.',
      true
    );
  }
  function showHelp() {
    tell(HELP_TEXT, true);
  }
  return __toCommonJS(index_exports);
})();

function continueFromTrigger() {
  return DriveMigrate.continueFromTrigger();
}
function continueJob() {
  return DriveMigrate.continueJob();
}
function dryRun() {
  return DriveMigrate.dryRun();
}
function migrate() {
  return DriveMigrate.migrate();
}
function onOpen() {
  return DriveMigrate.onOpen();
}
function scanAndPlan() {
  return DriveMigrate.scanAndPlan();
}
function setUpSheets() {
  return DriveMigrate.setUpSheets();
}
function showHelp() {
  return DriveMigrate.showHelp();
}
function stopJob() {
  return DriveMigrate.stopJob();
}
