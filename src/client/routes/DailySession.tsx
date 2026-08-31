import { useEffect } from 'react';
import { ArrowRight, CheckCircle2, Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { post } from '../lib/api';
import { useAsync } from '../hooks';
import { Button, Empty, Eyebrow, Panel } from '../components/ui';

type PlanItem={id:string;item_type:string;sequence:number;estimated_minutes:number;status:string;payload_json:string};
type SessionData={plan:{id:string;status:string;target_minutes:number};items:PlanItem[];current:PlanItem|null;targetUnits:Array<{id:string;term:string;definition_en:string}>};

function destination(item:PlanItem,data:SessionData){
  const suffix=`?planItemId=${encodeURIComponent(item.id)}`;
  if(item.item_type==='review')return`/review${suffix}`;
  if(item.item_type==='learn')return`/learn/${data.targetUnits[0]?.id??''}${suffix}&targetIndex=0`;
  if(item.item_type==='drill')return`/drill${suffix}`;
  if(item.item_type==='speaking')return`/speak${suffix}`;
  if(item.item_type==='real_world')return`/write${suffix}`;
  return'';
}

export function DailySession(){
  const state=useAsync(()=>fetch('/api/today/session',{headers:{'x-eric-csrf':'1'},credentials:'same-origin'}).then(async(response)=>{if(!response.ok)throw new Error('Unable to load today’s session.');return response.json() as Promise<SessionData>;}),[]);
  const current=state.data?.current;
  useEffect(()=>{if(current?.status==='pending')void post(`/api/today/items/${current.id}/start`).then(()=>state.reload());},[current?.id,current?.status,state.reload]);
  if(!state.data)return <div className="page"/>;
  if(!current)return <div className="page narrow"><Empty title="Today’s learning loop is complete">Review, learning, production, speaking, transfer, and reflection have all been recorded.</Empty><Link to="/today"><Button>Return to Today <ArrowRight/></Button></Link></div>;
  const payload=JSON.parse(current.payload_json) as {label?:string};const href=destination(current,state.data);
  const finishReflection=()=>void post(`/api/today/items/${current.id}/complete`,{reflection:'Daily loop completed and evidence saved.'}).then(()=>state.reload());
  return <div className="page narrow"><div className="page-heading"><Eyebrow>DAILY SESSION · STEP {current.sequence}/{state.data.items.length}</Eyebrow><h1>{payload.label??current.item_type}</h1><p>The runner saves progress automatically. You can leave and resume from the same step.</p></div><Panel><div className="panel-head"><div><Eyebrow>{current.status.replace('_',' ')}</Eyebrow><h2>{current.item_type.replace('_',' ')}</h2></div><span><Clock3 size={16}/> {current.estimated_minutes} min</span></div>{current.item_type==='learn'&&<div className="target-list">{state.data.targetUnits.map((unit,index)=><div key={unit.id}><span>{String(index+1).padStart(2,'0')}</span><div><strong>{unit.term}</strong><small>{unit.definition_en}</small></div>{index===0?<ArrowRight size={16}/>:<CheckCircle2 size={16}/>}</div>)}</div>}{href?<Link to={href}><Button>{current.status==='in_progress'?'Resume':'Start'} {payload.label??current.item_type} <ArrowRight/></Button></Link>:<Button onClick={finishReflection}>Complete reflection <CheckCircle2/></Button>}</Panel></div>;
}
