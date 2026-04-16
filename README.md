# BRIXCOT Lead Management Web App

This is a Next.js 16 + TypeScript application for lead management, onboarding, billing, automation, and role-based dashboards.

## Quickstart

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` with required variables (see Environment Setup documentation).

3. Start development server:

```bash
npm run dev
```

Default URL: `http://localhost:3000`

## Quality Commands

- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Unit/API tests: `npm run test`
- Coverage: `npm run test:coverage`
- E2E smoke: `npm run e2e`
- Build: `npm run build`
- Full local gate: `npm run check`

## Documentation Index

- Architecture baseline: `documents/01-architecture-baseline.md`
- Environment setup: `documents/02-environment-setup.md`
- Build, test, and CI: `documents/03-build-test-ci.md`
- Auth and security flow: `documents/04-auth-security-flow.md`
- Domain services and API contracts: `documents/05-domain-services-api-contracts.md`
- Schema, state, hooks, and integrations: `documents/06-schema-state-hooks-integrations.md`
- Release checklist: `documents/07-release-checklist.md`
- Architectural decisions (ADR set): `documents/08-architectural-decisions.md`
- Handoff evidence package: `documents/09-handoff-evidence.md`
- Changelog: `CHANGELOG.md`

## CI and Release

- CI quality gates workflow: `.github/workflows/quality-gates.yml`
- Implementation progress tracker: `UPGRADE_IMPLEMENTATION_CHECKLIST.md`

## Core Stack

- Next.js App Router
- React 19
- TypeScript
- NextAuth
- MongoDB + Mongoose
- Redis/in-memory cache fallback
- Stripe + Twilio integrations
