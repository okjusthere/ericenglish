# Codex Master Prompt — Eric English OS

将本文件和 `01_Eric_English_OS_Product_and_Implementation_Plan.md` 放在同一个空 Git 仓库根目录，然后把下面整段提示词交给 Codex。

---

## PROMPT START

You are the lead product engineer, learning-systems architect, and deployment owner for this repository.

Your task is to build and deploy **Eric English OS**, a production-quality, private, single-user English improvement web application, from an otherwise empty repository.

The complete product specification is in:

- `01_Eric_English_OS_Product_and_Implementation_Plan.md`
- `03_Cloudflare_Deployment_and_Owner_Setup.md`

Read both files in full before changing anything. Treat them as binding requirements. Do not merely scaffold the project, create mock screens, or stop after an MVP shell. Implement the complete production V1 described in the specification.

## Primary outcome

Build a personal 12-week English accelerator for one user who is approximately B1+/early B2, works in U.S. real estate and business, lives in the United States, can study at least 60 minutes per day, and needs rapid improvement in active vocabulary, natural professional communication, speaking fluency, and real-world transfer.

The product is not a generic chatbot and not a simple flashcard app. The core learning loop must be functional:

```text
assessment
-> personalized daily plan
-> FSRS review
-> active recall
-> guided production
-> speaking/writing practice
-> error extraction
-> real-world mission
-> later scheduled review
```

## Non-negotiable architecture

Use a single Cloudflare-native repository:

- React + TypeScript + Vite
- Official Cloudflare Vite plugin
- Cloudflare Workers Static Assets for the frontend
- Cloudflare Worker API, preferably Hono
- D1 for structured data
- R2 for audio and exports
- Cloudflare Workflows for durable asynchronous analysis and weekly reports
- Cloudflare AI Gateway for supported model routing/BYOK, with a direct OpenAI-compatible fallback adapter
- Cloudflare Access for single-user protection
- Wrangler for local development and deployment
- `ts-fsrs` for spaced repetition scheduling
- Zod for all request and AI structured-output validation
- Vitest and Playwright for tests
- pnpm and a committed lockfile

Do not use Cloudflare Pages as the main architecture. Do not use deprecated Workers Sites. Do not add Supabase, Firebase, Vercel, AWS, or another database/backend service.

Use currently supported stable package versions. Do not pin obsolete versions from memory. Confirm APIs against installed package types and current official documentation while implementing.

## Single-user constraints

- No public registration.
- No multi-tenancy.
- No billing.
- No roles or team management.
- Use one fixed database user ID: `primary`.
- Protect all production and preview traffic with Cloudflare Access.
- The app must still work locally using a simulated/dev identity or explicit local development bypass.

## Required product modules

Implement all of the following as real, connected features:

1. First-run bootstrap and learner profile.
2. Baseline assessment: receptive vocabulary, active recall, writing, speaking, and basic listening.
3. Personalized Today Plan for 30/45/60/75/90-minute modes.
4. Learning-unit library covering words, collocations, phrases, sentence frames, and grammar patterns.
5. FSRS review with recognition, active recall, cloze, and listening-recall cards.
6. Four-dimensional mastery tracking: recognition, recall, production, transfer.
7. Automaticity Sprint with response timing and retry loops.
8. Speaking Coach with text and push-to-talk audio turns.
9. Fluency Mode and Drill Mode.
10. STT, model response, optional TTS, session transcript, objective metrics, and structured feedback.
11. Writing Lab with Correct / Natural / Polished outputs.
12. Event Prep Mode and After Action Review.
13. Mobile-first Quick Capture for real-world phrases and missed expressions.
14. Error Ledger / My Patterns with recurring-error aggregation and micro-lessons.
15. Daily Real-World Mission.
16. Weekly report.
17. Progress dashboard.
18. JSON/CSV/Markdown export and audio deletion.
19. Settings and AI-provider health checks.
20. Installable PWA with offline Quick Capture queue.

## Cold-start personalization

Create and import `seed/personal-baseline.json` with no sensitive personal data. It should encode:

- working level: B1+ / early B2
- target: stable B2, then B2+
- American English
- strong area: commercial real estate and practical business English
- weak areas: abstract B2 vocabulary, active recall, precise word choice, natural phrasing, spontaneous speaking
- support language: Simplified Chinese when needed, faded over time
- priority contexts: real-estate calls, showing coordination, property requirements, rent/NNN/CAM/tax questions, negotiation, client recommendations, investment analysis, team leadership, school/insurance/DMV/repair/medical communication, small talk

Prioritize these known vocabulary gaps at bootstrap:

