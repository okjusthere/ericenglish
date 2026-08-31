import unitsRaw from '../../../seed/core-units.jsonl?raw';
import scenariosRaw from '../../../seed/scenarios.jsonl?raw';
import baseline from '../../../seed/personal-baseline.json';
import { allocatePlan, newUnitLimit, priorityScore } from '../../learning/planner';
import { SINGLE_USER_ID } from '../../shared/constants';

type JsonRecord = Record<string, unknown>;
const parseLines = (raw:string):JsonRecord[] => raw.trim().split('\n').map((line)=>JSON.parse(line) as JsonRecord);
const units=parseLines(unitsRaw); const scenarios=parseLines(scenariosRaw);
export const json = <T>(value:string|null|undefined,fallback:T):T => {try{return value ? JSON.parse(value) as T : fallback;}catch{return fallback;}};
export const localDate=(timezone:string,at=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(at);
export const nowIso=()=>new Date().toISOString();

async function batches(db:D1Database,statements:D1PreparedStatement[],size=50){for(let i=0;i<statements.length;i+=size)await db.batch(statements.slice(i,i+size));}

export async function bootstrapDatabase(db:D1Database):Promise<{units:number;scenarios:number;alreadyBootstrapped:boolean}> {
  const exists=await db.prepare('SELECT id FROM users WHERE id=?').bind(SINGLE_USER_ID).first<{id:string}>();
  await db.batch([
    db.prepare('INSERT OR IGNORE INTO users(id,display_name,timezone) VALUES(?,?,?)').bind(SINGLE_USER_ID,baseline.displayName,baseline.timezone),
    db.prepare(`INSERT OR IGNORE INTO learner_profiles(user_id,working_cefr,target_cefr,support_language,daily_minutes,weekly_days,goals_json,strengths_json,weaknesses_json,scaffolding_level) VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(SINGLE_USER_ID,baseline.workingLevel,baseline.target,baseline.supportLanguage,baseline.dailyMinutes,baseline.weeklyDays,JSON.stringify(baseline.priorityContexts),JSON.stringify(baseline.strengths),JSON.stringify(baseline.weaknesses),2),
    db.prepare('INSERT OR IGNORE INTO app_settings(key,value_json) VALUES(?,?)').bind('mastery_thresholds',JSON.stringify({recognizable:70,recallable:70,productive:60,mastered:{recognition:85,recall:80,production:70}})),
    db.prepare('INSERT OR IGNORE INTO app_settings(key,value_json) VALUES(?,?)').bind('budget',JSON.stringify({dailyAiCallLimit:60,dailyAudioMinuteSoftLimit:30,monthlyEstimatedCostAlert:25,strongModelCallsPerDay:6})),
  ]);
  const unitStatements:D1PreparedStatement[]=[];
  for(const unit of units){
    unitStatements.push(db.prepare(`INSERT INTO learning_units(id,unit_type,term,normalized_term,lemma,part_of_speech,ipa,cefr,priority,register,domains_json,definition_en,definition_zh,collocations_json,examples_json,confusions_json,source,content_version,active) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET unit_type=excluded.unit_type,term=excluded.term,normalized_term=excluded.normalized_term,lemma=excluded.lemma,part_of_speech=excluded.part_of_speech,ipa=excluded.ipa,cefr=excluded.cefr,priority=excluded.priority,register=excluded.register,domains_json=excluded.domains_json,definition_en=excluded.definition_en,definition_zh=excluded.definition_zh,collocations_json=excluded.collocations_json,examples_json=excluded.examples_json,confusions_json=excluded.confusions_json,source=excluded.source,content_version=excluded.content_version,active=excluded.active`).bind(unit.id,unit.unitType,unit.term,unit.normalizedTerm,unit.lemma,unit.partOfSpeech,unit.ipa,unit.cefr,unit.priority,unit.register,JSON.stringify(unit.domains),unit.definitionEn,unit.definitionZh,JSON.stringify(unit.collocations),JSON.stringify(unit.examples),JSON.stringify(unit.confusions),unit.source,unit.contentVersion,unit.active?1:0));
    unitStatements.push(db.prepare('INSERT OR IGNORE INTO user_unit_states(user_id,unit_id) VALUES(?,?)').bind(SINGLE_USER_ID,unit.id));
  }
  await batches(db,unitStatements);
  const scenarioStatements=scenarios.map((scenario)=>db.prepare(`INSERT INTO scenarios(id,title,domain,difficulty,ai_role,user_objective,target_units_json,hidden_complication,max_turns,rubric_json,completion_condition,source,active) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,domain=excluded.domain,difficulty=excluded.difficulty,ai_role=excluded.ai_role,user_objective=excluded.user_objective,target_units_json=excluded.target_units_json,hidden_complication=excluded.hidden_complication,max_turns=excluded.max_turns,rubric_json=excluded.rubric_json,completion_condition=excluded.completion_condition,source=excluded.source,active=excluded.active`).bind(scenario.id,scenario.title,scenario.domain,scenario.difficulty,scenario.aiRole,scenario.userObjective,JSON.stringify(scenario.targetUnits),scenario.hiddenComplication,scenario.maxTurns,JSON.stringify(scenario.rubric),scenario.completionCondition,scenario.source,scenario.active?1:0));
  await batches(db,scenarioStatements);
  await ensureTodayPlan(db,baseline.timezone,baseline.dailyMinutes);
  return{units:units.length,scenarios:scenarios.length,alreadyBootstrapped:Boolean(exists)};
}

export async function ensureTodayPlan(db:D1Database,timezone:string,targetMinutes:number){
  const date=localDate(timezone); const existing=await db.prepare('SELECT * FROM daily_plans WHERE user_id=? AND local_date=?').bind(SINGLE_USER_ID,date).first();
  if(existing)return existing;
  const due=await db.prepare('SELECT COUNT(*) count FROM review_cards WHERE user_id=? AND active=1 AND due_at<=?').bind(SINGLE_USER_ID,nowIso()).first<{count:number}>();
  const completion=await db.prepare(`SELECT p.local_date,
    CASE WHEN COUNT(i.id)=0 THEN 0 ELSE AVG(CASE WHEN i.status='complete' THEN 1.0 ELSE 0 END) END rate
    FROM daily_plans p LEFT JOIN daily_plan_items i ON i.plan_id=p.id
    WHERE p.user_id=? AND p.local_date<? GROUP BY p.id ORDER BY p.local_date DESC LIMIT 7`).bind(SINGLE_USER_ID,date).all<{rate:number}>();
  const recentAccuracy=await db.prepare(`SELECT AVG(correct) accuracy FROM review_events
    WHERE reviewed_at>=datetime('now','-14 days')`).first<{accuracy:number|null}>();
  const candidates=await db.prepare(`SELECT u.id,u.term,u.cefr,u.priority,u.domains_json,s.priority_override,s.recall_score,s.production_score,s.transfer_score,
    (SELECT COUNT(*) FROM learning_evidence e WHERE e.user_id=s.user_id AND e.unit_id=u.id AND e.score<65 AND e.created_at>=datetime('now','-30 days')) recent_errors
    FROM learning_units u JOIN user_unit_states s ON s.unit_id=u.id
    WHERE s.user_id=? AND s.status='unseen' AND s.suspended=0 AND u.active=1 LIMIT 240`).bind(SINGLE_USER_ID).all<Record<string,unknown>>();
  const preparedEvents=await db.prepare(`SELECT prep_json FROM event_preps WHERE user_id=? AND status='prepared' AND created_at>=datetime('now','-30 days') ORDER BY created_at DESC LIMIT 5`).bind(SINGLE_USER_ID).all<{prep_json:string}>();
  const eventTargets=new Set<string>();
  for(const row of preparedEvents.results){const prep=json<{mustUse?:Array<{id:string}>}>(row.prep_json,{});for(const unit of prep.mustUse??[])eventTargets.add(unit.id);}
  const targets=candidates.results.map((row)=>{const personal=Math.max(Number(row.priority_override??row.priority??0),eventTargets.has(String(row.id))?1:0);return{id:String(row.id),term:String(row.term),adaptive_score:priorityScore({dueUrgency:0,activeGap:Math.max(0,(Number(row.recall_score)-Number(row.production_score))/100),personalRelevance:personal,errorRecurrence:Math.min(1,Number(row.recent_errors)/3),transferNeed:1-Number(row.transfer_score)/100,curriculumBalance:['B1','B2'].includes(String(row.cefr))?1:0.5}),eventRelevant:eventTargets.has(String(row.id))};}).sort((a,b)=>b.adaptive_score-a.adaptive_score||Number(b.eventRelevant)-Number(a.eventRelevant)||a.id.localeCompare(b.id));
  const completionRates=completion.results.reverse().map((row)=>Number(row.rate));
  const targetUnits=targets.slice(0,newUnitLimit({dueCount:due?.count??0,completionRates,stableAccuracy:Number(recentAccuracy?.accuracy??0)>=0.8}));
  const missionId=`mission-${date}`; const mission=`Use “${targetUnits[0]?.term??'clarify'}” once in a real conversation today.`;
  await db.prepare('INSERT OR IGNORE INTO missions(id,user_id,local_date,mission_text,target_units_json) VALUES(?,?,?,?,?)').bind(missionId,SINGLE_USER_ID,date,mission,JSON.stringify(targetUnits.slice(0,1).map((u)=>u.id))).run();
  const planId=`plan-${date}`; const allowed=[30,45,60,75,90] as const; const minutes=allowed.includes(targetMinutes as typeof allowed[number])?targetMinutes:60;
  await db.prepare(`INSERT OR IGNORE INTO daily_plans(id,user_id,local_date,target_minutes,focus_summary,target_units_json,mission_id,generated_reason) VALUES(?,?,?,?,?,?,?,?)`).bind(planId,SINGLE_USER_ID,date,minutes,'Turn precise phrases into fast, natural output.',JSON.stringify(targetUnits.map((u)=>u.id)),missionId,`Due backlog: ${due?.count??0}; adaptive priority uses recall-production gap, relevance, recent errors, transfer need, curriculum balance, completion rate, and ${eventTargets.size} upcoming-event targets.`).run();
  const items=allocatePlan(minutes as 30|45|60|75|90,due?.count??0);
  await db.batch(items.map((item,index)=>db.prepare(`INSERT OR IGNORE INTO daily_plan_items(id,plan_id,item_type,sequence,estimated_minutes,payload_json) VALUES(?,?,?,?,?,?)`).bind(`${planId}-${item.type}`,planId,item.type,index+1,item.minutes,JSON.stringify({label:item.label,targetUnits:targetUnits.map((u)=>u.id)}))));
  return db.prepare('SELECT * FROM daily_plans WHERE id=?').bind(planId).first();
}

export async function getToday(db:D1Database,timezone:string,targetMinutes:number){const plan=await ensureTodayPlan(db,timezone,targetMinutes);if(!plan)throw new Error('Unable to create today plan');const items=await db.prepare('SELECT * FROM daily_plan_items WHERE plan_id=? ORDER BY sequence').bind(String(plan.id)).all();const mission=plan.mission_id?await db.prepare('SELECT * FROM missions WHERE id=?').bind(plan.mission_id).first():null;const targets=json<string[]>(String(plan.target_units_json),[]);const targetRows=targets.length?await db.prepare(`SELECT id,term,definition_en FROM learning_units WHERE id IN (${targets.map(()=>'?').join(',')}) ORDER BY CASE id ${targets.map((_,index)=>`WHEN ? THEN ${index}`).join(' ')} END`).bind(...targets,...targets).all():{results:[]};const due=await db.prepare('SELECT COUNT(*) count FROM review_cards WHERE user_id=? AND active=1 AND due_at<=?').bind(SINGLE_USER_ID,nowIso()).first<{count:number}>();return{plan,items:items.results,mission,targetUnits:targetRows.results,dueCount:due?.count??0};}

export async function startDailyItem(db:D1Database,itemId:string){
  const item=await db.prepare(`SELECT i.* FROM daily_plan_items i JOIN daily_plans p ON p.id=i.plan_id
    WHERE i.id=? AND p.user_id=?`).bind(itemId,SINGLE_USER_ID).first<Record<string,unknown>>();
  if(!item)return null;
  await db.batch([
    db.prepare(`UPDATE daily_plan_items SET status='in_progress',started_at=COALESCE(started_at,CURRENT_TIMESTAMP) WHERE id=?`).bind(itemId),
    db.prepare(`UPDATE daily_plans SET status='in_progress' WHERE id=? AND status='ready'`).bind(String(item.plan_id)),
  ]);
  return item;
}

export async function completeDailyItem(db:D1Database,itemId:string,result:unknown={}){
  const item=await db.prepare(`SELECT i.* FROM daily_plan_items i JOIN daily_plans p ON p.id=i.plan_id
    WHERE i.id=? AND p.user_id=?`).bind(itemId,SINGLE_USER_ID).first<Record<string,unknown>>();
  if(!item)return null;
  await db.prepare(`UPDATE daily_plan_items SET status='complete',started_at=COALESCE(started_at,CURRENT_TIMESTAMP),completed_at=CURRENT_TIMESTAMP,result_json=? WHERE id=?`).bind(JSON.stringify(result),itemId).run();
  const next=await db.prepare(`SELECT * FROM daily_plan_items WHERE plan_id=? AND status<>'complete' ORDER BY sequence LIMIT 1`).bind(String(item.plan_id)).first<Record<string,unknown>>();
  if(!next)await db.prepare(`UPDATE daily_plans SET status='complete',completed_at=CURRENT_TIMESTAMP WHERE id=?`).bind(String(item.plan_id)).run();
  return{completed:item,next};
}

export async function checkRate(db:D1Database,bucket:string,limit:number,windowMinutes:number){const cutoff=new Date(Date.now()-windowMinutes*60_000).toISOString();const count=await db.prepare('SELECT COUNT(*) count FROM api_rate_events WHERE bucket_key=? AND created_at>=?').bind(bucket,cutoff).first<{count:number}>();if((count?.count??0)>=limit)return false;await db.prepare('INSERT INTO api_rate_events(id,bucket_key) VALUES(?,?)').bind(crypto.randomUUID(),bucket).run();return true;}
