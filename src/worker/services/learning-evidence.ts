import { emptyFsrsCard } from '../../learning/fsrs';
import { transitionMastery } from '../../learning/mastery';
import { SINGLE_USER_ID } from '../../shared/constants';

export type EvidenceDimension = 'recognition' | 'recall' | 'production' | 'transfer';

export interface LearningEvidenceInput {
  unitId: string;
  source: string;
  dimension: EvidenceDimension;
  score: number;
  verified: boolean;
  responseText?: string;
  responseMs?: number;
  sessionId?: string;
  metadata?: Record<string, unknown>;
  activateCards?: boolean;
}

interface UnitStateRow {
  recognition_score: number;
  recall_score: number;
  production_score: number;
  transfer_score: number;
  last_lapse_at: string | null;
}

interface EvidenceRow {
  dimension: EvidenceDimension;
  score: number;
  verified: number;
  source: string;
  created_at: string;
}

const CARD_STAGES = [
  { type: 'recognition', delayDays: 0 },
  { type: 'active_recall', delayDays: 1 },
  { type: 'cloze', delayDays: 2 },
  { type: 'listening_recall', delayDays: 3 },
] as const;

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const sourceWeight = (source: string) => source === 'assessment' ? 1.15 : source === 'speaking' || source === 'writing' ? 1.1 : source === 'mission' ? 0.75 : 1;

