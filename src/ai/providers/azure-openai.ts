import type { ZodType } from 'zod';
import type {
  AudioResult,
  SpeechToTextProvider,
  TextModelProvider,
  TextRequest,
  TextResult,
  TextToSpeechProvider,
  TranscriptResult,
} from './types';
import type { AiUsageEvent } from './openai-compatible';

/** A provider error with a stable, non-sensitive error code for UI and telemetry. */
export type AzureErrorCode =
  | 'not_configured'
  | 'unauthorized'
  | 'forbidden'
  | 'rate_limited'
  | 'provider_unavailable'
  | 'timeout'
  | 'bad_response'
  | 'request_failed';

export class AzureProviderError extends Error {
  readonly provider = 'azure-openai';

  constructor(
    readonly code: AzureErrorCode,
    message: string,
    readonly status?: number,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'AzureProviderError';
  }
}

export interface AzureOpenAIOptions {
  endpoint?: string;
  apiKey?: string;
  deployments?: {
    text?: string;
    stt?: string;
    tts?: string;
  };
  apiVersion?: string;
  timeoutMs?: number;
  ttsVoice?: string;
  ttsFormat?: 'mp3' | 'wav' | 'opus' | 'pcm';
  maxTextLength?: number;
  maxAudioBytes?: number;
  providerName?: string;
  fetchImpl?: typeof fetch;
  beforeRequest?: (input: { taskType: string; model?: string }) => Promise<void>;
  usageSink?: (event: AiUsageEvent & { requestId?: string }) => Promise<void>;
}

const DEFAULT_API_VERSION = '2024-10-21';
const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_MAX_TEXT_LENGTH = 4_000;
const DEFAULT_MAX_AUDIO_BYTES = 12 * 1024 * 1024;

function endpointRoot(endpoint: string): string {
  // Azure resource endpoints may be supplied with a trailing slash (or with
  // `/openai` already appended). Normalize both forms to one canonical root.
  return endpoint.trim().replace(/\/+$/, '').replace(/\/openai$/i, '');
}

export function buildAzureOpenAIUrl(
  endpoint: string,
  deployment: string,
  operation: 'chat/completions' | 'audio/transcriptions' | 'audio/speech',
  apiVersion = DEFAULT_API_VERSION,
): string {
  if (!endpoint.trim() || !deployment.trim()) throw new AzureProviderError('not_configured', 'Azure OpenAI endpoint and deployment are required.');
  const url = new URL(`${endpointRoot(endpoint)}/openai/deployments/${encodeURIComponent(deployment.trim())}/${operation}`);
  url.searchParams.set('api-version', apiVersion);
  return url.toString();
}

/** Headers intentionally contain only the server-side API key; never log this object. */
export function buildAzureHeaders(apiKey: string, requestId?: string, json = true): Headers {
  const headers = new Headers();
  headers.set('api-key', apiKey);
  if (json) headers.set('content-type', 'application/json');
  if (requestId) headers.set('x-ms-client-request-id', requestId);
  return headers;
}

export function mapAzureStatus(status: number, requestId?: string): AzureProviderError {
  if (status === 401) return new AzureProviderError('unauthorized', 'Azure provider authentication failed.', status, requestId);
  if (status === 403) return new AzureProviderError('forbidden', 'Azure provider access was denied.', status, requestId);
  if (status === 429) return new AzureProviderError('rate_limited', 'Azure provider rate limit reached.', status, requestId);
  if (status >= 500) return new AzureProviderError('provider_unavailable', 'Azure provider is temporarily unavailable.', status, requestId);
  return new AzureProviderError('request_failed', 'Azure provider request failed.', status, requestId);
}

function responseRequestId(response: Response, fallback: string): string {
  return response.headers.get('x-request-id') ?? response.headers.get('x-ms-request-id') ?? fallback;
}

function configured(options: AzureOpenAIOptions, deployment: string | undefined): { endpoint: string; apiKey: string; deployment: string } {
  if (!options.endpoint || !options.apiKey || !deployment) throw new AzureProviderError('not_configured', 'Azure OpenAI is not configured.');
  return { endpoint: options.endpoint, apiKey: options.apiKey, deployment };
}

async function requestWithTimeout(
  fetchImpl: typeof fetch,
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new AzureProviderError('timeout', 'Azure provider request timed out.');
    if (error instanceof Error && error.name === 'AbortError') throw new AzureProviderError('timeout', 'Azure provider request timed out.');
    throw new AzureProviderError('request_failed', 'Azure provider request failed.');
  } finally {
    clearTimeout(timer);
  }
}

