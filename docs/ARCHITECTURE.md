# Architecture

## Runtime shape

The official Cloudflare Vite plugin builds one React SPA and one Hono Worker. Static assets use the `ASSETS` binding; `/api/*` and `/health` run through the Worker first. The system has one logical user (`primary`); Cloudflare Access performs edge authorization, while the application deliberately does not invent a second login system.

## State and services

- D1 is authoritative for profiles, learning units, four-dimensional mastery, FSRS cards/events, plans, sessions, writing, corrections, assessment data, reports, jobs, and export metadata.
- R2 stores temporary raw audio and generated exports. Object keys are random IDs, never personal names.
- Workflows run speaking analysis, weekly reporting, and curriculum bootstrap with named, retryable steps.
- The hourly Cron dispatches timezone-aware daily planning, Sunday reporting, retention cleanup, and rate-event cleanup.
- The Workers AI binding handles production text generation and STT through the named AI Gateway; browser speech synthesis handles TTS. OpenAI-compatible Gateway/direct adapters and deterministic mock adapters implement the same contracts.

## Learning loop

Capture or seed unit → four FSRS cards → deterministic daily allocation → active recall/output → mastery update → error ledger → targeted retry → weekly analysis. Recognition, recall, production, and transfer are tracked independently; a recognized word is not treated as productive.

Daily allocation has exact 30/45/60/75/90-minute modes, caps new content when reviews accumulate, prioritizes real-world relevance and recurring errors, and always prefers due recall and active output over novelty.

## Request lifecycle

Cloudflare Access → Hono security middleware → D1 rate limit → Zod input validation → prepared D1/R2/Workflow operation → validated response. Mutations require same-origin `Origin` and `x-eric-csrf: 1`. Responses receive CSP, frame, MIME, referrer, permissions, COOP, and CORP headers.

## Offline/PWA

The service worker caches only the application shell and static assets. Quick Capture stores unsent entries in IndexedDB and flushes them when connectivity returns. API or personal response caching is intentionally excluded.

## Failure model

Deterministic planning, review, stored content, capture queuing, and exports do not depend on AI uptime. Structured AI output is schema-validated and gets one repair attempt. Workflow writes and bootstrap seeds are idempotent. Request logs carry request IDs and operational metadata only.