export function normalizedText(value: string) {
  return value.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

export function responseContainsUnit(response: string, term: string) {
  const haystack = ` ${normalizedText(response)} `;
  const needle = normalizedText(term);
  return needle.length >= 3 && haystack.includes(` ${needle} `);
}

async function ensureCard(db: D1Database, unitId: string, cardType: string, delayDays: number) {
  const due = new Date(Date.now() + delayDays * 86_400_000);
  const card = emptyFsrsCard(due);
  const id = `card-${unitId}-${cardType}`;
  await db.prepare(`INSERT INTO review_cards(
    id,user_id,unit_id,card_type,state,due_at,stability,difficulty,elapsed_days,
    scheduled_days,learning_steps,reps,lapses,last_review_at,fsrs_json,active,activated_at
  ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
  ON CONFLICT(user_id,unit_id,card_type) DO UPDATE SET
    active=1,
    activated_at=COALESCE(review_cards.activated_at,CURRENT_TIMESTAMP),
    due_at=CASE WHEN review_cards.reps=0 THEN MIN(review_cards.due_at,excluded.due_at) ELSE review_cards.due_at END`).bind(
      id, SINGLE_USER_ID, unitId, cardType, card.state, card.due.toISOString(), card.stability,
      card.difficulty, card.elapsed_days, card.scheduled_days, card.learning_steps, card.reps,
      card.lapses, null, JSON.stringify(card), 1,
    ).run();
}

export async function activateCardsForState(db: D1Database, unitId: string, scores: Record<EvidenceDimension, number>) {
  let stage = 1;
  if (scores.recognition >= 70) stage = 2;
  if (scores.recall >= 65) stage = 3;
  if (scores.production >= 55) stage = 4;
  for (const card of CARD_STAGES.slice(0, stage)) await ensureCard(db, unitId, card.type, card.delayDays);
}

function aggregateDimension(rows: EvidenceRow[], dimension: EvidenceDimension, fallback: number) {
  const selected = rows.filter((row) => row.dimension === dimension).slice(0, 30);
  if (!selected.length) return fallback;
  const now = Date.now();
  let weighted = 0;
  let totalWeight = 0;
  selected.forEach((row, index) => {
    const ageDays = Math.max(0, (now - new Date(row.created_at).getTime()) / 86_400_000);
    const recency = Math.max(0.35, Math.exp(-ageDays / 45));
    const verification = row.verified ? 1 : 0.35;
    const sequence = Math.max(0.5, 1 - index * 0.025);
    const weight = recency * verification * sequence * sourceWeight(row.source);
    weighted += Number(row.score) * weight;
    totalWeight += weight;
  });
  return clamp(weighted / Math.max(totalWeight, 0.001));
}

export async function recordLearningEvidence(db: D1Database, input: LearningEvidenceInput) {
  const state = await db.prepare(`SELECT recognition_score,recall_score,production_score,transfer_score,last_lapse_at
    FROM user_unit_states WHERE user_id=? AND unit_id=?`).bind(SINGLE_USER_ID, input.unitId).first<UnitStateRow>();
  if (!state) throw new Error('Learning unit state not found.');

  const score = clamp(input.score);
  const createdAt = new Date().toISOString();
  const lapseAt = input.verified && score < 50 ? createdAt : state.last_lapse_at;
  await db.prepare(`INSERT INTO learning_evidence(
    id,user_id,unit_id,source,dimension,score,verified,response_text,response_ms,session_id,metadata_json,created_at
  ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
    crypto.randomUUID(), SINGLE_USER_ID, input.unitId, input.source, input.dimension, score,
    input.verified ? 1 : 0, input.responseText?.slice(0, 6000) ?? null, input.responseMs ?? null,
    input.sessionId ?? null, JSON.stringify(input.metadata ?? {}), createdAt,
  ).run();

  const evidence = await db.prepare(`SELECT dimension,score,verified,source,created_at FROM learning_evidence
    WHERE user_id=? AND unit_id=? ORDER BY created_at DESC LIMIT 120`).bind(SINGLE_USER_ID, input.unitId).all<EvidenceRow>();
  const scores: Record<EvidenceDimension, number> = {
    recognition: aggregateDimension(evidence.results, 'recognition', Number(state.recognition_score)),
    recall: aggregateDimension(evidence.results, 'recall', Number(state.recall_score)),
    production: aggregateDimension(evidence.results, 'production', Number(state.production_score)),
    transfer: aggregateDimension(evidence.results, 'transfer', Number(state.transfer_score)),
  };

  const counters = await db.prepare(`SELECT
    SUM(CASE WHEN dimension='recall' AND verified=1 AND score>=70 AND created_at>=datetime('now','-14 days') THEN 1 ELSE 0 END) recent_recall,
    SUM(CASE WHEN dimension='production' AND verified=1 AND score>=65 THEN 1 ELSE 0 END) free_uses,
    SUM(CASE WHEN dimension='transfer' AND verified=1 AND score>=65 THEN 1 ELSE 0 END) real_uses,
    SUM(CASE WHEN verified=1 AND score<50 THEN 1 ELSE 0 END) lapse_count
    FROM learning_evidence WHERE user_id=? AND unit_id=?`).bind(SINGLE_USER_ID, input.unitId).first<Record<string, number>>();
  const daysSinceLapse = lapseAt ? Math.max(0, Math.floor((Date.now() - new Date(lapseAt).getTime()) / 86_400_000)) : 999;
  const status = transitionMastery({
    ...scores,
    recentActiveCorrect: Number(counters?.recent_recall ?? 0),
    freeUses: Number(counters?.free_uses ?? 0),
    realUses: Number(counters?.real_uses ?? 0),
    lapses: Number(counters?.lapse_count ?? 0),
    daysSinceLapse,
  });

  await db.prepare(`UPDATE user_unit_states SET
    status=?,recognition_score=?,recall_score=?,production_score=?,transfer_score=?,
    successful_free_uses=?,successful_real_world_uses=?,lapses=?,last_lapse_at=?,
    exposures=exposures+1,avg_response_ms=CASE WHEN ? IS NULL THEN avg_response_ms WHEN exposures=0 THEN ? ELSE (avg_response_ms*exposures+?)/(exposures+1) END,
    last_seen_at=CURRENT_TIMESTAMP,last_success_at=CASE WHEN ? >= 65 THEN CURRENT_TIMESTAMP ELSE last_success_at END,
    updated_at=CURRENT_TIMESTAMP
    WHERE user_id=? AND unit_id=?`).bind(
      status, scores.recognition, scores.recall, scores.production, scores.transfer,
      Number(counters?.free_uses ?? 0), Number(counters?.real_uses ?? 0), Number(counters?.lapse_count ?? 0), lapseAt,
      input.responseMs ?? null, input.responseMs ?? null, input.responseMs ?? null, score,
      SINGLE_USER_ID, input.unitId,
    ).run();
  if (input.activateCards !== false) await activateCardsForState(db, input.unitId, scores);
  return { status, scores, daysSinceLapse };
}

export async function recordTextEvidenceForMatches(
  db: D1Database,
  input: { source: string; dimension: 'production' | 'transfer'; text: string; score?: number; verified?: boolean; sessionId?: string },
) {
  const units = await db.prepare(`SELECT u.id,u.term FROM learning_units u
    JOIN user_unit_states s ON s.unit_id=u.id AND s.user_id=?
    WHERE u.active=1 AND s.status<>'unseen' ORDER BY COALESCE(s.priority_override,u.priority) DESC LIMIT 400`).bind(SINGLE_USER_ID).all<{id:string;term:string}>();
  const matches = units.results.filter((unit) => responseContainsUnit(input.text, unit.term));
  for (const unit of matches) await recordLearningEvidence(db, {
    unitId: unit.id,
    source: input.source,
    dimension: input.dimension,
    score: input.score ?? 75,
    verified: input.verified ?? true,
    responseText: input.text,
    sessionId: input.sessionId,
  });
  return matches.map((unit) => unit.id);
}

export async function recordSpeakingEvaluationEvidence(
  db: D1Database,
  sessionId: string,
  targets: string[],
  evaluation: { successfulTargetUnits: string[]; missedTargetUnits: string[] },
) {
  const successful = new Set(evaluation.successfulTargetUnits.map(normalizedText));
  const missed = new Set(evaluation.missedTargetUnits.map(normalizedText));
  const results: Array<{unitId:string;target:string;score:number}> = [];
  for (const target of targets) {
    const normalized = normalizedText(target);
    const unit = await db.prepare(`SELECT id,term FROM learning_units
      WHERE normalized_term=? OR LOWER(term)=LOWER(?) LIMIT 1`).bind(normalized, target).first<{id:string;term:string}>();
    if (!unit) continue;
    const wasSuccessful = successful.has(normalized) || successful.has(normalizedText(unit.term));
    const wasMissed = missed.has(normalized) || missed.has(normalizedText(unit.term));
    const score = wasSuccessful ? 88 : wasMissed ? 25 : 45;
    await recordLearningEvidence(db, {
      unitId: unit.id,
      source: 'speaking',
      dimension: 'production',
      score,
      verified: true,
      sessionId,
      metadata: { target, successful: wasSuccessful, explicitlyMissed: wasMissed },
    });
    results.push({ unitId: unit.id, target, score });
  }
  return results;
}
