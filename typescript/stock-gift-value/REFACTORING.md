# Code Quality Refactoring Plan

This document outlines the comprehensive refactoring plan to address all strict ESLint and code quality issues discovered after enabling super-strict code quality checks (reverting commit 483eaf4).

## Overview

**Total Issues Found:** 78 errors across 16 files
**Fixable with --fix:** 16 errors
**Manual Fixes Required:** 62 errors

## Goals

1. ✅ Follow SOLID principles
2. ✅ Keep each file under 400 lines (hard limit: 1000 lines)
3. ✅ Reduce code duplication through proper abstractions
4. ✅ Improve overall code quality and maintainability
5. ✅ Ensure all tests pass
6. ✅ Make this a pure refactoring with no functional changes

---

## Phase 1: Configuration Fixes

### 1.1 TypeScript Configuration
- [ ] Create `tsconfig.test.json` to include test files
- [ ] Update `.eslintrc.json` to handle test files properly
- [ ] Add `vite.config.ts` to appropriate TSConfig

**Files affected:**
- `tsconfig.test.json` (new)
- `.eslintrc.json`

---

## Phase 2: StockGiftCalculator Refactoring (Primary Focus)

**Current state:** 546 lines, 443 lines in main function
**Target:** Split into multiple focused components/hooks

### 2.1 Extract Sorting Logic
- [ ] Create `src/hooks/useSorting.ts` for sorting state and logic
- [ ] Extract `sortGifts` function
- [ ] Extract `handleSort` function
- [ ] Extract `getSortIndicator` function

**Issues resolved:**
- Function length violations
- Complexity violations (sort function has complexity 21)

### 2.2 Extract Keyboard Navigation Logic
- [ ] Create `src/hooks/useKeyboardNavigation.ts`
- [ ] Extract `handleKeyDown` function (complexity 22)
- [ ] Extract `setInputRef` function
- [ ] Move inputRefs management to hook

**Issues resolved:**
- Complexity violations
- Missing return types

### 2.3 Extract Gift Management Logic
- [ ] Create `src/hooks/useGiftManagement.ts`
- [ ] Extract `updateGift` function
- [ ] Extract `removeGift` function
- [ ] Extract `handleInputChange` function
- [ ] Extract `handleBlur` function
- [ ] Extract `isRowEmpty` function

**Issues resolved:**
- Missing return types
- Curly brace violations

### 2.4 Extract Value Calculation Logic
- [ ] Create `src/hooks/useGiftValueCalculation.ts`
- [ ] Extract `calculateValues` async function (complexity 19)
- [ ] Add proper error handling with typed errors
- [ ] Add proper return type annotations

**Issues resolved:**
- Complexity violations
- Floating promises
- Missing return types

### 2.5 Extract Clipboard/Copy Logic
- [ ] Create `src/hooks/useClipboard.ts`
- [ ] Extract `handleCopy` function
- [ ] Extract TSV formatting logic

**Issues resolved:**
- Missing return types
- No-misused-promises

### 2.6 Create Constants File
- [ ] Create `src/constants/stockGiftConstants.ts`
- [ ] Extract `MAX_ROWS = 50`
- [ ] Extract magic numbers (36, 9 for ID generation)

**Issues resolved:**
- Magic number violations

### 2.7 Simplify Main Component
- [ ] Reduce main component to < 100 lines
- [ ] Use extracted hooks
- [ ] Add explicit return types
- [ ] Fix curly brace violations
- [ ] Remove unnecessary else-returns

**Issues resolved:**
- Function length violations
- Missing return types
- Curly brace violations
- No-else-return violations
- Default-case violations

---

## Phase 3: API Handler Refactoring

### 3.1 Extract Validation Logic
- [ ] Create `api/validators.ts`
- [ ] Extract ticker validation
- [ ] Extract date validation
- [ ] Add explicit return types

**Issues resolved:**
- Complexity violations (complexity 21)

### 3.2 Extract Yahoo Finance Integration
- [ ] Create `api/yahooFinanceClient.ts`
- [ ] Move Yahoo Finance API logic to dedicated module
- [ ] Create proper error types
- [ ] Add explicit return types

**Issues resolved:**
- Complexity violations
- Missing return types

### 3.3 Create Constants File
- [ ] Create `api/constants.ts`
- [ ] Extract `SECONDS_PER_DAY = 86400`
- [ ] Extract HTTP status codes (404, 500)

**Issues resolved:**
- Magic number violations

### 3.4 Fix Code Quality Issues
- [ ] Replace `==` with `===` (2 instances)
- [ ] Add curly braces where needed
- [ ] Add explicit return types

**Issues resolved:**
- Equality violations
- Missing return types

---

## Phase 4: Server Refactoring

