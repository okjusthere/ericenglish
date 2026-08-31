import { env, exports } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

const request=(path:string,init:RequestInit={})=>exports.default.fetch(new Request(`http://app.test${path}`,{...init,headers:{origin:'http://app.test','x-eric-csrf':'1',...(init.body instanceof FormData?{}:{'content-type':'application/json'}),...init.headers}}));
const json=async(path:string,init:RequestInit={})=>{const response=await request(path,init);const payload=await response.json() as Record<string,unknown>;expect(response.status,JSON.stringify(payload)).toBeLessThan(400);return payload;};

describe('adaptive learning loop',()=>{
  it('bootstraps with no false backlog, activates staged cards, records evidence, and recalculates an override',async()=>{
    const boot=await json('/api/bootstrap',{method:'POST',body:'{}'});expect(boot).toMatchObject({units:240,scenarios:50});
    const initial=await env.DB.prepare(`SELECT COUNT(*) cards,COALESCE(SUM(active),0) active FROM review_cards`).first<{cards:number;active:number}>();expect(initial).toEqual({cards:0,active:0});
    const today=await json('/api/today');expect(today.dueCount).toBe(0);expect((today.items as unknown[]).length).toBe(6);
    const learnItem=(today.items as Array<{id:string;item_type:string}>).find((item)=>item.item_type==='learn')!;
    await json(`/api/today/items/${learnItem.id}/start`,{method:'POST',body:'{}'});
    await json('/api/units/unit-001/complete',{method:'POST',body:JSON.stringify({planItemId:learnItem.id,targetIndex:0})});
    const activated=await env.DB.prepare(`SELECT card_type,active FROM review_cards WHERE unit_id='unit-001' ORDER BY card_type`).all<{card_type:string;active:number}>();expect(activated.results).toEqual([{card_type:'recognition',active:1}]);
    const due=await json('/api/reviews/due?limit=1');const card=(due.cards as Array<{id:string}>)[0];expect(card).toBeTruthy();
    const reviewed=await json(`/api/reviews/${card.id}/answer`,{method:'POST',body:JSON.stringify({response:'concise',correct:true,responseMs:2500,hintLevel:0,rating:4})});expect(reviewed.rating).toBe(4);
    const beforeOverride=String(reviewed.nextDue);const overridden=await json(`/api/reviews/${card.id}/override-rating`,{method:'POST',body:JSON.stringify({rating:1})});expect(new Date(String(overridden.nextDue)).getTime()).toBeLessThan(new Date(beforeOverride).getTime());
    const evidence=await env.DB.prepare(`SELECT source,dimension,score,verified FROM learning_evidence WHERE unit_id='unit-001' ORDER BY created_at`).all();expect(evidence.results).toEqual(expect.arrayContaining([expect.objectContaining({source:'learn',dimension:'recognition'}),expect.objectContaining({source:'review',verified:1})]));
    const completed=await json(`/api/today/items/${learnItem.id}/complete`,{method:'POST',body:JSON.stringify({learned:['unit-001']})});expect(completed.ok).toBe(true);
  });

  it('machine-scores the adaptive baseline and ignores learner-supplied correctness',async()=>{
    await json('/api/bootstrap',{method:'POST',body:'{}'});
    const assessment=await json('/api/assessments',{method:'POST',body:'{}'});const assessmentId=String(assessment.id);const initial=assessment.items as Array<{id:string;section:string;cefr:string|null}>;expect(assessment.total).toBe(28);expect(assessment.scoring).toBe('adaptive_machine');
    const machineQueue=initial.filter((item)=>item.section==='receptive'||item.section==='active_recall');const productive=initial.filter((item)=>!machineQueue.includes(item));const routedBands=new Set<string>();
    for(let index=0;index<machineQueue.length;index++){
      const item=machineQueue[index];
      const stored=await env.DB.prepare('SELECT expected_answer FROM assessment_items WHERE id=?').bind(item.id).first<{expected_answer:string|null}>();const responseText=item.section==='receptive'||item.section==='active_recall'?String(stored?.expected_answer):'A complete unaided response that explains the requested situation clearly and professionally.';
      const result=await json(`/api/assessments/${assessmentId}/responses`,{method:'POST',body:JSON.stringify({itemId:item.id,section:item.section,responseText:index===0?'definitely wrong':responseText,responseMs:index===0?1000:2200,replayCount:0,hintLevel:0,correct:true})});
      if(index===0)expect(result).toMatchObject({correct:false,score:0});
      const next=result.nextItem as {id:string;section:string;cefr:string}|null;if(next){machineQueue.push(next);routedBands.add(next.cefr);}
    }
    expect(machineQueue).toHaveLength(24);expect(routedBands).toEqual(new Set(['B1','B2']));
    for(const item of productive)await json(`/api/assessments/${assessmentId}/responses`,{method:'POST',body:JSON.stringify({itemId:item.id,section:item.section,responseText:'A complete unaided response that explains the requested situation clearly and professionally.',responseMs:2200,replayCount:item.section==='listening'?1:0,hintLevel:0})});
    const completed=await json(`/api/assessments/${assessmentId}/complete`,{method:'POST',body:'{}'});expect((completed.objective as {machineScoredItems:number}).machineScoredItems).toBe(24);expect((completed.report as {disclaimer:string}).disclaimer).toContain('machine-scored');
    expect((await env.DB.prepare(`SELECT assessment_completed FROM learner_profiles WHERE user_id='primary'`).first<{assessment_completed:number}>())?.assessment_completed).toBe(1);
  });

  it('selects an adaptive drill queue, verifies production server-side, and writes production evidence',async()=>{
    await json('/api/bootstrap',{method:'POST',body:'{}'});await json('/api/units/unit-001/complete',{method:'POST',body:'{}'});
    const queue=await json('/api/drills/queue?limit=20');const concise=(queue.units as Array<{id:string;model_answer:string}>).find((unit)=>unit.id==='unit-001');expect(concise).toBeTruthy();expect(concise!.model_answer.split(' ').length).toBeGreaterThan(3);
    const session=await json('/api/drills/sessions',{method:'POST',body:'{}'});const sessionId=String(session.id);
    const failed=await json(`/api/drills/sessions/${sessionId}/answers`,{method:'POST',body:JSON.stringify({unitId:'unit-001',prompt:'Use it now',response:'This answer avoids the target.',responseMs:1800,variant:2})});expect(failed).toMatchObject({correct:false,score:20});
    const passed=await json(`/api/drills/sessions/${sessionId}/answers`,{method:'POST',body:JSON.stringify({unitId:'unit-001',prompt:'Use it now',response:'I gave the client a concise summary of the lease terms.',responseMs:1800,variant:2})});expect(passed).toMatchObject({correct:true,score:90});
    expect((await env.DB.prepare(`SELECT COUNT(*) count FROM learning_evidence WHERE unit_id='unit-001' AND source='drill' AND dimension='production'`).first<{count:number}>())?.count).toBe(2);
  });

  it('uses scenario-backed speaking, personalized event prep, transfer evidence, and export',async()=>{
    await json('/api/bootstrap',{method:'POST',body:'{}'});await json('/api/units/unit-062/complete',{method:'POST',body:'{}'});
    const scenarios=await json('/api/speaking/scenarios');const scenario=(scenarios.scenarios as Array<{id:string}>)[0];const session=await json('/api/speaking/sessions',{method:'POST',body:JSON.stringify({scenarioId:scenario.id,mode:'fluency',title:'Test call'})});const sessionId=String(session.id);
    const turn=await json(`/api/speaking/sessions/${sessionId}/turns`,{method:'POST',body:JSON.stringify({text:'Could you confirm the asking rent and showing availability?',durationMs:4200})});expect((turn.assistant as {text:string}).text).toContain('move-in timeline');expect((turn.scenario as {hiddenComplication:string}).hiddenComplication).toBeTruthy();
    const prepared=await json('/api/event-prep',{method:'POST',body:JSON.stringify({event:'Tomorrow I will call the listing agent about CAM, rent, and a showing time.'})});expect(String(prepared.recommendedOpening)).toContain('tomorrow');expect((prepared.mustUse as unknown[]).length).toBeGreaterThanOrEqual(3);
    const after=await json(`/api/event-prep/${String(prepared.id)}/after-action`,{method:'POST',body:JSON.stringify({happened:'We confirmed the asking rent and the next step.',missedPhrase:'',unfamiliarExpression:'',createFollowUp:true})});expect(String(after.followUp)).toContain('CAM');
    const exported=await json('/api/export',{method:'POST',body:JSON.stringify({format:'json'})});const download=await request(String(exported.downloadUrl));expect(download.status).toBe(200);expect(await download.text()).toContain('exportedAt');
  });
});

describe('defense in depth',()=>{
  it('rejects missing and wrong Access identities on every production API path',async()=>{
    const missing=await exports.default.fetch(new Request('https://english.diypokecard.com/api/me'));expect(missing.status).toBe(401);
    const wrong=await exports.default.fetch(new Request('https://english.diypokecard.com/api/me',{headers:{'cf-access-authenticated-user-email':'attacker@example.com'}}));expect(wrong.status).toBe(403);
    const owner=await exports.default.fetch(new Request('https://english.diypokecard.com/api/me',{headers:{'cf-access-authenticated-user-email':env.OWNER_EMAIL}}));expect(owner.status).toBe(200);
  });
});
