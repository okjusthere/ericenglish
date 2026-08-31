import { z } from 'zod';

export const ttsRequestSchema = z.object({
  text: z.string().trim().min(1).max(2000),
  voice: z.string().trim().min(1).max(120).optional(),
  speed: z.number().finite().min(0.5).max(2).optional(),
  format: z.enum(['mp3', 'wav', 'opus']).default('mp3'),
  version: z.string().trim().min(1).max(32).default('v1'),
});
export type TtsRequest = z.infer<typeof ttsRequestSchema>;

export const normalizeTtsText = (text: string) => text.normalize('NFKC').replace(/\s+/g, ' ').trim();

const sha256 = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

export const createTtsCacheKey = async (input: {
  text: string;
  voice: string;
  speed: number;
  model: string;
  format: string;
  version?: string;
}) => {
  const canonical = [input.version ?? 'v1', normalizeTtsText(input.text), input.voice.trim(), input.speed.toFixed(3), input.model.trim(), input.format].join('|');
  return `audio/tts/${input.version ?? 'v1'}/${await sha256(canonical)}.${input.format}`;
};

const contentTypes: Record<string, string> = { mp3: 'audio/mpeg', wav: 'audio/wav', opus: 'audio/ogg; codecs=opus' };
const maxAudioBytes = 5 * 1024 * 1024;

type TtsEnv = Env;
export type TtsResult = { key: string; contentType: string; cacheHit: boolean; model: string; voice: string; speed: number };

const asString = (env: TtsEnv, key: string, fallback = '') => {
  const value = (env as unknown as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : fallback;
};

async function withinBudget(env: TtsEnv) {
  if (!env.DB) return true;
  try {
    const row = await env.DB.prepare("SELECT COUNT(*) count FROM ai_usage_events WHERE task_type='speech_synthesis' AND created_at>=datetime('now','start of day')").first<{ count: number }>();
    const budget = await env.DB.prepare("SELECT value_json FROM app_settings WHERE key='budget'").first<{ value_json: string }>();
    const parsed = budget?.value_json ? JSON.parse(budget.value_json) as { dailyAiCallLimit?: number } : {};
    return Number(row?.count ?? 0) < Number(parsed.dailyAiCallLimit ?? 60);
  } catch { return true; }
}

export async function synthesizeAndCache(env: TtsEnv, request: TtsRequest): Promise<TtsResult> {
  const mode = asString(env, 'SPEECH_MODE', 'browser');
  const model = asString(env, 'AZURE_TTS_DEPLOYMENT', asString(env, 'AI_MODEL_TTS', 'gpt-4o-mini-tts'));
  const voice = request.voice ?? asString(env, 'AZURE_TTS_VOICE', 'alloy');
  const speed = request.speed ?? 0.92;
  const format = request.format;
  const key = await createTtsCacheKey({ text: request.text, voice, speed, model, format, version: request.version });
  const contentType = contentTypes[format];
  const existing = await env.AUDIO_BUCKET.get(key);
  if (existing && existing.size > 0 && existing.size <= maxAudioBytes) return { key, contentType, cacheHit: true, model, voice, speed };
  if (mode === 'browser' || !asString(env, 'AZURE_OPENAI_ENDPOINT') || !asString(env, 'AZURE_OPENAI_API_KEY')) throw new Error('TTS provider is not configured');
  if (!await withinBudget(env)) throw new Error('Daily AI call limit reached. Browser speech remains available.');

  const endpoint = asString(env, 'AZURE_OPENAI_ENDPOINT').replace(/\/$/, '');
  const deployment = encodeURIComponent(model);
  const apiVersion = asString(env, 'AZURE_OPENAI_API_VERSION', '2025-03-01-preview');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  const started = Date.now();
  try {
    const response = await fetch(`${endpoint}/openai/deployments/${deployment}/audio/speech?api-version=${encodeURIComponent(apiVersion)}`, {
      method: 'POST', signal: controller.signal,
      headers: { 'content-type': 'application/json', 'api-key': asString(env, 'AZURE_OPENAI_API_KEY') },
      body: JSON.stringify({ model, voice, input: normalizeTtsText(request.text), speed, response_format: format }),
    });
    if (!response.ok) throw new Error(`TTS provider request failed (${response.status})`);
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > maxAudioBytes) throw new Error('TTS provider returned invalid audio size');
    const actualType = response.headers.get('content-type')?.split(';')[0] ?? contentType;
    if (!actualType.startsWith('audio/')) throw new Error('TTS provider returned a non-audio response');
    await env.AUDIO_BUCKET.put(key, bytes, { httpMetadata: { contentType, cacheControl: 'private, max-age=31536000, immutable' }, customMetadata: { kind: 'tts', version: request.version, model, voice, speed: String(speed), createdAt: new Date().toISOString() } });
    try { await env.DB.prepare(`INSERT INTO ai_usage_events(id,task_type,provider,model,latency_ms,audio_seconds,estimated_cost,success) VALUES(?,?,?,?,?,?,?,1)`).bind(crypto.randomUUID(), 'speech_synthesis', 'azure', model, Date.now() - started, null, 0).run(); } catch { /* telemetry is best effort */ }
    return { key, contentType, cacheHit: false, model, voice, speed };
  } catch (error) {
    try { await env.DB.prepare(`INSERT INTO ai_usage_events(id,task_type,provider,model,latency_ms,estimated_cost,success,error_code) VALUES(?,?,?,?,?,?,0,?)`).bind(crypto.randomUUID(), 'speech_synthesis', 'azure', model, Date.now() - started, 0, error instanceof Error ? error.name : 'unknown').run(); } catch { /* noop */ }
    throw error;
  } finally { clearTimeout(timeout); }
}

export const ttsContentType = (format: string) => contentTypes[format] ?? 'audio/mpeg';