function parseUsage(payload: Record<string, unknown>): { input?: number; output?: number } {
  const usage = payload.usage;
  if (!usage || typeof usage !== 'object') return {};
  const value = usage as Record<string, unknown>;
  const input = typeof value.prompt_tokens === 'number' ? value.prompt_tokens : typeof value.input_tokens === 'number' ? value.input_tokens : undefined;
  const output = typeof value.completion_tokens === 'number' ? value.completion_tokens : typeof value.output_tokens === 'number' ? value.output_tokens : undefined;
  return { input, output };
}

export class AzureOpenAITextProvider implements TextModelProvider {
  private readonly options: AzureOpenAIOptions;
  constructor(options: AzureOpenAIOptions) { this.options = options; }

  async generateText(input: TextRequest): Promise<TextResult> {
    const config = configured(this.options, this.options.deployments?.text);
    const { endpoint, apiKey, deployment: model } = config;
    if (input.prompt.length > (this.options.maxTextLength ?? DEFAULT_MAX_TEXT_LENGTH)) throw new AzureProviderError('request_failed', 'Text input exceeds the Azure provider limit.');
    const started = Date.now();
    const requestId = crypto.randomUUID();
    const provider = this.options.providerName ?? 'azure-openai';
    await this.options.beforeRequest?.({ taskType: input.taskType, model });
    let usage: { input?: number; output?: number } = {};
    try {
      const response = await requestWithTimeout(this.options.fetchImpl ?? fetch, buildAzureOpenAIUrl(endpoint, model, 'chat/completions', this.options.apiVersion), {
        method: 'POST',
        headers: buildAzureHeaders(apiKey, requestId),
        body: JSON.stringify({ model, temperature: 0.3, messages: [{ role: 'system', content: input.system }, { role: 'user', content: input.prompt }] }),
      }, this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
      const providerRequestId = responseRequestId(response, requestId);
      if (!response.ok) throw mapAzureStatus(response.status, providerRequestId);
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== 'object') throw new AzureProviderError('bad_response', 'Azure provider returned an invalid response.', response.status, providerRequestId);
      const value = payload as { choices?: unknown; usage?: unknown };
      if (!Array.isArray(value.choices) || value.choices.length === 0) throw new AzureProviderError('bad_response', 'Azure provider returned no choices.', response.status, providerRequestId);
      const content = (value.choices[0] as { message?: { content?: unknown } } | undefined)?.message?.content;
      if (typeof content !== 'string' || !content.trim()) throw new AzureProviderError('bad_response', 'Azure provider returned no text.', response.status, providerRequestId);
      usage = parseUsage(value as Record<string, unknown>);
      const result: TextResult = { text: content, provider, model, latencyMs: Date.now() - started, inputTokens: usage.input, outputTokens: usage.output, requestId: providerRequestId };
      await this.options.usageSink?.({ taskType: input.taskType, provider, model, latencyMs: result.latencyMs, inputTokens: usage.input, outputTokens: usage.output, estimatedCost: 0, success: true, requestId: providerRequestId });
      return result;
    } catch (error) {
      const safeError = error instanceof AzureProviderError ? error : new AzureProviderError('request_failed', 'Azure provider request failed.', undefined, requestId);
      await this.options.usageSink?.({ taskType: input.taskType, provider, model, latencyMs: Date.now() - started, inputTokens: usage.input, outputTokens: usage.output, estimatedCost: 0, success: false, errorCode: safeError.code, requestId: safeError.requestId ?? requestId });
      throw safeError;
    }
  }

  async generateStructured<T>(input: TextRequest, schema: ZodType<T>): Promise<T> {
    const first = await this.generateText(input);
    try { return schema.parse(JSON.parse(first.text) as unknown); } catch {
      // One bounded repair attempt keeps structured workflows resilient without
      // allowing unbounded provider retries or leaking the original payload.
      const repaired = await this.generateText({
        ...input,
        system: `${input.system}\nReturn only valid JSON matching the requested schema. Repair the previous response; do not add commentary.`,
        prompt: `Previous response:\n${first.text.slice(0, 12000)}\n\n${input.prompt}`,
      });
      try { return schema.parse(JSON.parse(repaired.text) as unknown); } catch { throw new AzureProviderError('bad_response', 'Azure provider output failed schema validation.', undefined, repaired.requestId ?? first.requestId); }
    }
  }
}

