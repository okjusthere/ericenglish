import { z } from 'zod';

export const pronunciationResultSchema = z.object({
  text: z.string(), accuracyScore: z.number().min(0).max(100), fluencyScore: z.number().min(0).max(100),
  prosodyScore: z.number().min(0).max(100).optional(), pronunciationScore: z.number().min(0).max(100),
  words: z.array(z.object({ word: z.string(), accuracyScore: z.number().min(0).max(100), errorType: z.string().optional(), phonemes: z.array(z.object({ phoneme: z.string(), accuracyScore: z.number().min(0).max(100) })).optional() })).max(600),
});
export type PronunciationResult = z.infer<typeof pronunciationResultSchema>;
const clean = (value: unknown) => typeof value === 'string' ? value.trim() : '';

export async function assessPronunciation(env: Env, audio: ArrayBuffer, mimeType: string, referenceText: string): Promise<PronunciationResult> {
  if (env.PRONUNCIATION_ASSESSMENT_ENABLED !== 'true' && env.PRONUNCIATION_ASSESSMENT_ENABLED !== '1') throw new Error('Pronunciation assessment is disabled.');
  const endpoint = clean(env.AZURE_SPEECH_ENDPOINT), key = clean(env.AZURE_SPEECH_KEY);
  if (!endpoint || !key) throw new Error('Pronunciation assessment is not configured.');
  if (!audio.byteLength || audio.byteLength > 12 * 1024 * 1024) throw new Error('Audio input is empty or too large.');
  const url = new URL(endpoint); url.searchParams.set('language', 'en-US'); url.searchParams.set('format', 'detailed');
  const assessment = btoa(JSON.stringify({ ReferenceText: referenceText.slice(0, 2000), GradingSystem: 'HundredMark', Granularity: 'Phoneme', Dimension: 'Comprehensive', EnableMiscue: true, EnableProsodyAssessment: true }));
  const response = await fetch(url, { method: 'POST', headers: { 'Ocp-Apim-Subscription-Key': key, 'Pronunciation-Assessment': assessment, 'Content-Type': mimeType || 'audio/webm', Accept: 'application/json' }, body: audio });
  if (!response.ok) throw new Error(`Pronunciation provider request failed (${response.status}).`);
  const raw = await response.json() as Record<string, unknown>; const nbest = (Array.isArray(raw.NBest) ? raw.NBest[0] : raw) as Record<string, unknown>; const scores = (nbest.PronunciationAssessment ?? {}) as Record<string, unknown>;
  const words = (Array.isArray(nbest.Words) ? nbest.Words : []).map((entry) => { const word = entry as Record<string, unknown>; const pa = (word.PronunciationAssessment ?? {}) as Record<string, unknown>; const phonemes = (Array.isArray(word.Phonemes) ? word.Phonemes : []).map((item) => { const phoneme = item as Record<string, unknown>; const ppa = (phoneme.PronunciationAssessment ?? {}) as Record<string, unknown>; return { phoneme: clean(phoneme.Phoneme), accuracyScore: Number(ppa.AccuracyScore ?? 0) }; }); return { word: clean(word.Word), accuracyScore: Number(pa.AccuracyScore ?? 0), errorType: clean(pa.ErrorType) || undefined, phonemes }; }).filter((item) => item.word);
  return pronunciationResultSchema.parse({ text: clean(nbest.Display) || referenceText, accuracyScore: Number(scores.AccuracyScore ?? 0), fluencyScore: Number(scores.FluencyScore ?? 0), prosodyScore: Number(scores.ProsodyScore ?? 0), pronunciationScore: Number(scores.PronunciationScore ?? 0), words });
}
