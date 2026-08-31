export type RealtimeState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'fallback' | 'closed';
export type RealtimeEventType = 'user_transcript' | 'assistant_transcript' | 'session_started' | 'session_finished';

export interface RealtimeEvent {
  eventId: string;
  eventType: RealtimeEventType;
  text?: string;
  durationMs?: number;
  payload?: Record<string, unknown>;
}

export interface RealtimeTransportOptions {
  sessionId: string;
  mode: string;
  tokenEndpoint?: string;
  onStateChange?: (state: RealtimeState) => void;
  onEvent?: (event: RealtimeEvent) => void;
  onAudio?: (stream: MediaStream) => void;
  onRecordingChunk?: (chunk: Blob) => void;
  onFallback?: (reason: Error) => void;
}

interface ClientSecretResponse { clientSecret: string; expiresAt: number | null; signalingUrl: string; maxDurationSeconds: number }

function supported(): boolean {
  return typeof RTCPeerConnection !== 'undefined' && typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function';
}

/** Browser-only WebRTC transport. It never receives or stores a permanent provider key. */
export class RealtimeTransport {
  private peer: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private microphone: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly seenEvents = new Set<string>();
  private reconnectAttempted = false;
  private closed = false;
  private state: RealtimeState = 'idle';

  constructor(private readonly options: RealtimeTransportOptions) {}

  get currentState(): RealtimeState { return this.state; }

  async start(): Promise<void> {
    this.closed = false;
    this.reconnectAttempted = false;
    await this.establish(false);
  }

  async refreshToken(): Promise<void> {
    if (this.closed) return;
    await this.establish(true);
  }

  interrupt(): void {
    if (this.dataChannel?.readyState === 'open') this.dataChannel.send(JSON.stringify({ type: 'response.cancel' }));
  }

  startRecording(): void {
    if (!this.microphone) throw new Error('Microphone is not connected.');
    if (typeof MediaRecorder === 'undefined') throw new Error('Audio recording is not supported in this browser.');
    this.recorder = new MediaRecorder(this.microphone);
    this.recorder.ondataavailable = (event) => { if (event.data.size) this.options.onRecordingChunk?.(event.data); };
    this.recorder.start(250);
  }

  stopRecording(): void { if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop(); this.recorder = null; }

  close(): void {
    this.closed = true;
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = null;
    this.stopRecording();
    this.dataChannel?.close();
    this.peer?.close();
    this.microphone?.getTracks().forEach((track) => track.stop());
    this.dataChannel = null; this.peer = null; this.microphone = null;
    this.setState('closed');
  }

  private setState(next: RealtimeState): void { this.state = next; this.options.onStateChange?.(next); }

  private async establish(isRefresh: boolean): Promise<void> {
    if (!supported()) return this.fallback(new Error('Realtime voice is not supported by this browser.'));
    this.setState(isRefresh ? 'reconnecting' : 'connecting');
    try {
      const token = await this.mintToken();
      this.teardownPeer();
      this.microphone = await navigator.mediaDevices.getUserMedia({ audio: true });
      const peer = new RTCPeerConnection();
      this.peer = peer;
      this.microphone.getTracks().forEach((track) => peer.addTrack(track, this.microphone!));
      peer.ontrack = (event) => { const stream = event.streams[0]; if (stream) this.options.onAudio?.(stream); };
      peer.onconnectionstatechange = () => { if (peer.connectionState === 'failed' && !this.closed) void this.recover(new Error('Realtime connection failed.')); };
      const channel = peer.createDataChannel('oai-events');
      this.dataChannel = channel;
      channel.onmessage = (event) => this.handleMessage(String(event.data));
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      const answer = await fetch(token.signalingUrl, { method: 'POST', headers: { Authorization: `Bearer ${token.clientSecret}`, 'content-type': 'application/sdp' }, body: offer.sdp ?? '' });
      if (!answer.ok) throw new Error('Realtime signaling failed.');
      await peer.setRemoteDescription({ type: 'answer', sdp: await answer.text() });
      this.scheduleRefresh(token.expiresAt);
      this.setState('connected');
      this.emit({ eventId: crypto.randomUUID(), eventType: 'session_started', payload: { mode: this.options.mode } });
    } catch (error) {
      await this.recover(error instanceof Error ? error : new Error('Realtime connection failed.'));
    }
  }

  private async mintToken(): Promise<ClientSecretResponse> {
    const response = await fetch(this.options.tokenEndpoint ?? '/api/realtime/client-secret', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-eric-csrf': '1' }, body: JSON.stringify({ sessionId: this.options.sessionId, mode: this.options.mode, durationSeconds: 300 }) });
    const payload = await response.json().catch(() => ({})) as Partial<ClientSecretResponse> & { error?: string };
    if (!response.ok || typeof payload.clientSecret !== 'string' || typeof payload.signalingUrl !== 'string') throw new Error(payload.error || 'Realtime token unavailable.');
    return { clientSecret: payload.clientSecret, expiresAt: payload.expiresAt ?? null, signalingUrl: payload.signalingUrl, maxDurationSeconds: payload.maxDurationSeconds ?? 300 };
  }

  private scheduleRefresh(expiresAt: number | null): void {
    if (!expiresAt) return;
    const delay = Math.max(5_000, expiresAt * 1000 - Date.now() - 15_000);
    this.refreshTimer = setTimeout(() => void this.refreshToken(), delay);
  }

  private handleMessage(raw: string): void {
    let data: Record<string, unknown>;
    try { data = JSON.parse(raw) as Record<string, unknown>; } catch { return; }
    const eventId = typeof data.event_id === 'string' ? data.event_id : typeof data.id === 'string' ? data.id : crypto.randomUUID();
    if (this.seenEvents.has(eventId)) return;
    const type = String(data.type ?? '');
    const eventType: RealtimeEventType | null = type.includes('input_audio_transcription') ? 'user_transcript' : type.includes('audio_transcript') || type.includes('text.done') ? 'assistant_transcript' : type === 'session.finished' ? 'session_finished' : null;
    if (!eventType) return;
    const text = typeof data.transcript === 'string' ? data.transcript : typeof data.text === 'string' ? data.text : undefined;
    this.emit({ eventId, eventType, text, payload: data });
  }

  private emit(event: RealtimeEvent): void {
    if (this.seenEvents.has(event.eventId)) return;
    this.seenEvents.add(event.eventId);
    this.options.onEvent?.(event);
    void fetch(`/api/realtime/sessions/${encodeURIComponent(this.options.sessionId)}/events`, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-eric-csrf': '1' }, body: JSON.stringify(event) }).catch(() => undefined);
  }

  private async recover(reason: Error): Promise<void> {
    this.teardownPeer();
    if (!this.reconnectAttempted && !this.closed) { this.reconnectAttempted = true; this.setState('reconnecting'); await this.establish(true); return; }
    this.fallback(reason);
  }

  private fallback(reason: Error): void { this.setState('fallback'); this.options.onFallback?.(reason); }

  private teardownPeer(): void {
    this.dataChannel?.close(); this.peer?.close(); this.microphone?.getTracks().forEach((track) => track.stop());
    this.dataChannel = null; this.peer = null; this.microphone = null;
  }
}
