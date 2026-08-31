import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const required=['CLOUDFLARE_ACCOUNT_ID','CLOUDFLARE_API_TOKEN','OWNER_EMAIL'];
const missing=required.filter((name)=>!process.env[name]);
if(missing.length)throw new Error(`Required production configuration is missing: ${missing.join(', ')}`);
if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(process.env.OWNER_EMAIL))throw new Error('OWNER_EMAIL must be one exact email address.');

const names={worker:process.env.WORKER_NAME||'eric-english-os',database:process.env.D1_NAME||'eric-english-os-db',bucket:process.env.R2_BUCKET_NAME||'eric-english-os-audio',gateway:process.env.AI_GATEWAY_ID||'eric-english-os-ai'};
const run=(args,{capture=false}={})=>{const result=spawnSync('pnpm',['exec','wrangler',...args],{encoding:'utf8',stdio:capture?'pipe':'inherit',env:process.env});if(result.status!==0)throw new Error(`wrangler ${args.join(' ')} failed${capture?`: ${result.stderr}`:''}`);return capture?`${result.stdout}${result.stderr}`:'';};
const api=async(path,init={})=>{const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}${path}`,{...init,headers:{authorization:`Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,'content-type':'application/json',...init.headers}});const payload=await response.json();if(!response.ok||payload.success===false)throw new Error(`Cloudflare API ${path} failed: ${JSON.stringify(payload.errors||payload)}`);return payload.result;};
const asArray=(value,key)=>Array.isArray(value)?value:Array.isArray(value?.[key])?value[key]:[];

console.log('1/10 Verify Wrangler authentication');
run(['whoami']);

console.log('2/10 Discover or create D1');
let databases=JSON.parse(run(['d1','list','--json'],{capture:true}));
let database=databases.find((value)=>value.name===names.database);
if(!database){run(['d1','create',names.database]);databases=JSON.parse(run(['d1','list','--json'],{capture:true}));database=databases.find((value)=>value.name===names.database);}
if(!database?.uuid)throw new Error('Unable to resolve D1 database UUID.');

console.log('3/10 Update bindings without dropping existing settings');
const config=JSON.parse(readFileSync('wrangler.jsonc','utf8'));
config.name=names.worker;
config.d1_databases[0].database_name=names.database;
config.d1_databases[0].database_id=database.uuid;
config.r2_buckets[0].bucket_name=names.bucket;
config.workflows[0].name='session-analysis';
config.workflows[1].name='weekly-report';
config.workflows[2].name='curriculum-bootstrap';
config.vars={...config.vars,OWNER_EMAIL:process.env.OWNER_EMAIL,AI_PROVIDER_MODE:process.env.AI_PROVIDER_MODE||config.vars.AI_PROVIDER_MODE||'workers_ai',AI_GATEWAY_ACCOUNT_ID:process.env.CLOUDFLARE_ACCOUNT_ID,AI_GATEWAY_ID:names.gateway,AI_GATEWAY_API_BASE:'',AI_GATEWAY_BYOK_ALIAS:'',AI_MODEL_FAST:process.env.AI_MODEL_FAST||'@cf/qwen/qwen3-30b-a3b-fp8',AI_MODEL_STRONG:process.env.AI_MODEL_STRONG||'@cf/meta/llama-3.3-70b-instruct-fp8-fast',AI_MODEL_CONTENT:process.env.AI_MODEL_CONTENT||'@cf/qwen/qwen3-30b-a3b-fp8',AI_MODEL_STT:process.env.AI_MODEL_STT||'@cf/openai/whisper-large-v3-turbo',AI_MODEL_TTS:process.env.AI_MODEL_TTS||config.vars.AI_MODEL_TTS||'',SPEECH_MODE:process.env.SPEECH_MODE||config.vars.SPEECH_MODE||'browser',REALTIME_SPEAK_ENABLED:process.env.REALTIME_SPEAK_ENABLED||config.vars.REALTIME_SPEAK_ENABLED||'false',PRONUNCIATION_ASSESSMENT_ENABLED:process.env.PRONUNCIATION_ASSESSMENT_ENABLED||config.vars.PRONUNCIATION_ASSESSMENT_ENABLED||'false',AZURE_OPENAI_ENDPOINT:process.env.AZURE_OPENAI_ENDPOINT||config.vars.AZURE_OPENAI_ENDPOINT||'',AZURE_OPENAI_API_VERSION:process.env.AZURE_OPENAI_API_VERSION||config.vars.AZURE_OPENAI_API_VERSION||'2025-03-01-preview',AZURE_REALTIME_DEPLOYMENT:process.env.AZURE_REALTIME_DEPLOYMENT||config.vars.AZURE_REALTIME_DEPLOYMENT||'gpt-realtime-2.1',AZURE_TTS_DEPLOYMENT:process.env.AZURE_TTS_DEPLOYMENT||config.vars.AZURE_TTS_DEPLOYMENT||'gpt-4o-mini-tts',AZURE_TRANSCRIBE_DEPLOYMENT:process.env.AZURE_TRANSCRIBE_DEPLOYMENT||config.vars.AZURE_TRANSCRIBE_DEPLOYMENT||'gpt-4o-mini-transcribe',AZURE_TEXT_DEPLOYMENT:process.env.AZURE_TEXT_DEPLOYMENT||config.vars.AZURE_TEXT_DEPLOYMENT||'gpt-5.6-terra',AZURE_TTS_VOICE:process.env.AZURE_TTS_VOICE||config.vars.AZURE_TTS_VOICE||'alloy',AZURE_SPEECH_ENDPOINT:process.env.AZURE_SPEECH_ENDPOINT||config.vars.AZURE_SPEECH_ENDPOINT||'',AZURE_SPEECH_VOICE:process.env.AZURE_SPEECH_VOICE||config.vars.AZURE_SPEECH_VOICE||'en-US-AvaMultilingualNeural'};
config.routes=[{pattern:process.env.PRODUCTION_HOSTNAME||'english.diypokecard.com',custom_domain:true}];
writeFileSync('wrangler.jsonc',`${JSON.stringify(config,null,2)}\n`);