### 4.1 Extract Logger Module
- [ ] Create `api/logger.ts`
- [ ] Replace all `console.log` with logger functions
- [ ] Use `console.warn` and `console.error` where appropriate

**Issues resolved:**
- Console statement violations (13 instances)

### 4.2 Create Constants File
- [ ] Extract `DEFAULT_PORT = 3001`
- [ ] Extract `SERVER_ERROR_STATUS = 500`

**Issues resolved:**
- Magic number violations

### 4.3 Fix Code Quality Issues
- [ ] Remove unnecessary else after return
- [ ] Add curly braces where needed
- [ ] Add explicit return types

**Issues resolved:**
- No-else-return violations

---

## Phase 5: Component Fixes

### 5.1 App.tsx
- [ ] Add explicit return type to App function

**Issues resolved:**
- Missing return types (2 instances)

### 5.2 StockGiftRow.tsx
- [ ] Add explicit return types to all functions
- [ ] Add explicit return types to event handlers

**Issues resolved:**
- Missing return types (6 instances)

---

## Phase 6: Service Layer Fixes

### 6.1 stockApi.ts
- [ ] Create proper error response type
- [ ] Fix unsafe any assignments
- [ ] Add type guards for API responses
- [ ] Add explicit return types

**Issues resolved:**
- Unsafe any violations (4 instances)

---

## Phase 7: Utility Fixes

### 7.1 calculations.ts
- [ ] Add curly braces to all if statements (3 instances)

**Issues resolved:**
- Curly brace violations

---

## Phase 8: Test Setup Fixes

### 8.1 test/setup.ts
- [ ] Refactor to avoid parameter reassignment
- [ ] Use local variable instead

**Issues resolved:**
- Parameter reassignment violation

---

## Phase 9: Main Entry Point Fixes

### 9.1 main.tsx
- [ ] Replace non-null assertion with proper null check
- [ ] Add error handling for missing root element

**Issues resolved:**
- Non-null assertion violation

---

## Phase 10: Final Verification

### 10.1 Run All Checks
- [ ] Run `npm run typecheck` - ensure no TypeScript errors
- [ ] Run `npm run lint` - ensure no ESLint errors
- [ ] Run `npm run format:check` - ensure consistent formatting
- [ ] Run `npm run test:coverage` - ensure all tests pass
- [ ] Run `npm run quality` - ensure all quality checks pass

### 10.2 Verify File Sizes
- [ ] Confirm all files are under 400 lines (ideally)
- [ ] Confirm no files exceed 1000 lines (hard limit)

### 10.3 Verify No Functional Changes
- [ ] Manual testing of application functionality
- [ ] Verify all spreadsheet features work correctly
- [ ] Verify API integration works correctly

---

## Summary of Refactoring Approach

### SOLID Principles Applied

1. **Single Responsibility Principle (SRP)**
   - Split large StockGiftCalculator into focused hooks
   - Each module has one clear responsibility

2. **Open/Closed Principle (OCP)**
   - Logger abstraction allows easy extension
   - Hook-based architecture allows composition

3. **Liskov Substitution Principle (LSP)**
   - Proper typing ensures type safety
   - No inheritance issues to address

4. **Interface Segregation Principle (ISP)**
   - Focused hook interfaces
   - Each hook exposes only what's needed

5. **Dependency Inversion Principle (DIP)**
   - Dependencies on abstractions (hooks, services)
   - Not on concrete implementations

### Code Organization Strategy

```
typescript/stock-gift-value/
├── api/
│   ├── constants.ts           (new)
│   ├── logger.ts              (new)
│   ├── validators.ts          (new)
│   ├── yahooFinanceClient.ts  (new)
│   ├── handler.ts             (refactored)
│   └── server.ts              (refactored)
├── src/
│   ├── components/
│   │   ├── StockGiftCalculator.tsx  (< 100 lines)
│   │   └── StockGiftRow.tsx         (refactored)
│   ├── constants/
│   │   └── stockGiftConstants.ts    (new)
│   ├── hooks/
│   │   ├── useClipboard.ts          (new)
│   │   ├── useGiftManagement.ts     (new)
│   │   ├── useGiftValueCalculation.ts (new)
│   │   ├── useKeyboardNavigation.ts (new)
│   │   └── useSorting.ts            (new)
│   ├── services/
│   ├── types/
│   └── utils/
└── tsconfig.test.json (new)
```

### Key Metrics

- **Files to create:** 9 new files
- **Files to refactor:** 10 existing files
- **Estimated line count reduction in StockGiftCalculator:** 546 → ~80-100 lines
- **Functions extracted:** ~20 functions
- **Custom hooks created:** 5 hooks

---

## Progress Tracking

Last updated: [To be updated during implementation]
Current phase: Not started
