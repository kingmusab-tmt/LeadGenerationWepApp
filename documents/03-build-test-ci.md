# Build, Test, and CI

## Local Developer Commands

- Lint:

```bash
npm run lint
```

- Typecheck:

```bash
npm run typecheck
```

- Unit/integration tests:

```bash
npm run test
```

- Coverage report:

```bash
npm run test:coverage
```

- E2E smoke tests:

```bash
npm run e2e
```

- Local full quality gate:

```bash
npm run check
```

- Production build:

```bash
npm run build
```

## Test Framework Layout

- Vitest config: `vitest.config.ts`
- Vitest setup: `vitest.setup.ts`
- Unit/integration tests: `tests/**/*.test.ts`
- Playwright config: `playwright.config.ts`
- E2E smoke tests: `tests/e2e/smoke.spec.ts`

## CI Workflow

Workflow file: `.github/workflows/quality-gates.yml`

Pipeline jobs:

- `verify`
- `e2e-smoke` (runs after `verify`)

`verify` executes:

1. `npm ci`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run test`
5. `npm run test:coverage`
6. `npm run build`

`e2e-smoke` executes:

1. `npm ci`
2. `npx playwright install --with-deps chromium`
3. `npm run e2e`

## Troubleshooting

- If browser tests fail locally, install Playwright browsers:

```bash
npx playwright install chromium
```

- If TypeScript fails due to legacy areas, isolate failures by changed scope and remediate incrementally.
