---
description: "Use when editing frontend tests in src/**/*.test.ts or src/**/*.test.tsx with Vitest and React Testing Library."
name: "Frontend Testing Rules"
applyTo: "src/**/*.test.{ts,tsx}"
---
# Frontend Testing Rules

- Use existing test utilities in [src/shared/test](../../src/shared/test), especially [src/shared/test/renderWithProviders.tsx](../../src/shared/test/renderWithProviders.tsx) and [src/shared/test/mswServer.ts](../../src/shared/test/mswServer.ts).
- Prefer user-visible assertions (roles, labels, visible text) over implementation details.
- For network interactions, use MSW handlers from [src/shared/test/mswHandlers.ts](../../src/shared/test/mswHandlers.ts) instead of mocking internal implementation aggressively.
- Keep async tests explicit with await and waitFor patterns; avoid timer-based flakiness.
- Co-locate tests with source files and mirror existing naming conventions.
- When query keys or query behavior changes, keep [src/entities/queryKeys.test.ts](../../src/entities/queryKeys.test.ts) aligned.
- Validate test changes with pnpm test and, when needed, pnpm test:coverage.