export class AzureOpenAISttProvider implements SpeechToTextProvider {
  constructor(private readonly options: AzureOpenAIOptions) {}
  async transcribe(audio: ArrayBuffer, mimeType: string): Promise<TranscriptResult> {
    const config = configured(this.options, this.options.deployments?.stt);
    const { endpoint, apiKey, deployment: model } = config;
    if (audio.byteLength === 0 || audio.byteLength > (this.options.maxAudioBytes ?? DEFAULT_MAX_AUDIO_BYTES)) throw new AzureProviderError('request_failed', 'Audio input is empty or exceeds the Azure provider limit.');
    const started = Date.now(); const requestId = crypto.randomUUID(); const provider = this.options.providerName ?? 'azure-openai';
    await this.options.beforeRequest?.({ taskType: 'transcription', model });
    try {
      const form = new FormData();
      form.set('model', model);
      form.set('file', new File([audio], 'audio.webm', { type: mimeType || 'audio/webm' }));
      const response = await requestWithTimeout(this.options.fetchImpl ?? fetch, buildAzureOpenAIUrl(endpoint, model, 'audio/transcriptions', this.options.apiVersion), { method: 'POST', headers: buildAzureHeaders(apiKey, requestId, false), body: form }, this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
      const providerRequestId = responseRequestId(response, requestId);
      if (!response.ok) throw mapAzureStatus(response.status, providerRequestId);
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== 'object' || typeof (payload as { text?: unknown }).text !== 'string' || !(payload as { text: string }).text.trim()) throw new AzureProviderError('bad_response', 'Azure provider returned an invalid transcription.', response.status, providerRequestId);
      const data = payload as { text: string; duration?: unknown };
      const durationSeconds = typeof data.duration === 'number' && Number.isFinite(data.duration) ? data.duration : undefined;
      await this.options.usageSink?.({ taskType: 'transcription', provider, model, latencyMs: Date.now() - started, audioSeconds: durationSeconds, estimatedCost: 0, success: true, requestId: providerRequestId });
      return { text: data.text, provider, model, latencyMs: Date.now() - started, durationSeconds, requestId: providerRequestId };
    } catch (error) {
      const safeError = error instanceof AzureProviderError ? error : new AzureProviderError('request_failed', 'Azure provider request failed.', undefined, requestId);
      await this.options.usageSink?.({ taskType: 'transcription', provider, model, latencyMs: Date.now() - started, estimatedCost: 0, success: false, errorCode: safeError.code, requestId: safeError.requestId ?? requestId });
      throw safeError;
    }
  }
}

export class AzureOpenAITtsProvider implements TextToSpeechProvider {
  constructor(private readonly options: AzureOpenAIOptions) {}
  async synthesize(text: string): Promise<AudioResult> {
    const config = configured(this.options, this.options.deployments?.tts);
    const { endpoint, apiKey, deployment: model } = config;
    const normalized = text.trim();
    if (!normalized || normalized.length > (this.options.maxTextLength ?? DEFAULT_MAX_TEXT_LENGTH)) throw new AzureProviderError('request_failed', 'Text input is empty or exceeds the Azure provider limit.');
    const started = Date.now(); const requestId = crypto.randomUUID(); const provider = this.options.providerName ?? 'azure-openai';
    await this.options.beforeRequest?.({ taskType: 'speech_synthesis', model });
    try {
      const format = this.options.ttsFormat ?? 'mp3';
      const response = await requestWithTimeout(this.options.fetchImpl ?? fetch, buildAzureOpenAIUrl(endpoint, model, 'audio/speech', this.options.apiVersion), { method: 'POST', headers: buildAzureHeaders(apiKey, requestId), body: JSON.stringify({ model, voice: this.options.ttsVoice ?? 'alloy', input: normalized, response_format: format }) }, this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
      const providerRequestId = responseRequestId(response, requestId);
      if (!response.ok) throw mapAzureStatus(response.status, providerRequestId);
      const contentType = response.headers.get('content-type') ?? '';
      const audio = await response.arrayBuffer();
      if (audio.byteLength === 0 || audio.byteLength > (this.options.maxAudioBytes ?? DEFAULT_MAX_AUDIO_BYTES) || (!contentType.toLowerCase().startsWith('audio/') && !contentType.toLowerCase().includes('octet-stream'))) throw new AzureProviderError('bad_response', 'Azure provider returned invalid audio.', response.status, providerRequestId);
      const latencyMs = Date.now() - started;
      const result: AudioResult = { audio, contentType: contentType || `audio/${format}`, provider, model, latencyMs, requestId: providerRequestId };
      await this.options.usageSink?.({ taskType: 'speech_synthesis', provider, model, latencyMs, estimatedCost: 0, success: true, requestId: providerRequestId });
      return result;
    } catch (error) {
      const safeError = error instanceof AzureProviderError ? error : new AzureProviderError('request_failed', 'Azure provider request failed.', undefined, requestId);
      await this.options.usageSink?.({ taskType: 'speech_synthesis', provider, model, latencyMs: Date.now() - started, estimatedCost: 0, success: false, errorCode: safeError.code, requestId: safeError.requestId ?? requestId });
      throw safeError;
    }
  }
}

// Short aliases keep the adapter convenient for callers that do not need to
// repeat the Azure OpenAI product name, while the explicit class names above
// remain the canonical API.
export { AzureOpenAITextProvider as AzureTextProvider, AzureOpenAISttProvider as AzureSttProvider, AzureOpenAITtsProvider as AzureTtsProvider };
