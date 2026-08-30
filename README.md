# Eric English OS

Private, single-user English training software for moving from receptive B1+/B2 knowledge to reliable spoken and written output. It combines a deterministic daily planner, FSRS scheduling, speaking and writing practice, real-world capture, an error ledger, weekly reports, and export/delete controls.

## Stack

React 19, TypeScript, Vite, Hono, Cloudflare Workers, D1, R2, Workflows, AI Gateway, Workers AI, `ts-fsrs`, Zod, Vitest, and Playwright. Production and preview traffic is protected at the Worker level by Cloudflare Access.

## Local setup

Requirements: Node 22+, Corepack, and a Cloudflare account only for remote operations.

```bash
corepack enable
pnpm install --frozen-lockfile
cp .dev.vars.example .dev.vars
pnpm db:migrate:local
pnpm db:seed:local
pnpm dev --host 127.0.0.1
```

Open `http://127.0.0.1:5173`. Local development and CI use the deterministic mock AI provider from `.dev.vars`; no paid API is called.

To reset local D1, remove only `.wrangler/state` after stopping the dev server, then rerun the migration and seed commands. Do not commit `.dev.vars` or `.wrangler/`.

## Quality gates

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
pnpm smoke:local
```

`pnpm test:e2e` expects Playwright Chromium (`pnpm exec playwright install chromium`). The web server migrates the local database; first-run bootstrap loads the committed 240 units, 50 scenarios, and 960 cards.

## Seed and migrations

```bash
pnpm seed:generate       # deterministically regenerates and validates 240/50
pnpm db:migrate:local
pnpm db:seed:local
pnpm db:migrate:remote
pnpm db:seed:remote
```

Migrations are append-only under `migrations/`. The seed command is idempotent and preserves user-created data.

## Production deployment

Read [Cloudflare setup](docs/CLOUDFLARE_SETUP.md) before deployment. The automated path is:

```bash
pnpm exec wrangler login
export CLOUDFLARE_ACCOUNT_ID='…'
export CLOUDFLARE_API_TOKEN='…'
export OWNER_EMAIL='eric.wei@kevv.ai'
export PRODUCTION_URL='https://english.diypokecard.com'
pnpm cf:bootstrap
```

The script discovers or creates D1/R2, configures the private AI Gateway, applies migrations, seeds content, deploys Workflows/Cron/assets to `english.diypokecard.com`, and creates an exact-owner Access policy. Production uses the Cloudflare Workers AI binding through Gateway `eric-english-os-ai`, so no upstream provider key or `AI_GATEWAY_TOKEN` is required. The default text and speech-to-text models are recorded in `wrangler.jsonc`; browser speech synthesis is the TTS fallback.

The first deployment runs the full functional smoke before closing the Access boundary. After Access is active, authenticate in a browser as `eric.wei@kevv.ai` and verify Today plus `/api/today`; use the Settings health-check control for the provider. The policy intentionally has no service-token principal.

## Operations and troubleshooting

- `pnpm ai:health https://…` checks the configured provider without exposing keys before Access is created; afterward use the owner-only Settings control.
- `pnpm exec wrangler tail` streams structured request/job logs; logs omit request bodies, cookies, authorization, and AI payloads.
- A `409` from `/api/today` means first-run bootstrap is needed.
- An AI `503` means the Workers AI binding, Gateway, configured model, or budget needs attention; the deterministic planner and stored learning data remain available.
- If remote D1 commands target the wrong resource, run `pnpm exec wrangler d1 list` and inspect `wrangler.jsonc` before retrying.
- If Access redirects command-line smoke tests, that is expected. Authenticate as the owner in a browser; do not widen the policy to add an automation identity.

Further references: [architecture](docs/ARCHITECTURE.md), [AI providers](docs/AI_PROVIDERS.md), [privacy](docs/PRIVACY.md), and [operations](docs/OPERATIONS.md).
