export type AzureRealtimeErrorCode = 'configuration' | 'timeout' | 'unauthorized' | 'forbidden' | 'rate_limited' | 'provider_unavailable' | 'provider_error';

export class AzureRealtimeError extends Error {
  constructor(readonly code: AzureRealtimeErrorCode, message: string, readonly status?: number) {
    super(message);
    this.name = 'AzureRealtimeError';
  }
}

export interface AzureRealtimeClientSecret {
  value: string;
  expiresAt: number | null;
}

export interface AzureRealtimeConfig {
  endpoint?: string;
  deployment?: string;
  apiKey?: string;
  timeoutMs?: number;
}

export function azureRealtimeClientSecretUrl(endpoint: string): string {
  const base = endpoint.trim().replace(/\/+$/, '').replace(/\/openai(?:\/v1)?$/, '');
  return `${base}/openai/v1/realtime/client_secrets`;
}

function mapStatus(status: number): AzureRealtimeErrorCode {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'provider_unavailable';
  return 'provider_error';
}

export async function mintAzureRealtimeClientSecret(
  config: AzureRealtimeConfig,
  session: { mode: string; durationSeconds: number; instructions: string },
  fetchImpl: typeof fetch = fetch,
): Promise<AzureRealtimeClientSecret> {
  if (!config.endpoint || !config.deployment || !config.apiKey) {
    throw new AzureRealtimeError('configuration', 'Realtime provider is not configured.');
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs ?? 8_000);
  try {
    const response = await fetchImpl(azureRealtimeClientSecretUrl(config.endpoint), {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'api-key': config.apiKey },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: config.deployment,
          instructions: session.instructions,
          audio: { output: { voice: 'alloy', speed: 0.92 } },
        },
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new AzureRealtimeError(mapStatus(response.status), 'Realtime provider request failed.', response.status);
    const data = await response.json() as { value?: unknown; client_secret?: { value?: unknown; expires_at?: unknown }; expires_at?: unknown };
    const value = typeof data.value === 'string' ? data.value : typeof data.client_secret?.value === 'string' ? data.client_secret.value : null;
    if (!value) throw new AzureRealtimeError('provider_error', 'Realtime provider returned an invalid token.');
    const expiresRaw = data.expires_at ?? data.client_secret?.expires_at;
    const expiresAt = typeof expiresRaw === 'number' ? expiresRaw : null;
    return { value, expiresAt };
  } catch (error) {
    if (error instanceof AzureRealtimeError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') throw new AzureRealtimeError('timeout', 'Realtime provider timed out.');
    throw new AzureRealtimeError('provider_error', 'Realtime provider request failed.');
  } finally {
    clearTimeout(timeout);
  }
}
