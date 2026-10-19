# Claude Code Guidelines for Stock Gift Value Calculator

This file contains concise guidelines for Claude Code when working on this project.

The project lives at `stock-gift-value/` in the root of the `ai-playground` repo. In the examples below, `<repo>` is the absolute path to your checkout.

## Essential Setup Commands

```bash
# Always use absolute paths with cd prefix for ALL commands
cd <repo>/stock-gift-value && npm ci
```

## Code Quality Workflow

**CRITICAL:** Always run the same checks CI runs (`.github/workflows/stock-gift-value-ci.yml`) BEFORE pushing changes to GitHub.

```bash
# Typecheck, lint, format check, and tests with coverage (do this before every push)
cd <repo>/stock-gift-value && npm run quality

# Frontend and server builds
cd <repo>/stock-gift-value && npm run build
cd <repo>/stock-gift-value && npm run build:server
```

### Individual Quality Check Commands

```bash
# TypeScript type checking (frontend)
cd <repo>/stock-gift-value && npm run typecheck

# ESLint
cd <repo>/stock-gift-value && npm run lint

# Prettier formatting check (src/ only)
cd <repo>/stock-gift-value && npm run format:check

# Tests with coverage
cd <repo>/stock-gift-value && npm run test:coverage

# TypeScript compilation (server)
cd <repo>/stock-gift-value && npm run build:server
```

## Command Execution Best Practices

1. **Always use absolute paths:** Prefix EVERY bash command with `cd /absolute/path &&`
   - ✅ Good: `cd <repo>/stock-gift-value && npm run lint`
   - ❌ Bad: `cd stock-gift-value && npm run lint`
   - ❌ Bad: `npm run lint` (without cd)

2. **Never skip code quality checks:** Run `npm run quality`, `npm run build`, and `npm run build:server` before every push to avoid CI/CD failures

3. **Resolve issues properly, not with suppression:**
   - ❌ Bad: Adding `// eslint-disable-next-line` comments
   - ✅ Good: Refactoring code to follow SOLID principles and best practices
   - ✅ Good: Extracting magic numbers to named constants
   - ✅ Good: Properly typing variables instead of using `any`

## Troubleshooting

When encountering issues, consult **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** for common problems and solutions.

**After resolving a new issue:** Update TROUBLESHOOTING.md with the problem, solution, and root cause so others (including future Claude Code sessions) can benefit from your experience.

## Project Architecture

- **Frontend:** React + TypeScript + Vite (strict mode enabled)
- **Backend:** Express 5 + Node.js 22 (ES modules)
- **Shared:** `shared/types.ts` - single source of truth for types
- **Config:**
  - `tsconfig.json` - Frontend config (strict: true)
  - `tsconfig.server.json` - Server config (strict: true)
  - `eslint.config.js` - ESLint flat config (includes no-magic-numbers)

## Build Outputs

- `dist/` - Built frontend (Vite output)
- `dist-server/` - Built server (TypeScript output)
- Both directories are gitignored

## Testing

- Framework: Vitest with MSW (Mock Service Worker)
- Coverage required for all new features
- Tests must pass before merging
- Any React warning (e.g. a state update not wrapped in `act()`) fails the test that caused it; see `src/test/setup.ts`. In tests, wrap direct DOM calls such as `element.focus()` / `element.blur()` in `act()`, or use `userEvent`

## Pre-Push Checklist

Before pushing ANY changes to GitHub:

1. ✅ Dependencies installed: `cd <repo>/stock-gift-value && npm ci`
2. ✅ Quality checks pass: `cd <repo>/stock-gift-value && npm run quality`
3. ✅ Frontend builds: `cd <repo>/stock-gift-value && npm run build`
4. ✅ Server builds: `cd <repo>/stock-gift-value && npm run build:server`
5. ✅ No suppression comments added (refactored properly instead)
6. ✅ Changes committed with clear message
7. ✅ Pushed to a feature branch, not `main`

## Development Workflow

```bash
# 1. Install dependencies
cd <repo>/stock-gift-value && npm ci

# 2. Make code changes
# ... edit files ...

# 3. Run quality checks
cd <repo>/stock-gift-value && npm run quality
cd <repo>/stock-gift-value && npm run build
cd <repo>/stock-gift-value && npm run build:server

# 4. Commit and push
cd <repo>/stock-gift-value && git add .
cd <repo>/stock-gift-value && git commit -m "Clear commit message"
cd <repo>/stock-gift-value && git push -u origin <branch-name>
```

## Key Takeaways

- **Absolute paths are mandatory** for all bash commands
- **Code quality checks are mandatory** before every push
- **Refactor, don't suppress** - follow SOLID principles and industry best practices