console.log('4/10 Discover or create R2 and enforce retention');
const buckets=asArray(await api('/r2/buckets'),'buckets');
if(!buckets.some((value)=>value.name===names.bucket))run(['r2','bucket','create',names.bucket]);
await api(`/r2/buckets/${names.bucket}/lifecycle`,{method:'PUT',body:JSON.stringify({rules:[{id:'expire-raw-audio',enabled:true,conditions:{prefix:'audio/'},deleteObjectsTransition:{condition:{type:'Age',maxAge:30*24*60*60}}},{id:'expire-exports',enabled:true,conditions:{prefix:'exports/'},deleteObjectsTransition:{condition:{type:'Age',maxAge:7*24*60*60}}}]})});

console.log('5/10 Create or harden private AI Gateway');
const gatewaySettings={cache_invalidate_on_update:true,cache_ttl:0,collect_logs:false,authentication:true,zdr:true,rate_limiting_interval:60,rate_limiting_limit:50,rate_limiting_technique:'sliding'};
const gateways=asArray(await api('/ai-gateway/gateways'),'gateways');
if(gateways.some((value)=>value.id===names.gateway))await api(`/ai-gateway/gateways/${names.gateway}`,{method:'PUT',body:JSON.stringify(gatewaySettings)});
else await api('/ai-gateway/gateways',{method:'POST',body:JSON.stringify({id:names.gateway,...gatewaySettings})});

console.log('6/10 Apply committed migrations and idempotent seed');
run(['d1','migrations','apply',names.database,'--remote']);
const seed=spawnSync('pnpm',['db:seed:remote'],{stdio:'inherit',env:{...process.env,D1_NAME:names.database}});
if(seed.status!==0)throw new Error('Remote seed failed.');

console.log('7/10 Resolve current Access state');
const apps=asArray(await api('/access/apps'),'apps');
let accessApp=apps.find((value)=>value.name===`${names.worker} owner access`);

console.log('8/10 Validate build and deploy');
run(['deploy','--dry-run']);
const deployed=run(['deploy'],{capture:true});
process.stdout.write(deployed);
const productionUrl=process.env.PRODUCTION_URL||deployed.match(/https:\/\/[^\s]+\.workers\.dev/)?.[0];
if(!productionUrl)throw new Error('Deployment succeeded but no production URL was discovered. Set PRODUCTION_URL and rerun.');

if(!accessApp){console.log('9/10 Run full smoke before closing first-deploy Access boundary');const smoke=spawnSync('pnpm',['exec','tsx','scripts/smoke.ts',productionUrl],{stdio:'inherit',env:process.env});if(smoke.status!==0)throw new Error('Production smoke failed; Access was not created so the failure can be repaired without locking out diagnostics.');}

console.log('9/10 Create or update exact-owner Access policy');
const workersResult=await api('/workers/workers');
const worker=asArray(workersResult,'workers').find((value)=>value.name===names.worker);
if(!worker?.id)throw new Error('Deployed Worker immutable ID was not found.');
const accessBody={type:'self_hosted',name:`${names.worker} owner access`,destinations:[{type:'worker',worker_id:worker.id}],session_duration:'24h',policies:[{name:'Owner only',decision:'allow',precedence:1,include:[{email:{email:process.env.OWNER_EMAIL}}]}]};
accessApp=accessApp?await api(`/access/apps/${accessApp.id}`,{method:'PUT',body:JSON.stringify(accessBody)}):await api('/access/apps',{method:'POST',body:JSON.stringify(accessBody)});

console.log('10/10 Verify Access denial and protected application');
const denied=await fetch(`${productionUrl.replace(/\/$/,'')}/health`,{redirect:'manual'});
if(denied.ok)throw new Error('Unauthenticated /health was not blocked by Access.');
console.log(JSON.stringify({ok:true,productionUrl,resources:{worker:names.worker,d1:names.database,r2:names.bucket,aiGateway:names.gateway,accessApp:accessApp.id},unauthenticatedStatus:denied.status,ownerVerificationRequired:true,ownerVerification:'Authenticate in a browser with OWNER_EMAIL, then verify Today and /api/today.'},null,2));
