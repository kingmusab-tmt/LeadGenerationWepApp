# Final Architectural Decisions

Date: 2026-04-12

## ADR-001: Standardized API Wrappers

Decision:
Adopt shared route wrapper patterns for auth, validation, and centralized error handling.

Rationale:
Reduces duplicated error/auth logic and enforces consistent response contracts.

## ADR-002: Environment Contract Enforcement

Decision:
Use `lib/env.ts` Zod validation as the single runtime environment contract.

Rationale:
Fail-fast startup behavior prevents silent misconfiguration in production.

## ADR-003: Mixed Test Strategy

Decision:
Use Vitest for unit/API integration tests and Playwright for end-to-end smoke journeys.

Rationale:
Balances fast feedback with route-level and UI journey confidence.

## ADR-004: CI Quality Gates

Decision:
Enforce lint, typecheck, tests, coverage, and build in CI before smoke E2E.

Rationale:
Prevents low-quality merges and establishes deterministic release readiness checks.

## ADR-005: Shared Observability Hooks

Decision:
Route shared logger events to optional production log and alert webhooks.

Rationale:
Creates baseline diagnostics and alerting without locking into a single vendor.
