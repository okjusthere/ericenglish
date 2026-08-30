import unitsRaw from '../../../seed/core-units.jsonl?raw';
import scenariosRaw from '../../../seed/scenarios.jsonl?raw';
import baseline from '../../../seed/personal-baseline.json';
import { allocatePlan, newUnitLimit } from '../../learning/planner';
import { emptyFsrsCard } from '../../learning/fsrs';
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
    for(const cardType of ['recognition','active_recall','cloze','listening_recall']){const card=emptyFsrsCard(new Date());const id=`card-${String(unit.id)}-${cardType}`;unitStatements.push(db.prepare(`INSERT OR IGNORE INTO review_cards(id,user_id,unit_id,card_type,state,due_at,stability,difficulty,elapsed_days,scheduled_days,learning_steps,reps,lapses,last_review_at,fsrs_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,SINGLE_USER_ID,unit.id,cardType,card.state,card.due.toISOString(),card.stability,card.difficulty,card.elapsed_days,card.scheduled_days,card.learning_steps,card.reps,card.lapses,null,JSON.stringify(card)));}
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
  const due=await db.prepare('SELECT COUNT(*) count FROM review_cards WHERE user_id=? AND due_at<=?').bind(SINGLE_USER_ID,nowIso()).first<{count:number}>();
  const targets=await db.prepare(`SELECT u.id,u.term FROM learning_units u JOIN user_unit_states s ON s.unit_id=u.id WHERE s.user_id=? AND s.status='unseen' AND u.active=1 ORDER BY COALESCE(s.priority_override,u.priority) DESC,u.id LIMIT 8`).bind(SINGLE_USER_ID).all<{id:string;term:string}>();
  const targetUnits=targets.results.slice(0,newUnitLimit({dueCount:due?.count??0,completionRates:[],stableAccuracy:false}));
  const missionId=`mission-${date}`; const mission=`Use “${targetUnits[0]?.term??'clarify'}” once in a real conversation today.`;
  await db.prepare('INSERT OR IGNORE INTO missions(id,user_id,local_date,mission_text,target_units_json) VALUES(?,?,?,?,?)').bind(missionId,SINGLE_USER_ID,date,mission,JSON.stringify(targetUnits.slice(0,1).map((u)=>u.id))).run();
  const planId=`plan-${date}`; const allowed=[30,45,60,75,90] as const; const minutes=allowed.includes(targetMinutes as typeof allowed[number])?targetMinutes:60;
  await db.prepare(`INSERT OR IGNORE INTO daily_plans(id,user_id,local_date,target_minutes,focus_summary,target_units_json,mission_id,generated_reason) VALUES(?,?,?,?,?,?,?,?)`).bind(planId,SINGLE_USER_ID,date,minutes,'Turn precise phrases into fast, natural output.',JSON.stringify(targetUnits.map((u)=>u.id)),missionId,`Due backlog: ${due?.count??0}; deterministic allocation`).run();
  const items=allocatePlan(minutes as 30|45|60|75|90,due?.count??0);
  await db.batch(items.map((item,index)=>db.prepare(`INSERT OR IGNORE INTO daily_plan_items(id,plan_id,item_type,sequence,estimated_minutes,payload_json) VALUES(?,?,?,?,?,?)`).bind(`${planId}-${item.type}`,planId,item.type,index+1,item.minutes,JSON.stringify({label:item.label,targetUnits:targetUnits.map((u)=>u.id)}))));
  return db.prepare('SELECT * FROM daily_plans WHERE id=?').bind(planId).first();
}

export async function getToday(db:D1Database,timezone:string,targetMinutes:number){const plan=await ensureTodayPlan(db,timezone,targetMinutes);if(!plan)throw new Error('Unable to create today plan');const items=await db.prepare('SELECT * FROM daily_plan_items WHERE plan_id=? ORDER BY sequence').bind(String(plan.id)).all();const mission=plan.mission_id?await db.prepare('SELECT * FROM missions WHERE id=?').bind(plan.mission_id).first():null;const targets=json<string[]>(String(plan.target_units_json),'[]' as never);const targetRows=targets.length?await db.prepare(`SELECT id,term,definition_en FROM learning_units WHERE id IN (${targets.map(()=>'?').join(',')})`).bind(...targets).all():{results:[]};const due=await db.prepare('SELECT COUNT(*) count FROM review_cards WHERE user_id=? AND due_at<=?').bind(SINGLE_USER_ID,nowIso()).first<{count:number}>();return{plan,items:items.results,mission,targetUnits:targetRows.results,dueCount:due?.count??0};}

export async function checkRate(db:D1Database,bucket:string,limit:number,windowMinutes:number){const cutoff=new Date(Date.now()-windowMinutes*60_000).toISOString();const count=await db.prepare('SELECT COUNT(*) count FROM api_rate_events WHERE bucket_key=? AND created_at>=?').bind(bucket,cutoff).first<{count:number}>();if((count?.count??0)>=limit)return false;await db.prepare('INSERT INTO api_rate_events(id,bucket_key) VALUES(?,?)').bind(crypto.randomUUID(),bucket).run();return true;}
