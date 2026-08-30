import { ensureTodayPlan, localDate } from '../services/db';

export async function runScheduled(env:Env,scheduledAt=new Date()){
  const timezone=env.APP_TIMEZONE||'America/New_York';
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:timezone,weekday:'short',hour:'2-digit',hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(scheduledAt).map((p)=>[p.type,p.value]));
  const date=localDate(timezone,scheduledAt); const results:string[]=[];
  if(parts.hour==='04'){const profile=await env.DB.prepare('SELECT daily_minutes FROM learner_profiles WHERE user_id=?').bind('primary').first<{daily_minutes:number}>();await ensureTodayPlan(env.DB,timezone,profile?.daily_minutes??60);results.push(`daily:${date}`);}
  if(parts.weekday==='Sun'&&parts.hour==='05'){const end=new Date(`${date}T05:00:00Z`);const start=new Date(end.getTime()-7*86400000).toISOString().slice(0,10);try{await env.WEEKLY_REPORT.create({id:`weekly-${start}`,params:{weekStart:start,weekEnd:date}});results.push(`weekly:${start}`);}catch(error){results.push(`weekly-existing:${error instanceof Error?error.name:'unknown'}`);}}
  if(parts.hour==='03'){const cutoff=new Date(scheduledAt.getTime()-Number(env.AUDIO_RETENTION_DAYS||30)*86400000);let cursor: string|undefined;do{const listed=await env.AUDIO_BUCKET.list({prefix:'audio/',cursor,limit:500});const expired=listed.objects.filter((o)=>o.uploaded<cutoff).map((o)=>o.key);if(expired.length)await env.AUDIO_BUCKET.delete(expired);cursor=listed.truncated?listed.cursor:undefined;}while(cursor);results.push('audio-retention');}
  await env.DB.prepare(`DELETE FROM api_rate_events WHERE created_at<datetime('now','-1 day')`).run();
  return results;
}
