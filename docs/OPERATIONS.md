# Operations

## Routine checks

Daily: `/health`, Today generation, due-card scheduling, and provider health. Weekly: report job, error-ledger changes, AI spend, failed Workflow instances, and R2 retention. Monthly: export a backup, inspect D1 Time Travel availability, and review Access policy membership.

## Deploy

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build
pnpm db:migrate:remote
pnpm db:seed:remote
pnpm exec wrangler deploy
# Before Access is created on the first deployment only:
PRODUCTION_URL='https://…' pnpm smoke:production
```

Never deploy when a gate fails. D1 migrations are forward-only; create a corrective migration rather than editing an applied file.

## Smoke path

The first-deploy automated smoke verifies health, Today, D1 read/write through a review, text speaking, writing, Quick Capture, progress, and R2 export download before Access is created. Every deploy verifies unauthenticated Access denial. Then authenticate with the owner email in a browser and verify Today, `/api/today`, speaking, writing, Quick Capture, progress, and export. No automation identity is permitted by the Access policy.

## Observability

```bash
pnpm exec wrangler tail eric-english-os
pnpm exec wrangler workflows instances list
pnpm exec wrangler d1 execute eric-english-os-db --remote --command "SELECT status, COUNT(*) FROM job_runs GROUP BY status"
pnpm exec wrangler r2 bucket lifecycle list eric-english-os-audio
```

Expected `/health` status is `ok` with database, R2, and Workflows true. A degraded result blocks deployment.

## Backup and restore

Use D1 Time Travel for point-in-time recovery within the account’s available window. Keep every migration in Git. Owner exports are portable but are not an automated restore image; restore them only through a reviewed, one-off import. R2 audio is intentionally ephemeral.

## Failure playbooks

- AI outage: run the owner-authenticated Settings health check (or `pnpm ai:health` before Access exists); verify the Workers AI binding, Gateway ID/settings, model names, and budget. Reviews/plans remain available.
- D1 failure: stop mutating smoke jobs, inspect migration state and Time Travel, restore, then rerun integration smoke.
- Workflow failure: inspect the instance and `job_runs`; retries are idempotent, so replay only after fixing the cause.
- R2 failure: speaking text turns remain usable; verify binding, bucket jurisdiction, and lifecycle rules.
- Access leak: immediately replace the app policy with exact owner email, remove bypass/public overrides, invalidate sessions, and retest private/non-owner access.

## Rollback

Use a known-good Worker deployment rollback only if its schema is compatible with the already-applied D1 migration. Never roll D1 backward destructively. When compatibility is uncertain, ship a forward fix.
