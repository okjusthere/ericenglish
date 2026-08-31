import { z } from 'zod';

export const ratingSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
export const dailyMinutesSchema = z.union([z.literal(30), z.literal(45), z.literal(60), z.literal(75), z.literal(90)]);
export const settingsSchema = z.object({
  dailyMinutes: dailyMinutesSchema.optional(),
  scaffoldingLevel: z.number().int().min(0).max(3).optional(),
  audioRetentionDays: z.number().int().min(0).max(365).optional(),
  dailyAiCallLimit: z.number().int().min(1).max(500).optional(),
  monthlyAiBudgetUsd: z.number().min(0).max(1000).optional(),
});
export const reviewAnswerSchema = z.object({
  response: z.string().max(2000).default(''),
  correct: z.boolean(),
  responseMs: z.number().int().min(0).max(3_600_000),
  hintLevel: z.number().int().min(0).max(3).default(0),
  rating: ratingSchema.optional(),
});
export const assessmentResponseSchema = z.object({
  itemId: z.string().min(1).max(100),
  section: z.enum(['receptive', 'active_recall', 'writing', 'speaking', 'listening']),
  responseText: z.string().max(10_000).optional(),
  responseMs: z.number().int().min(0).max(3_600_000).default(0),
  replayCount: z.number().int().min(0).max(20).default(0),
  hintLevel: z.number().int().min(0).max(3).default(0),
  correct: z.boolean().optional(),
  audioKey: z.string().max(500).optional(),
  pronunciation: z.record(z.string(), z.unknown()).optional(),
});
export const assessmentEvaluationSchema = z.object({
  writing: z.number().min(1).max(5), speaking: z.number().min(1).max(5), listening: z.number().min(1).max(5),
  grammar: z.number().min(1).max(5), naturalness: z.number().min(1).max(5),
  topRecurringErrors: z.array(z.string()).max(3), focus: z.array(z.string()).min(3).max(5),
  confidence: z.enum(['low','moderate','high']),
});
export const drillAnswerSchema = z.object({unitId:z.string().min(1).max(100),prompt:z.string().min(1).max(1000),response:z.string().min(1).max(3000),responseMs:z.number().int().min(0).max(300_000),variant:z.number().int().min(1).max(3),planItemId:z.string().max(160).optional()});
export const speakingSessionSchema = z.object({
  scenarioId: z.string().max(100).optional(),
  mode: z.enum(['fluency', 'drill', 'monologue', 'objection', 'phone', 'small_talk']).default('fluency'),
  title: z.string().min(1).max(160).default('Practice session'),
  planItemId: z.string().max(160).optional(),
});
export const speakingTurnSchema = z.object({
  text: z.string().min(1).max(6000),
  durationMs: z.number().int().min(0).max(1_800_000).optional(),
});
export const realtimeClientSecretSchema = z.object({
  sessionId: z.string().min(1).max(100),
  mode: z.enum(['fluency', 'drill', 'monologue', 'objection', 'phone', 'small_talk']),
  durationSeconds: z.number().int().min(1).max(900).default(300),
}).strict();
export const realtimeEventSchema = z.object({
  eventId: z.string().min(1).max(200),
  eventType: z.enum(['user_transcript', 'assistant_transcript', 'session_started', 'session_finished']),
  text: z.string().max(6000).optional(),
  durationMs: z.number().int().min(0).max(900_000).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
}).strict();
export const writingRequestSchema = z.object({
  taskType: z.enum(['text_30s', 'followup_2m', 'explanation_5m', 'custom']).default('custom'),
  prompt: z.string().min(1).max(2000),
  text: z.string().min(1).max(20_000),
});
export const captureSchema = z.object({
  captureType: z.enum(['new_expression', 'missed_phrase', 'message', 'call_review', 'quote']).default('new_expression'),
  text: z.string().min(1).max(20_000),
  context: z.string().max(2000).default(''),
  redactAddresses: z.boolean().default(false),
});
export const eventPrepSchema = z.object({ event: z.string().min(3).max(5000) });
export const eventPrepResultSchema = z.object({
  mustUseTerms:z.array(z.string().min(1).max(120)).min(3).max(5),
  recommendedOpening:z.string().min(10).max(600),
  likelyFollowUps:z.array(z.string().min(5).max(500)).min(3).max(5),
  possibleResponses:z.array(z.string().min(5).max(500)).min(2).max(4),
  cheatSheet:z.array(z.string().min(3).max(300)).min(4).max(8),
  followUpMessage:z.string().min(10).max(1200),
});
export const afterActionSchema = z.object({
  happened: z.string().min(1).max(5000),
  missedPhrase: z.string().max(2000).default(''),
  unfamiliarExpression: z.string().max(2000).default(''),
  createFollowUp: z.boolean().default(false),
});
export const confirmationSchema = z.object({ confirmation: z.literal('DELETE') });
export const personalExampleSchema = z.object({ text: z.string().min(3).max(2000) });
export const unitCompleteSchema = z.object({ planItemId:z.string().max(160).optional(), targetIndex:z.number().int().min(0).max(20).optional() });

export const correctionSchema = z.object({
  original: z.string(), improved: z.string(), reason: z.string(),
  category: z.enum(['article', 'tense', 'agreement', 'countability', 'preposition', 'word_order', 'collocation', 'vocabulary_precision', 'pragmatics', 'redundancy', 'chinese_transfer', 'intelligibility']),
  severity: z.enum(['low', 'medium', 'high']),
});
export const speakingEvaluationSchema = z.object({
  taskCompletion: z.number().min(1).max(5), clarity: z.number().min(1).max(5), grammar: z.number().min(1).max(5),
  lexicalRange: z.number().min(1).max(5), naturalness: z.number().min(1).max(5), pragmatics: z.number().min(1).max(5), fluency: z.number().min(1).max(5),
  summary: z.string(), priorityCorrections: z.array(correctionSchema).max(3), successfulTargetUnits: z.array(z.string()), missedTargetUnits: z.array(z.string()), newCandidateUnits: z.array(z.string()),
});
export const writingEvaluationSchema = z.object({
  correct: z.string(), natural: z.string(), polished: z.string(),
  reasons: z.array(z.string()).min(1).max(3), phraseUpgrades: z.array(z.string()).max(5), corrections: z.array(correctionSchema).max(3),
});
export const captureExtractionSchema = z.object({
  naturalRewrite: z.string(), units: z.array(z.object({ term: z.string(), definition: z.string(), worthReviewing: z.boolean() })).max(5), errors: z.array(correctionSchema).max(3),
});
export const weeklyNarrativeSchema = z.object({ learned: z.string(), recognitionOnly: z.string(), recurringErrors: z.string(), speakingChange: z.string(), nextWeek: z.string() });
export const generatedUnitSchema = z.object({ term:z.string().min(1).max(120),unitType:z.enum(['word','collocation','phrase','sentence_frame','grammar_pattern']),cefr:z.enum(['A2','B1','B2','C1','C2','unknown']),register:z.enum(['neutral','formal','informal','business','spoken']),domains:z.array(z.string()).min(1).max(5),definitionEn:z.string().min(5).max(300),definitionZh:z.string().max(120).optional(),collocations:z.array(z.string()).min(2).max(4),examples:z.array(z.string()).min(3).max(4),confusion:z.string().max(300) });
export const lessonBatchSchema = z.object({units:z.array(generatedUnitSchema).min(1).max(30)});
