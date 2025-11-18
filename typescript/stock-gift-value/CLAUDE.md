# Claude Code Guidelines for Stock Gift Value Calculator

This file contains concise guidelines for Claude Code when working on this project.

## Essential Setup Commands

```bash
# Always use absolute paths with cd prefix for ALL commands
cd /home/user/ai-playground/typescript/stock-gift-value && npm ci
```

## Code Quality Workflow

**CRITICAL:** Always run code quality checks BEFORE pushing changes to GitHub.

```bash
# Run all quality checks (do this before every push)
cd /home/user/ai-playground/typescript/stock-gift-value && npm run build:server
cd /home/user/ai-playground/typescript/stock-gift-value && npm run lint
cd /home/user/ai-playground/typescript/stock-gift-value && npm test
```

### Individual Quality Check Commands

```bash
# TypeScript compilation (server)
cd /home/user/ai-playground/typescript/stock-gift-value && npm run build:server

# TypeScript type checking (frontend)
cd /home/user/ai-playground/typescript/stock-gift-value && npm run typecheck

# ESLint
cd /home/user/ai-playground/typescript/stock-gift-value && npm run lint

# Tests with coverage
cd /home/user/ai-playground/typescript/stock-gift-value && npm run test:coverage

# Prettier formatting check
cd /home/user/ai-playground/typescript/stock-gift-value && npm run format:check
```

## Command Execution Best Practices

1. **Always use absolute paths:** Prefix EVERY bash command with `cd /absolute/path &&`
   - ✅ Good: `cd /home/user/ai-playground/typescript/stock-gift-value && npm run lint`
   - ❌ Bad: `cd typescript/stock-gift-value && npm run lint`
   - ❌ Bad: `npm run lint` (without cd)

2. **Never skip code quality checks:** Run checks before every push to avoid CI/CD failures
   - Build server: `npm run build:server`
   - Lint: `npm run lint`
   - Tests: `npm test`

3. **Resolve issues properly, not with suppression:**
   - ❌ Bad: Adding `// eslint-disable-next-line` comments
   - ✅ Good: Refactoring code to follow SOLID principles and best practices
   - ✅ Good: Extracting magic numbers to named constants
   - ✅ Good: Properly typing variables instead of using `any`

## Common Issues and Solutions

### TypeScript Compilation Errors

**Problem:** Module resolution or missing type definitions

**Solution:** Ensure dependencies are installed
```bash
cd /home/user/ai-playground/typescript/stock-gift-value && npm ci
```

### ESLint Errors

**Problem:** Magic numbers, implicit any types, unused variables

**Solutions:**
- Extract magic numbers to named constants:
  ```typescript
  // Bad
  setTimeout(callback, 10000)

  // Good
  const TIMEOUT_MS = 10000 // 10 seconds
  setTimeout(callback, TIMEOUT_MS)
  ```

- Add proper types instead of suppressing:
  ```typescript
  // Bad
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function foo(x: any) { ... }

  // Good
  interface FooInput {
    id: string
    value: number
  }
  function foo(x: FooInput) { ... }
  ```

## Project Architecture

- **Frontend:** React + TypeScript + Vite (strict mode enabled)
- **Backend:** Express 5 + Node.js 22 (ES modules)
- **Shared:** `shared/types.ts` - single source of truth for types
- **Config:**
  - `tsconfig.json` - Frontend config (strict: true)
  - `tsconfig.server.json` - Server config (strict: false, but still requires types)
  - `.eslintrc.json` - ESLint rules (includes no-magic-numbers)

## Build Outputs

- `dist/` - Built frontend (Vite output)
- `dist-server/` - Built server (TypeScript output)
- Both directories are gitignored

## Testing

- Framework: Vitest with MSW (Mock Service Worker)
- Coverage required for all new features
- Tests must pass before merging

## Pre-Push Checklist

Before pushing ANY changes to GitHub:

1. ✅ Dependencies installed: `cd /home/user/ai-playground/typescript/stock-gift-value && npm ci`
2. ✅ Server builds: `cd /home/user/ai-playground/typescript/stock-gift-value && npm run build:server`
3. ✅ Linting passes: `cd /home/user/ai-playground/typescript/stock-gift-value && npm run lint`
4. ✅ Tests pass: `cd /home/user/ai-playground/typescript/stock-gift-value && npm test`
5. ✅ No suppression comments added (refactored properly instead)
6. ✅ Changes committed with clear message
7. ✅ Pushed to correct branch with proper session ID

## Development Workflow

```bash
# 1. Install dependencies
cd /home/user/ai-playground/typescript/stock-gift-value && npm ci

# 2. Make code changes
# ... edit files ...

# 3. Run quality checks
cd /home/user/ai-playground/typescript/stock-gift-value && npm run build:server
cd /home/user/ai-playground/typescript/stock-gift-value && npm run lint
cd /home/user/ai-playground/typescript/stock-gift-value && npm test

# 4. Commit and push
cd /home/user/ai-playground/typescript/stock-gift-value && git add .
cd /home/user/ai-playground/typescript/stock-gift-value && git commit -m "Clear commit message"
cd /home/user/ai-playground/typescript/stock-gift-value && git push -u origin <branch-name>
```

## Key Takeaways

- **Absolute paths are mandatory** for all bash commands
- **Code quality checks are mandatory** before every push
- **Refactor, don't suppress** - follow SOLID principles and industry best practices
