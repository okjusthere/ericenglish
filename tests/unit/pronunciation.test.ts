import { afterEach, describe, expect, it, vi } from 'vitest';
import { assessPronunciation } from '../../src/worker/services/pronunciation';

describe('pronunciation assessment adapter', () => {
  afterEach(() => vi.restoreAllMocks());
  it('returns bounded word and phoneme scores without exposing the key', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ NBest: [{ Display: 'Hello', PronunciationAssessment: { AccuracyScore: 91, FluencyScore: 88, ProsodyScore: 86, PronunciationScore: 90 }, Words: [{ Word: 'Hello', PronunciationAssessment: { AccuracyScore: 91, ErrorType: 'None' }, Phonemes: [{ Phoneme: 'h', PronunciationAssessment: { AccuracyScore: 94 } }] }] }] }), { status: 200 }));
    const env = { PRONUNCIATION_ASSESSMENT_ENABLED: 'true', AZURE_SPEECH_ENDPOINT: 'https://eastus.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1', AZURE_SPEECH_KEY: 'secret-speech-key' } as unknown as Env;
    const result = await assessPronunciation(env, new Uint8Array([1, 2]).buffer, 'audio/webm', 'Hello');
    expect(result).toMatchObject({ text: 'Hello', accuracyScore: 91, fluencyScore: 88, pronunciationScore: 90, words: [{ word: 'Hello', accuracyScore: 91, phonemes: [{ phoneme: 'h', accuracyScore: 94 }] }] });
    expect(JSON.stringify(result)).not.toContain('secret-speech-key');
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers['Ocp-Apim-Subscription-Key']).toBe('secret-speech-key');
  });
  it('is independently disabled', async () => {
    await expect(assessPronunciation({ PRONUNCIATION_ASSESSMENT_ENABLED: 'false' } as unknown as Env, new Uint8Array([1]).buffer, 'audio/webm', 'Hello')).rejects.toThrow('disabled');
  });
});
