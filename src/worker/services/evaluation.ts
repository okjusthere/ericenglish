import speakingPrompt from '../../ai/prompts/scenario-evaluator.md?raw';
import writingPrompt from '../../ai/prompts/writing-coach.md?raw';
import capturePrompt from '../../ai/prompts/unit-extractor.md?raw';
import { createProviders } from '../../ai/providers';
import { captureExtractionSchema, speakingEvaluationSchema, writingEvaluationSchema } from '../../shared/schemas';
import { emptyFsrsCard } from '../../learning/fsrs';

export async function evaluateSpeaking(env:Env,transcript:string,targetUnits:string[]){return createProviders(env).text.generateStructured({taskType:'speaking',system:speakingPrompt,prompt:`Transcript:\n${transcript}\nTarget units: ${targetUnits.join(', ')}`,modelRole:'evaluator_strong',sensitive:true},speakingEvaluationSchema);}
export async function evaluateWriting(env:Env,prompt:string,text:string){return createProviders(env).text.generateStructured({taskType:'writing',system:writingPrompt,prompt:`Task: ${prompt}\nLearner draft:\n${text}`,modelRole:'daily_fast',sensitive:true},writingEvaluationSchema);}
export async function extractCapture(env:Env,text:string,context:string){return createProviders(env).text.generateStructured({taskType:'capture',system:capturePrompt,prompt:`Context: ${context}\nRedacted capture:\n${text}`,modelRole:'daily_fast',sensitive:true},captureExtractionSchema);}

export async function persistCorrections(db:D1Database,sourceType:string,sourceId:string,corrections:Array<{original:string;improved:string;reason:string;category:string;severity:string}>){
  for(const item of corrections){const normalized=item.category;const id=crypto.randomUUID();await db.batch([
    db.prepare(`INSERT INTO feedback_items(id,user_id,source_type,source_id,category,severity,original_text,improved_text,explanation) VALUES(?,'primary',?,?,?,?,?,?,?)`).bind(id,sourceType,sourceId,item.category,item.severity,item.original,item.improved,item.reason),
    db.prepare(`INSERT INTO error_patterns(id,user_id,category,normalized_pattern,description,count_total,count_30d,impact_score,examples_json) VALUES(?,'primary',?,?,?,?,?,?,?) ON CONFLICT(user_id,category,normalized_pattern) DO UPDATE SET count_total=count_total+1,count_30d=count_30d+1,last_seen_at=CURRENT_TIMESTAMP,examples_json=excluded.examples_json`).bind(crypto.randomUUID(),item.category,normalized,item.reason,1,1,item.severity==='high'?1:item.severity==='medium'?0.65:0.35,JSON.stringify([{original:item.original,improved:item.improved}]))
  ]);}
}

export async function persistCandidateUnits(db:D1Database,candidates:Array<{term:string;definition:string;worthReviewing?:boolean}>,source='user_capture'){
  const ids:string[]=[];
  for(const candidate of candidates.filter((item)=>item.worthReviewing!==false)){
    const normalized=candidate.term.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();if(!normalized)continue;
    const existing=await db.prepare('SELECT id FROM learning_units WHERE normalized_term=?').bind(normalized).first<{id:string}>();const unitId=existing?.id??crypto.randomUUID();
    await db.prepare(`INSERT OR IGNORE INTO learning_units(id,unit_type,term,normalized_term,cefr,priority,register,domains_json,definition_en,collocations_json,examples_json,confusions_json,source) VALUES(?,'phrase',?,?,'B2',0.9,'business','["personal"]',?,'[]','[]','[]',?)`).bind(unitId,candidate.term,normalized,candidate.definition,source).run();
    await db.prepare(`INSERT OR IGNORE INTO user_unit_states(user_id,unit_id,status,priority_override) VALUES('primary',?,'introduced',0.95)`).bind(unitId).run();
    for(const cardType of ['recognition','active_recall','cloze','listening_recall']){const card=emptyFsrsCard(new Date());await db.prepare(`INSERT OR IGNORE INTO review_cards(id,user_id,unit_id,card_type,state,due_at,stability,difficulty,elapsed_days,scheduled_days,learning_steps,reps,lapses,last_review_at,fsrs_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(`card-${unitId}-${cardType}`,'primary',unitId,cardType,card.state,card.due.toISOString(),card.stability,card.difficulty,card.elapsed_days,card.scheduled_days,card.learning_steps,card.reps,card.lapses,null,JSON.stringify(card)).run();}
    ids.push(unitId);
  }
  return ids;
}
