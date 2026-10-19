# Troubleshooting Guide

This file documents common issues encountered during development and their solutions. When you encounter and resolve a new issue that's likely to happen again (e.g., environment setup, external resources, configuration problems), please add it to this guide.

## Table of Contents

- [Environment Setup Issues](#environment-setup-issues)
- [TypeScript Compilation Errors](#typescript-compilation-errors)
- [ESLint Errors](#eslint-errors)
- [Testing Issues](#testing-issues)
- [Build Issues](#build-issues)

---

## Environment Setup Issues

### Dependencies Not Installed

**Problem:** Commands fail with "command not found" or module resolution errors

**Solution:** Install dependencies first
```bash
cd <repo>/stock-gift-value && npm ci
```

**When this happens:**
- After fresh clone of repository
- After switching branches
- After package.json changes

---

## TypeScript Compilation Errors

### Cannot Find Module or Type Definitions

**Problem:** Module resolution or missing type definitions
```
error TS2307: Cannot find module 'express' or its corresponding type declarations
error TS2580: Cannot find name 'process'
```

**Solution:** Ensure dependencies are installed
```bash
cd <repo>/stock-gift-value && npm ci
```

**Root cause:** node_modules or @types packages are missing

### TypeScript Config Issues

**Problem:** Unexpected type errors or missing Node.js globals

**Solution:** Check that TypeScript config files are correct:
- `tsconfig.json` - Frontend configuration (strict mode)
- `tsconfig.server.json` - Server configuration
- Avoid overly restrictive `"lib"` arrays that prevent access to built-in types

---

## ESLint Errors

### Magic Numbers

**Problem:** `no-magic-numbers` rule violation
```
error  No magic number: 10000  no-magic-numbers
```

**Solution:** Extract magic numbers to named constants
```typescript
// Bad
setTimeout(callback, 10000)

// Good
const TIMEOUT_MS = 10000 // 10 seconds
setTimeout(callback, TIMEOUT_MS)
```

### Implicit Any Types

**Problem:** Variables or function parameters have implicit `any` type
```
error TS7006: Parameter 'x' implicitly has an 'any' type
```

**Solution:** Add explicit types
```typescript
// Bad
function foo(x) { ... }

// Good
interface FooInput {
  id: string
  value: number
}
function foo(x: FooInput) { ... }
```

**Note:** Never use `// eslint-disable-next-line` to suppress errors. Always fix the root cause.

### Unused Variables or Parameters

**Problem:** `noUnusedLocals` or `noUnusedParameters` violation

**Solution:**
- Remove unused code if not needed
- Prefix with underscore if intentionally unused: `_unusedParam`
```typescript
// For parameters you must accept but don't use
app.use((_req, res) => {
  res.sendFile(path)
})
```

---

## Testing Issues

### Tests Fail After Code Changes

**Problem:** Tests pass locally but fail in CI/CD

**Solution:** Run the full test suite before pushing
```bash
cd <repo>/stock-gift-value && npm test
```

### MSW (Mock Service Worker) Issues

**Problem:** API mocks not working in tests

**Solution:** Ensure MSW handlers are properly configured in `src/test/mocks/`
- Check that handlers match the API endpoints being called
- Verify `setupServer` is properly initialized in test setup

### React act() Warnings Fail a Test

**Problem:** A test fails in its `afterEach` with `React warning detected: Warning: An update to <Component> inside a test was not wrapped in act(...)`, even though its assertions pass.

**Solution:** The failing test is the one that caused the warning. Wrap the offending call in `act()`, or drive the interaction through `userEvent`:
```tsx
// ❌ Bad: native focus/blur fire React onFocus/onBlur handlers outside act()
tickerInput.focus()
// ✅ Good
act(() => tickerInput.focus())
```

**Root cause:** `src/test/setup.ts` records React warnings logged during a test and fails that test. React only warns when a state update lands outside `act()`. user-event and `waitFor` switch act warnings off while they run, so an async update (e.g. a fetch resolving) may warn only when it lands between awaited calls, which can depend on machine speed.

**When this happens:** Calling `element.focus()` / `element.blur()` directly in tests, or leaving async state updates (fetches, timers) un-awaited.

**History:** This check used to be a `vite.config.ts` `onConsoleLog` hook. That hook never ran in environments where Vitest's console interception dropped test output, so warnings that failed CI were invisible locally, and CI blamed whichever test happened to be running. To see raw test console output in such an environment, use `npx vitest run --disableConsoleIntercept`.

---

## Build Issues

### Server Build Fails

**Problem:** `npm run build:server` fails with type errors

**Solution:**
1. Ensure dependencies are installed: `npm ci`
2. Run `npm run typecheck` to see all errors
3. Fix type errors - don't suppress with comments

### Frontend Build Fails

**Problem:** `npm run build` fails

**Solution:**
1. Check for TypeScript errors: `npm run typecheck`
2. Check for linting errors: `npm run lint`
3. Ensure all imports are correct and modules exist

### Docker Build Issues

**Problem:** Docker build fails or container doesn't start

**Solution:**
1. Test the build locally first:
   ```bash
   npm run build:all
   npm start
   ```
2. Check Dockerfile for correct paths and commands
3. Verify health check endpoint is accessible: `curl http://localhost:8080/health`

---

## How to Update This Guide

When you encounter and resolve a new issue:

1. **Document the problem clearly** - Include error messages and context
2. **Provide the solution** - Step-by-step instructions or code examples
3. **Explain the root cause** - Help others understand why it happened
4. **Add when it happens** - List scenarios that trigger this issue

**Template:**
```markdown
### Issue Title

**Problem:** Brief description and error message

**Solution:** Step-by-step fix
\`\`\`bash
commands here
\`\`\`

**Root cause:** Why this happens

**When this happens:** Common scenarios
```
