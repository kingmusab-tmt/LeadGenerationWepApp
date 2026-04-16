# Release Checklist

## Pre-Release Validation

- [ ] Branch rebased/merged with latest mainline
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes for targeted scope and no new failures introduced
- [ ] `npm run test` passes
- [ ] `npm run test:coverage` completes and critical modules meet agreed thresholds
- [ ] `npm run build` passes
- [ ] `npm run e2e` smoke tests pass

## Security and Integration Checks

- [ ] Auth and role access controls validated on key protected routes
- [ ] CSRF enforcement validated for sensitive API operations
- [ ] Stripe and Twilio webhook signature verification validated
- [ ] Secrets and PII are not exposed in API responses or logs

## Observability and Operations

- [ ] Logging endpoint (`LOGGING_ENDPOINT`) configured for production
- [ ] Alert webhook (`ALERT_WEBHOOK_URL`) configured for production
- [ ] Alert routing verified with a controlled test event

## Deployment and Rollback

- [ ] Deployment notes prepared (runtime/env changes, migrations, feature flags)
- [ ] Rollback procedure validated
- [ ] On-call owner and communication plan assigned
