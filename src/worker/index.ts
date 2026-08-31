import { Hono } from 'hono';
import { api } from './routes/api';
import { runScheduled } from './scheduled';
import { requireOwner } from './services/owner';
export { CurriculumBootstrapWorkflow } from './workflows/curriculum-bootstrap';
export { SessionAnalysisWorkflow } from './workflows/session-analysis';
export { WeeklyReportWorkflow } from './workflows/weekly-report';

type AppEnv={Bindings:Env;Variables:{requestId:string}};
const app=new Hono<AppEnv>();

app.use('*',async(c,next)=>{
  const requestId=crypto.randomUUID(); c.set('requestId',requestId);
  const started=Date.now();
  try{
    if(['POST','PUT','PATCH','DELETE'].includes(c.req.method)){
      const origin=c.req.header('origin'); const url=new URL(c.req.url);
      if(!origin||new URL(origin).host!==url.host||c.req.header('x-eric-csrf')!=='1')return c.json({error:'Same-origin request validation failed.',requestId},403);
      const length=Number(c.req.header('content-length')??0); if(length>13*1024*1024)return c.json({error:'Request body is too large.',requestId},413);
    }
    await next();
  } finally {
    const headers=c.res.headers;
    headers.set('x-content-type-options','nosniff'); headers.set('x-frame-options','DENY'); headers.set('referrer-policy','no-referrer'); headers.set('permissions-policy','camera=(), geolocation=(), payment=()');
    let realtimeOrigin='';
    if(c.env.REALTIME_SPEAK_ENABLED==='true'&&c.env.AZURE_OPENAI_ENDPOINT){try{const origin=new URL(c.env.AZURE_OPENAI_ENDPOINT).origin;if(origin.startsWith('https://'))realtimeOrigin=` ${origin}`;}catch{/* invalid endpoint stays blocked by CSP */}}
    headers.set('content-security-policy',`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'${realtimeOrigin}; font-src 'self'; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`);
    headers.set('cross-origin-opener-policy','same-origin'); headers.set('cross-origin-resource-policy','same-origin'); headers.set('x-request-id',requestId);
    console.log(JSON.stringify({message:'request',requestId,method:c.req.method,path:new URL(c.req.url).pathname,status:c.res.status,durationMs:Date.now()-started}));
  }
});

app.use('/api/*',async(c,next)=>{
  const owner=requireOwner(c.req,c.env);
  if(!owner.ok)return c.json({error:owner.error,requestId:c.get('requestId')},owner.status);
  await next();
});

app.get('/health',async(c)=>{const database=await c.env.DB.prepare('SELECT 1 ok').first<{ok:number}>().catch(()=>null);return c.json({status:database?.ok===1?'ok':'degraded',database:Boolean(database),r2:Boolean(c.env.AUDIO_BUCKET),workflows:Boolean(c.env.SESSION_ANALYSIS),environment:c.env.APP_ENV,time:new Date().toISOString()},{status:database?200:503});});
app.route('/api',api);
app.all('*',(c)=>c.env.ASSETS.fetch(c.req.raw));
app.notFound((c)=>c.json({error:'Not found',requestId:c.get('requestId')},404));
app.onError((error,c)=>{console.error(JSON.stringify({message:'unhandled_error',requestId:c.get('requestId'),path:new URL(c.req.url).pathname,error:error.message}));return c.json({error:'An unexpected error occurred. Please try again.',requestId:c.get('requestId')},500);});

export default {
  fetch(request:Request,env:Env,ctx:ExecutionContext){return app.fetch(request,env,ctx);},
  async scheduled(controller:ScheduledController,env:Env,ctx:ExecutionContext){ctx.waitUntil(runScheduled(env,new Date(controller.scheduledTime)).then((results)=>console.log(JSON.stringify({message:'scheduled_complete',results}))));},
} satisfies ExportedHandler<Env>;