```text
concise, arbitrary, alleviate, detrimental, receptive, subtle, inevitable,
allocate, skeptical, counterproductive, compelling, negligible, streamline,
flawed, adamant, intertwined, bleak, mitigate, exponential, onerous,
spacious, deter, marginal, scrutinize, jeopardize, unprecedented, contradict
```

Do not include real client names, addresses, phone numbers, emails, student IDs, or other personal identifiers.

## Seed content

The deployed app must be useful immediately, even if no AI bootstrap job has run.

Commit at least:

- 240 high-quality learning units in `seed/core-units.jsonl`
- 50 scenario templates in `seed/scenarios.jsonl`

The units must include natural American English, concise Chinese support, collocations, examples, domains, register, CEFR working label, and confusion notes where relevant.

Also implement an idempotent `CurriculumBootstrapWorkflow` or equivalent background process that can expand the pool to roughly 1,200–1,500 validated units in batches. Generated content must be deduplicated and validated before activation.

## Learning engine requirements

Implement the deterministic learning engine separately from AI code.

### Mastery dimensions

Track 0–100 scores for:

- recognition
- recall
- production
- transfer

Track state transitions:

```text
unseen -> introduced -> recognizable -> recallable -> productive -> transferred -> mastered
```

Also support `fragile`, `suspended`, and regression after lapses.

### FSRS

Use `ts-fsrs`. Store full card state and review logs in D1. Map Again/Hard/Good/Easy from correctness, latency, and hint use, but allow user override.

Default desired retention should be 0.90. Keep thresholds configurable.

### Daily planning

Implement the priority formula and backlog rules from the product plan. AI may describe the focus, but deterministic code must select due cards, allocate time, enforce new-unit limits, and create idempotent plans.

## Speaking implementation

For production V1, prioritize a reliable turn-based voice loop over a fragile realtime demo:

1. Record a user turn with browser `MediaRecorder`.
2. Upload through the same-origin Worker API.
3. Store in R2.
4. Transcribe through the configured STT adapter.
5. Generate the AI role response.
6. Optionally synthesize TTS.
7. Save transcript and metadata.
8. At session end, start `SessionAnalysisWorkflow`.
9. Return structured feedback and create retry exercises.

Implement provider interfaces so a future realtime WebRTC provider can be added without changing the learning/session model.

Do not claim phoneme-level pronunciation accuracy. It is acceptable to report transcript confidence if available, words per minute, turn length, filler counts, target-unit usage, grammar, naturalness, and intelligibility notes.

## AI provider abstraction

Implement configurable routes for:

```text
daily_fast
evaluator_strong
content_generator
stt
tts
realtime_voice optional
embedding optional
```

Support:

- Cloudflare AI Gateway OpenAI-compatible text endpoint
- direct OpenAI-compatible text endpoint
- OpenAI-compatible transcription endpoint
- Workers AI Whisper transcription
- OpenAI-compatible TTS
- browser SpeechSynthesis fallback
- deterministic mock providers for CI/local tests

Never expose provider keys to the browser.

Store model names and non-secret routing configuration in app settings or environment variables. Store secrets only with AI Gateway BYOK/Secrets Store or Wrangler secrets.

For requests containing user audio, pasted messages, real client communication, or personal data, send privacy-oriented AI Gateway headers when supported:

```text
cf-aig-collect-log: false
cf-aig-skip-cache: true
cf-aig-zdr: true
```

Do not store full user prompts in `ai_usage_events`.

## Prompt engineering

Store prompts as versioned files under `src/ai/prompts/`. Use Zod-backed JSON schemas for all machine-consumed outputs.

Required prompt modules:

- tutor core
- lesson generator
- scenario roleplay
- scenario evaluator
- writing coach
- vocabulary/unit extractor
- assessment rater
- weekly report
- PII redaction helper

Retry one time with a repair prompt when structured output validation fails. Never write invalid partial AI output to learning-state tables.

## Feedback behavior

- American English.
- Practical and natural, not exam-oriented or artificially formal.
- Teach lexical chunks and collocations.
- Distinguish incorrect, unnatural, less precise, and more formal.
- Do not mark every stylistic variation as wrong.
- Limit normal session feedback to the three highest-value corrections.
- Require immediate retry/reconstruction after corrections.
- Schedule corrected patterns for future review.

## Security and privacy

Implement:

- Cloudflare Access deployment instructions and verification
- same-origin API
- strict Origin/Host checks for mutations
- CSRF protection or an equivalent safe same-origin approach
- CSP and standard security headers
- audio MIME/size/duration limits
- rate and budget controls
- no secrets in logs
- `.dev.vars` ignored
- redaction preview for Quick Capture
- configurable 30-day raw-audio retention
- delete-all-audio and delete-all-data flows with explicit confirmation

