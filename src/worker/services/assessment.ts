import { normalizedText } from './learning-evidence';

export interface AssessmentItemPayload {
  id: string;
  unitId: string | null;
  section: 'receptive' | 'active_recall' | 'writing' | 'speaking' | 'listening';
  ordinal: number;
  prompt: string;
  options: string[];
  cefr: string | null;
  playbackText?: string;
}

const MACHINE_SAMPLE_SIZE = 24;
const INITIAL_ANCHORS = 4;
const LISTENING_SCRIPT = 'The landlord is open to dividing the suite, but the quoted rent excludes taxes, insurance, and common area maintenance. Before we schedule a tour, please confirm your client’s preferred size and move-in date.';

const PRODUCTIVE_ITEMS: Array<Omit<AssessmentItemPayload,'id'|'ordinal'>> = [
  {unitId:null,section:'writing',prompt:'Write a concise message to a listing agent asking whether the space can be divided and whether taxes and CAM are included.',options:[],cefr:null},
  {unitId:null,section:'speaking',prompt:'Give a 60-second introduction covering your work, clients, and current priorities.',options:[],cefr:null},
  {unitId:null,section:'speaking',prompt:'Roleplay a call: clarify divisibility and CAM, handle a vague answer, confirm the next step, and close naturally.',options:[],cefr:null},
  {unitId:null,section:'listening',prompt:'What is excluded from rent, and what must be confirmed before a tour? Summarize the message.',options:[],cefr:null,playbackText:LISTENING_SCRIPT},
];

function rotate<T>(items:T[],offset:number){return items.map((_,index)=>items[(index+offset)%items.length]);}

function publicItem(row:Record<string,unknown>):AssessmentItemPayload {
  return {
    id:String(row.id),unitId:row.unit_id?String(row.unit_id):null,
    section:String(row.section) as AssessmentItemPayload['section'],ordinal:Number(row.ordinal),
    prompt:String(row.prompt),options:JSON.parse(String(row.options_json||'[]')) as string[],
    cefr:row.cefr?String(row.cefr):null,
    ...(row.section==='listening'?{playbackText:String(row.expected_answer)}:{}),
  };
}

