# Cloudflare setup

## Required account capabilities

Use a scoped provisioning token with Workers Scripts, D1, R2, AI Gateway, and Access Apps/Policies write permissions. Export `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, the exact `OWNER_EMAIL`, and `PRODUCTION_URL`. Production Workers AI binding calls need no separate AI key or Gateway token. Do not use a global API key and do not create an “Allow Everyone” policy.

The bootstrap script safely discovers existing named resources and can be rerun:

```bash
pnpm exec wrangler whoami
CLOUDFLARE_ACCOUNT_ID='…' CLOUDFLARE_API_TOKEN='…' \
OWNER_EMAIL='eric.wei@kevv.ai' PRODUCTION_URL='https://english.diypokecard.com' \
pnpm cf:bootstrap
```

Default resources:

- Worker `eric-english-os`
- D1 `eric-english-os-db`
- R2 `eric-english-os-audio`
- AI Gateway `eric-english-os-ai`
- Workflows `session-analysis`, `weekly-report`, and `curriculum-bootstrap`
- hourly UTC Cron with America/New_York dispatch logic
- custom domain `english.diypokecard.com`

R2 retention deletes `audio/` objects at 30 days and `exports/` at 7 days. The application also supports immediate owner-requested deletion.

## AI production configuration

The bootstrap selects `workers_ai`, binds Workers AI as `AI`, and configures Gateway `eric-english-os-ai` with logging/cache disabled, authentication enabled, a 50-request-per-minute limit, and zero-data-retention where supported. The Worker binding authenticates its calls automatically, so there is no upstream provider key, BYOK mapping, or `AI_GATEWAY_TOKEN` in the live configuration.

Production defaults are:

```text
AI_MODEL_FAST=@cf/qwen/qwen3-30b-a3b-fp8
AI_MODEL_STRONG=@cf/meta/llama-3.3-70b-instruct-fp8-fast
AI_MODEL_CONTENT=@cf/qwen/qwen3-30b-a3b-fp8
AI_MODEL_STT=@cf/openai/whisper-large-v3-turbo
AI_MODEL_TTS=                 # browser speech synthesis fallback
```

If a future provider requires OpenAI-compatible Gateway BYOK or direct mode, switch deliberately and set only the necessary Worker secret:

```bash
# Direct fallback only:
pnpm exec wrangler secret put DIRECT_LLM_API_KEY
pnpm exec wrangler secret put DIRECT_STT_API_KEY
pnpm exec wrangler secret put DIRECT_TTS_API_KEY
```

## Access verification

The script creates a Worker-destination Access app with one inline Allow policy matching only `OWNER_EMAIL`. Verify both the production Worker and preview deployments are covered:

1. Open the deployed URL in a private browser; an Access sign-in/denial page must appear and `/health` must not return application JSON.
2. Attempt a non-owner email; it must be denied.
3. Authenticate with the owner email; Today and `/api/today` must load.
4. Inspect the policy and confirm no Everyone, broad email-domain, bypass, or public destination overrides exist.

The production hostname is `english.diypokecard.com`. It is a Worker custom-domain route and is protected by the Worker-destination Access application for both production and preview traffic.

## GitHub

Set repository secrets `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`, plus repository variables `PRODUCTION_URL=https://english.diypokecard.com` and `CLOUDFLARE_DEPLOY_ENABLED=true`. Until the enable flag exists, pushes still run CI but skip automatic Cloudflare deployment; `workflow_dispatch` remains available for an intentional manual run. Deployment verifies that unauthenticated traffic is denied. The owner-authenticated functional smoke is a manual production-environment gate because adding a service token would violate the exact-owner policy. No upstream AI key is required for the current Workers AI mode.
