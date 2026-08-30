# AI providers

## Modes

- `mock`: deterministic local/CI text, STT, and browser-TTS fallback; never use in production.
- `workers_ai`: production mode. Text and speech-to-text use the Cloudflare Workers AI binding and route through AI Gateway `eric-english-os-ai`.
- `cloudflare_gateway`: optional OpenAI-compatible provider traffic through an account AI Gateway and BYOK.
- `direct`: optional direct OpenAI-compatible fallback using Worker secrets.
- `workers_ai_stt`: optional hybrid mode with OpenAI-compatible text and Workers AI transcription.

Production model roles are separate: `AI_MODEL_FAST` and `AI_MODEL_CONTENT` use `@cf/qwen/qwen3-30b-a3b-fp8`, `AI_MODEL_STRONG` uses `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, and `AI_MODEL_STT` uses `@cf/openai/whisper-large-v3-turbo`. `AI_MODEL_TTS` is empty because the application uses browser speech synthesis.

## Privacy controls

Workers AI calls set Gateway options to skip cache and payload logging and retry transient failures up to two attempts. The Gateway has logging and cache disabled, authentication enabled, and a 50-request-per-minute limit. Application logs never contain prompts, transcripts, responses, keys, cookies, or authorization headers.

## Credentials

The production `AI` binding is authenticated by Cloudflare and needs no upstream provider key, BYOK entry, or `AI_GATEWAY_TOKEN`. `CLOUDFLARE_API_TOKEN` is used only for deployment/provisioning and is not an application secret. If the optional `cloudflare_gateway` or `direct` mode is selected later, store only the required `AI_GATEWAY_TOKEN` or `DIRECT_*_API_KEY` with Wrangler; never put a value in `wrangler.jsonc`, source, seed files, or GitHub Actions output.

Required non-secret routes:

```text
AI_GATEWAY_ACCOUNT_ID
AI_GATEWAY_ID
AI_MODEL_FAST
AI_MODEL_STRONG
AI_MODEL_CONTENT
AI_MODEL_STT
AI_MODEL_TTS            # empty in production; browser speech synthesis is used
```

`AI_GATEWAY_API_BASE` and `AI_GATEWAY_BYOK_ALIAS` are used only by the optional OpenAI-compatible Gateway modes.

## Validation and cost

Every structured task has a Zod schema and one explicit repair retry. The application records provider/model/token estimates and enforces daily call, strong-model, and monthly estimated-cost limits in D1. Personal content is never semantically cached. Before Access exists, run `pnpm ai:health` after changing routes or keys; afterward use the health control in the owner-authenticated Settings screen.
