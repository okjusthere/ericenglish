# Privacy and security

Eric English OS is a private single-user system, not a multi-tenant service. Cloudflare Access is the authorization boundary and is configured for one exact owner email.

## Collected data

D1 contains study state, typed responses, transcripts, assessment answers, corrections, plans, and aggregate AI usage. R2 contains temporary audio and owner-requested exports. Quick Capture can contain real work/life text; deterministic redaction replaces emails, phone numbers, URLs, and optionally street addresses before AI extraction.

## Retention and control

- Raw audio defaults to 30-day deletion and can be deleted immediately.
- Exports expire after 7 days.
- Text and learning metrics persist until the owner exports or deletes them.
- Settings exposes JSON, CSV, and Markdown exports; deletion requires typing `DELETE`.
- D1 Time Travel may permit short-term infrastructure recovery after deletion. It is not an application recycle bin.

## Data minimization

No analytics SDK, advertising tracker, public profile, social feature, email ingestion, or background microphone capture is included. Browser microphone permission is requested only when the owner presses record. The PWA caches the shell, not API responses. AI calls opt out of cache and payload logging.

## Secrets and logs

The live Workers AI binding requires no upstream provider secret. Deployment credentials stay outside the application, and optional future provider credentials belong in AI Gateway BYOK or Cloudflare Worker secrets. `.dev.vars`, Wrangler state, Playwright artifacts, and local databases are ignored by Git. Structured logs include request ID, method, path, status, and duration; never body, transcript, cookie, Access token, authorization, or provider key.

## Incident response

If a credential is exposed: revoke/rotate it at the provider, rotate the Cloudflare token, inspect Worker logs and AI usage events, remove leaked artifacts from history, and redeploy. If owner access is lost, repair the exact-email Access policy from the Cloudflare dashboard before changing application code.
