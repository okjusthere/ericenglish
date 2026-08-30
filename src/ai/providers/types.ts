import type { ZodType } from 'zod';

export interface TextRequest { taskType: string; system: string; prompt: string; modelRole: 'daily_fast'|'evaluator_strong'|'content_generator'; sensitive?: boolean; }
export interface TextResult { text: string; provider: string; model: string; latencyMs: number; inputTokens?: number; outputTokens?: number; }
export interface TextModelProvider {
  generateText(input: TextRequest): Promise<TextResult>;
  generateStructured<T>(input: TextRequest, schema: ZodType<T>): Promise<T>;
}
export interface TranscriptResult { text: string; confidence?: number; durationSeconds?: number; provider: string; model: string; }
export interface SpeechToTextProvider { transcribe(audio: ArrayBuffer, mimeType: string): Promise<TranscriptResult>; }
export interface AudioResult { audio: ArrayBuffer; contentType: string; provider: string; model: string; }
export interface TextToSpeechProvider { synthesize(text: string): Promise<AudioResult | null>; }
export interface ProviderBundle { text: TextModelProvider; stt: SpeechToTextProvider; tts: TextToSpeechProvider; mode: string; }
