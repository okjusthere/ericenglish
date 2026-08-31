import { describe, expect, it } from 'vitest';
import { createTtsCacheKey, normalizeTtsText, ttsRequestSchema } from '../../src/worker/services/tts';

describe('TTS cache contract', () => {
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
});
