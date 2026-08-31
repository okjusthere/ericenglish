import { afterEach, describe, expect, it, vi } from 'vitest';
import { AzureRealtimeError, azureRealtimeClientSecretUrl, mintAzureRealtimeClientSecret } from '../../src/ai/providers/azure-realtime';
import { RealtimeTransport } from '../../src/client/lib/realtime';

describe('Azure realtime contract', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('mints only an ephemeral secret and maps provider failures', async () => {
    expect(azureRealtimeClientSecretUrl('https://resource.cognitiveservices.azure.com/')).toBe('https://resource.cognitiveservices.azure.com/openai/v1/realtime/client_secrets');
    const okFetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ value: 'ephemeral', expires_at: 123 }), { status: 200 }));
    const result = await mintAzureRealtimeClientSecret({ endpoint: 'https://resource.cognitiveservices.azure.com', deployment: 'gpt-realtime-2.1', apiKey: 'permanent-key' }, { mode: 'fluency', durationSeconds: 60, instructions: 'Coach.' }, okFetch as unknown as typeof fetch);
    expect(result).toEqual({ value: 'ephemeral', expiresAt: 123 });
    expect(JSON.stringify(result)).not.toContain('permanent-key');
    const request = okFetch.mock.calls[0]?.[1] as RequestInit;
    expect(String(request.body)).not.toContain('permanent-key');
    const denied = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response('{}', { status: 429 }));
    await expect(mintAzureRealtimeClientSecret({ endpoint: 'https://resource.test', deployment: 'model', apiKey: 'key' }, { mode: 'fluency', durationSeconds: 60, instructions: 'Coach.' }, denied as unknown as typeof fetch)).rejects.toMatchObject({ code: 'rate_limited', status: 429 } satisfies Partial<AzureRealtimeError>);
  });

  it('deduplicates browser transcript events and keeps the permanent key server-side', async () => {
    let channel: { readyState: string; onmessage: ((event: { data: string }) => void) | null; send: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> };
    class Peer {
      connectionState = 'connected'; ontrack: ((event: { streams: MediaStream[] }) => void) | null = null; onconnectionstatechange: (() => void) | null = null;
      addTrack() { return undefined; }
      createDataChannel() { channel = { readyState: 'open', onmessage: null, send: vi.fn(), close: vi.fn() }; return channel as unknown as RTCDataChannel; }
      async createOffer() { return { type: 'offer' as RTCSdpType, sdp: 'offer-sdp' }; }
      async setLocalDescription() { return undefined; } async setRemoteDescription() { return undefined; } close() { return undefined; }
    }
    const stopTrack = vi.fn(); const track = { stop: stopTrack } as unknown as MediaStreamTrack; const stream = { getTracks: () => [track] } as unknown as MediaStream;
    vi.stubGlobal('RTCPeerConnection', Peer); vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn(async () => stream) } });
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => String(input).includes('client-secret') ? new Response(JSON.stringify({ clientSecret: 'ephemeral', expiresAt: null, signalingUrl: 'https://resource.test/openai/v1/realtime/calls', maxDurationSeconds: 300 }), { status: 200 }) : String(input).includes('/calls') ? new Response('answer-sdp', { status: 200 }) : new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const events: string[] = []; const transport = new RealtimeTransport({ sessionId: 'session-1', mode: 'fluency', onEvent: (event) => events.push(event.eventId) });
    await transport.start();
    const event = JSON.stringify({ event_id: 'same-event', type: 'response.audio_transcript.done', transcript: 'Hello' });
    channel!.onmessage?.({ data: event }); channel!.onmessage?.({ data: event });
    await vi.waitFor(() => expect(events.filter((id) => id === 'same-event')).toHaveLength(1));
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/events'))).toBe(true);
    transport.interrupt(); expect(channel!.send).toHaveBeenCalledWith(JSON.stringify({ type: 'response.cancel' }));
    await transport.refreshToken(); expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('client-secret'))).toHaveLength(2);
    transport.close(); expect(stopTrack).toHaveBeenCalled();
  });
});
