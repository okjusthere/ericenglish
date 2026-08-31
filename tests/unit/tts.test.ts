import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTtsCacheKey, normalizeTtsText, synthesizeAndCache, ttsRequestSchema } from '../../src/worker/services/tts';

describe('TTS cache contract', () => {
  afterEach(() => vi.restoreAllMocks());
  it('normalizes whitespace and unicode deterministically', async () => {
    expect(normalizeTtsText('  Hello   world  ')).toBe('Hello world');
    const a = await createTtsCacheKey({ text: 'Hello   world', voice: 'ava', speed: 0.92, model: 'gpt-4o-mini-tts', format: 'mp3' });
    const b = await createTtsCacheKey({ text: 'Ｈｅｌｌｏ world', voice: 'ava', speed: 0.92, model: 'gpt-4o-mini-tts', format: 'mp3' });
    expect(a).toBe(b);
    expect(a).toMatch(/^audio\/tts\/v1\/[a-f0-9]{64}\.mp3$/);
  });

  it('validates bounded request fields', () => {
    expect(ttsRequestSchema.parse({ text: ' concise ', speed: 1.1, format: 'mp3' })).toMatchObject({ text: 'concise', speed: 1.1 });
    expect(ttsRequestSchema.safeParse({ text: '', speed: 4 })).toMatchObject({ success: false });
  });

  it('writes a cache miss to R2 and serves the next request as a cache hit', async () => {
    const objects = new Map<string, ArrayBuffer>();
    const bucket = {
      get: vi.fn(async (key: string) => { const body = objects.get(key); return body ? { size: body.byteLength } : null; }),
      put: vi.fn(async (key: string, body: ArrayBuffer) => { objects.set(key, body); }),
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Uint8Array([1, 2, 3, 4]), { status: 200, headers: { 'content-type': 'audio/mpeg' } }));
    const env = { AUDIO_BUCKET: bucket, SPEECH_MODE: 'azure_tts', AZURE_OPENAI_ENDPOINT: 'https://resource.test', AZURE_OPENAI_API_KEY: 'server-secret', AZURE_TTS_DEPLOYMENT: 'gpt-4o-mini-tts', AZURE_TTS_VOICE: 'alloy' } as unknown as Env;
    const request = ttsRequestSchema.parse({ text: 'Hello world', speed: 0.92, format: 'mp3' });
    const miss = await synthesizeAndCache(env, request);
    expect(miss).toMatchObject({ cacheHit: false, model: 'gpt-4o-mini-tts', voice: 'alloy' });
    expect(bucket.put).toHaveBeenCalledTimes(1); expect(fetchMock).toHaveBeenCalledTimes(1);
    const hit = await synthesizeAndCache(env, request);
    expect(hit).toMatchObject({ cacheHit: true, key: miss.key });
    expect(bucket.put).toHaveBeenCalledTimes(1); expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects provider errors without caching an invalid response', async () => {
    const bucket = { get: vi.fn(async () => null), put: vi.fn(async () => undefined) };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'do not expose provider payload' }), { status: 429, headers: { 'content-type': 'application/json' } }));
    const env = { AUDIO_BUCKET: bucket, SPEECH_MODE: 'azure_tts', AZURE_OPENAI_ENDPOINT: 'https://resource.test', AZURE_OPENAI_API_KEY: 'server-secret', AZURE_TTS_DEPLOYMENT: 'gpt-4o-mini-tts', AZURE_TTS_VOICE: 'alloy' } as unknown as Env;
    await expect(synthesizeAndCache(env, ttsRequestSchema.parse({ text: 'Hello' }))).rejects.toThrow('429');
    expect(bucket.put).not.toHaveBeenCalled();
  });
});