The application must remain unusable to unauthorized visitors even if they know the URL.

## Database and migrations

Implement the schema described in the plan. Use migration files under `migrations/`. Add indexes for due-card queries, normalized units, date-based plans, session history, and recurring errors.

All bootstrap and seed operations must be idempotent.

Do not rely on an ORM auto-sync command in production. Production schema changes must be represented by committed SQL migrations.

## Workflows and scheduled jobs

Implement at least:

- `SessionAnalysisWorkflow`
- `WeeklyReportWorkflow`
- curriculum bootstrap workflow or equivalent durable job

Use idempotency keys and safe retries.

Use an hourly Cron trigger, calculate local time with `America/New_York`, and run daily/weekly jobs only once for the intended local date. If pre-generation did not run, generate lazily when the user opens the app.

## UX standards

- Professional, calm, and minimal.
- Mobile-first but efficient on desktop.
- Do not use childish gamification.
- Make `Start Today's Session`, `Prepare for a Real Conversation`, and `Quick Capture` the dominant home actions.
- Explain in Chinese only when it improves learning; progressively fade Chinese support.
- Clear loading, upload, transcription, analysis, and failure states.
- Recording must not be lost on a transient upload error.
- Basic accessibility and keyboard navigation.
- PWA installability.

## Testing

Create comprehensive tests.

Required commands:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Use mock AI fixtures in CI. No paid API calls in tests.

Test at least:

- FSRS state changes
- mastery transitions
- daily planner allocation
- new-unit backlog limits
- review persistence
- AI schema repair
- speaking flow with mocked audio transcription
- writing flow
- capture-to-unit flow
- weekly report job
- export
- first-run bootstrap
- responsive critical paths

## Documentation

Create:

- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/AI_PROVIDERS.md`
- `docs/CLOUDFLARE_SETUP.md`
- `docs/PRIVACY.md`
- `docs/OPERATIONS.md`

README must include exact local setup, migrations, seed, tests, deployment, and troubleshooting commands.

## CI/CD

Create GitHub Actions:

- `ci.yml` for PR checks
- `deploy.yml` for main-branch remote migrations, deployment, and smoke test

Use `cloudflare/wrangler-action` or documented Wrangler commands. Require:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Do not put upstream model keys in GitHub when AI Gateway BYOK is used.

## Cloudflare provisioning and deployment

Create a robust script such as `scripts/bootstrap-cloudflare.mjs` that can:

1. verify Wrangler authentication
2. create or discover D1
3. create or discover R2
4. update `wrangler.jsonc` bindings without destroying existing settings
5. apply remote migrations
6. seed remote data
7. deploy
8. perform health/smoke checks

Where Cloudflare Access or AI Gateway BYOK requires an interactive dashboard step, generate exact instructions and stop only for that genuinely credential-bound step. Once the user completes it, continue the deployment and verify the production URL.

Prefer automating Access through the Cloudflare API when the token has the required permissions and `OWNER_EMAIL` is supplied. Never create an Allow Everyone policy.

## Execution behavior

Work autonomously and continue through all implementation phases. Do not stop after producing a plan. Do not ask ordinary product-design questions already answered by the specifications.

Use sensible defaults when details are not material. Ask the user only when blocked by a required external credential or a value that cannot be inferred, such as:

- Cloudflare authentication
- owner email for Access
- optional custom domain
- actual provider keys/model names

Even when waiting for a credential, finish all code, tests, documentation, local verification, mock-mode E2E tests, and provisioning scripts first.

Maintain a concise progress log in the Codex session. Fix failures rather than merely reporting them.

## Required final verification

Before declaring completion:

1. Run all quality-gate commands.
2. Run local smoke tests.
3. Verify migrations and seed counts.
4. Verify no secret values are tracked by Git.
5. Deploy to Cloudflare.
6. Verify Access blocks an unauthenticated request.
7. Verify an authenticated owner can open the app.
8. Complete a production smoke path:
   - load Today
   - answer one review item
   - create a text speaking session
   - submit one writing task
   - create one Quick Capture
   - read progress summary
9. Return the deployed URL, resource names, setup notes, and any optional future enhancements.

Do not call the project complete if pages are placeholders, model calls are hardcoded to mock mode, seed data is missing, deployment is not verified, or the core learning state does not persist.

Begin by reading the two specification files, then inspect the repository, create an implementation checklist, and execute it end to end.

## PROMPT END