export async function buildAssessmentItems(db:D1Database,assessmentId:string){
  const units=await db.prepare(`SELECT id,term,definition_en,definition_zh,examples_json,cefr,priority,domains_json FROM learning_units
    WHERE active=1 ORDER BY priority DESC,id`).all<Record<string,unknown>>();
  const b1=units.results.filter((unit)=>unit.cefr==='B1').slice(0,24);
  const b2=units.results.filter((unit)=>unit.cefr==='B2').slice(0,24);
  const selected=[...b1,...b2];
  if(b1.length<24||b2.length<24)throw new Error('Adaptive assessment requires at least 24 B1 and 24 B2 units.');
  const statements:D1PreparedStatement[]=[];
  for(let index=0;index<selected.length;index++){
    const unit=selected[index];const withinBand=index%24;const receptive=withinBand%2===0;const section=receptive?'receptive':'active_recall';const id=crypto.randomUUID();
    const examples=JSON.parse(String(unit.examples_json||'[]')) as Array<string|{text:string}>;const first=examples[0];const context=typeof first==='string'?first:first?.text??`Use ${String(unit.term)} naturally.`;
    const distractorPool=units.results.filter((candidate)=>candidate.id!==unit.id&&candidate.cefr===unit.cefr).slice((withinBand*3)%20).slice(0,3).map((candidate)=>String(candidate.definition_en));
    const options=receptive?rotate([String(unit.definition_en),...distractorPool],withinBand%4):[];
    const prompt=receptive?`Which meaning best matches “${String(unit.term)}” in this context?\n${context}`:`Give the natural English expression for: ${String(unit.definition_zh||unit.definition_en)}`;
    const expected=receptive?String(unit.definition_en):String(unit.term);
    const required=withinBand<2?1:0;
    statements.push(db.prepare(`INSERT INTO assessment_items(id,assessment_id,unit_id,section,ordinal,prompt,options_json,expected_answer,cefr,required) VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(id,assessmentId,unit.id,section,index,prompt,JSON.stringify(options),expected,unit.cefr,required));
  }
  PRODUCTIVE_ITEMS.forEach((item,index)=>{const ordinal=100+index;const id=crypto.randomUUID();statements.push(db.prepare(`INSERT INTO assessment_items(id,assessment_id,unit_id,section,ordinal,prompt,options_json,expected_answer,cefr,required) VALUES(?,?,?,?,?,?,?,?,?,1)`).bind(id,assessmentId,null,item.section,ordinal,item.prompt,'[]',item.section==='listening'?LISTENING_SCRIPT:null,null));});
  for(let index=0;index<statements.length;index+=50)await db.batch(statements.slice(index,index+50));
  return listAssessmentItems(db,assessmentId);
}

export async function listAssessmentItems(db:D1Database,assessmentId:string){
  const rows=await db.prepare(`SELECT id,unit_id,section,ordinal,prompt,options_json,expected_answer,cefr FROM assessment_items
    WHERE assessment_id=? AND required=1 ORDER BY CASE WHEN section IN ('receptive','active_recall') THEN 0 ELSE 1 END,ordinal`).bind(assessmentId).all<Record<string,unknown>>();
  return rows.results.map(publicItem);
}

export async function selectNextAssessmentItem(db:D1Database,assessmentId:string){
  const progress=await db.prepare(`SELECT COUNT(*) answered,AVG(machine_score) average_score FROM assessment_responses
    WHERE assessment_id=? AND section IN ('receptive','active_recall')`).bind(assessmentId).first<{answered:number;average_score:number|null}>();
  if((progress?.answered??0)>=MACHINE_SAMPLE_SIZE){
    await db.prepare('DELETE FROM assessment_items WHERE assessment_id=? AND required=0').bind(assessmentId).run();
    return null;
  }
  const required=await db.prepare(`SELECT COUNT(*) count FROM assessment_items WHERE assessment_id=? AND required=1 AND section IN ('receptive','active_recall')`).bind(assessmentId).first<{count:number}>();
  if((required?.count??0)>=Math.min(MACHINE_SAMPLE_SIZE,(progress?.answered??0)+INITIAL_ANCHORS))return null;
  const sectionCounts=await db.prepare(`SELECT section,COUNT(*) count FROM assessment_responses WHERE assessment_id=? AND section IN ('receptive','active_recall') GROUP BY section`).bind(assessmentId).all<{section:string;count:number}>();
  const counts=Object.fromEntries(sectionCounts.results.map((row)=>[row.section,row.count]));
  const desiredSection=Number(counts.receptive??0)<=Number(counts.active_recall??0)?'receptive':'active_recall';
  const recent=await db.prepare(`SELECT machine_score FROM assessment_responses WHERE assessment_id=? AND machine_score IS NOT NULL ORDER BY rowid DESC LIMIT 4`).bind(assessmentId).all<{machine_score:number}>();
  const recentAverage=recent.results.reduce((sum,row)=>sum+row.machine_score,0)/Math.max(recent.results.length,1);
  const desiredCefr=recent.results.length>=2&&recentAverage>=70?'B2':'B1';
  let row=await db.prepare(`SELECT id,unit_id,section,ordinal,prompt,options_json,expected_answer,cefr FROM assessment_items WHERE assessment_id=? AND required=0 AND cefr=? AND section=? ORDER BY ordinal LIMIT 1`).bind(assessmentId,desiredCefr,desiredSection).first<Record<string,unknown>>();
  row??=await db.prepare(`SELECT id,unit_id,section,ordinal,prompt,options_json,expected_answer,cefr FROM assessment_items WHERE assessment_id=? AND required=0 AND section=? ORDER BY ordinal LIMIT 1`).bind(assessmentId,desiredSection).first<Record<string,unknown>>();
  if(!row)return null;
  await db.prepare('UPDATE assessment_items SET required=1 WHERE id=?').bind(String(row.id)).run();
  return publicItem(row);
}

export async function machineScoreAssessmentItem(db:D1Database,assessmentId:string,itemId:string,response:string,responseMs:number){
  const item=await db.prepare(`SELECT unit_id,section,expected_answer FROM assessment_items WHERE id=? AND assessment_id=? AND required=1`).bind(itemId,assessmentId).first<{unit_id:string|null;section:string;expected_answer:string|null}>();
  if(!item)return null;
  if(item.section!=='receptive'&&item.section!=='active_recall')return{...item,correct:null,score:null};
  const expected=normalizedText(item.expected_answer??'');const actual=normalizedText(response);const correct=item.section==='receptive'?actual===expected:(actual===expected||actual.includes(expected));
  const speedFactor=responseMs<=5_000?1:responseMs<=12_000?0.9:responseMs<=25_000?0.78:0.65;
  return{...item,correct,score:correct?Math.round(100*speedFactor):0};
}

export const assessmentMachineSampleSize=MACHINE_SAMPLE_SIZE;
export const assessmentInitialAnchors=INITIAL_ANCHORS;
export const assessmentListeningScript=LISTENING_SCRIPT;
