import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AzureOpenAISttProvider,
  AzureOpenAITextProvider,
  AzureOpenAITtsProvider,
  buildAzureHeaders,
  buildAzureOpenAIUrl,
  mapAzureStatus,
} from '../../src/ai/providers/azure-openai';
import { AzureRealtimeError, mintAzureRealtimeClientSecret } from '../../src/ai/providers/azure-realtime';

const options = {
  endpoint: 'https://example.openai.azure.com/',
  apiKey: 'super-secret-key',
  deployments: { text: 'gpt-text', stt: 'gpt-stt', tts: 'gpt-tts' },
  timeoutMs: 500,
};

describe('Azure OpenAI adapter contract', () => {
  afterEach(() => vi.restoreAllMocks());

  it('builds deployment URLs and server-only headers', () => {
    expect(buildAzureOpenAIUrl(options.endpoint, 'gpt text', 'chat/completions', '2025-01-01')).toBe('https://example.openai.azure.com/openai/deployments/gpt%20text/chat/completions?api-version=2025-01-01');
    const headers = buildAzureHeaders(options.apiKey, 'request-1');
    expect(headers.get('api-key')).toBe(options.apiKey);
    expect(headers.get('x-ms-client-request-id')).toBe('request-1');
    expect(headers.get('authorization')).toBeNull();
  });

  it.each([[401, 'unauthorized'], [403, 'forbidden'], [429, 'rate_limited'], [500, 'provider_unavailable'], [503, 'provider_unavailable']] as const)('maps %s to %s without provider payload leakage', (status, code) => {
    const error = mapAzureStatus(status, 'azure-request-id');
    expect(error).toMatchObject({ status, code, requestId: 'azure-request-id' });
    expect(error.message).not.toContain('secret');
  });

  it('validates text response and records request id/latency', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: 'hello' } }], usage: { prompt_tokens: 2, completion_tokens: 3 } }), { status: 200, headers: { 'content-type': 'application/json', 'x-request-id': 'azure-123' } }));
    const usage = vi.fn(async () => undefined);
    const provider = new AzureOpenAITextProvider({ ...options, fetchImpl: fetchMock as unknown as typeof fetch, usageSink: usage });
    const result = await provider.generateText({ taskType: 'test', system: 'system', prompt: 'hello', modelRole: 'daily_fast' });
    expect(result).toMatchObject({ text: 'hello', provider: 'azure-openai', model: 'gpt-text', requestId: 'azure-123' });
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(usage).toHaveBeenCalledWith(expect.objectContaining({ requestId: 'azure-123', success: true, provider: 'azure-openai', model: 'gpt-text' }));
    expect((fetchMock.mock.calls as unknown[][])[0]?.[1]).toEqual(expect.objectContaining({ headers: expect.any(Headers) }));
  });

  it('rejects malformed token responses and accepts a valid token', () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ value: '' }), { status: 200 }));
    return expect(mintAzureRealtimeClientSecret({ endpoint: options.endpoint, deployment: 'gpt-realtime', apiKey: options.apiKey }, { mode: 'roleplay', durationSeconds: 60, instructions: 'safe' }, fetchMock as unknown as typeof fetch)).rejects.toBeInstanceOf(AzureRealtimeError);
  });

  it('mints a realtime token without returning the permanent key', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ value: 'ephemeral-token', expires_at: 123 }), { status: 200, headers: { 'x-request-id': 'rid' } }));
    const result = await mintAzureRealtimeClientSecret({ endpoint: options.endpoint, deployment: 'gpt-realtime', apiKey: options.apiKey }, { mode: 'roleplay', durationSeconds: 60, instructions: 'safe' }, fetchMock as unknown as typeof fetch);
    expect(result.value).toBe('ephemeral-token');
    expect(JSON.stringify(result)).not.toContain(options.apiKey);
    const request = ((fetchMock.mock.calls as unknown[][])[0]?.[1] ?? {}) as RequestInit;
    expect(String(request.body)).toContain('gpt-realtime');
    expect(String(request.body)).not.toContain(options.apiKey);
  });

  it('validates TTS audio content and STT transcript shape', async () => {
    const ttsFetch = vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'content-type': 'audio/mpeg' } }));
    const tts = new AzureOpenAITtsProvider({ ...options, fetchImpl: ttsFetch as unknown as typeof fetch });
    await expect(tts.synthesize('hello')).resolves.toMatchObject({ contentType: 'audio/mpeg', model: 'gpt-tts' });
    const sttFetch = vi.fn(async () => new Response(JSON.stringify({ text: 'transcript' }), { status: 200, headers: { 'content-type': 'application/json' } }));
    const stt = new AzureOpenAISttProvider({ ...options, fetchImpl: sttFetch as unknown as typeof fetch });
    await expect(stt.transcribe(new Uint8Array([1]).buffer, 'audio/webm')).resolves.toMatchObject({ text: 'transcript', model: 'gpt-stt' });
  });
});
