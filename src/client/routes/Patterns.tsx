import { TrendingDown } from 'lucide-react';
import { api } from '../lib/api';
import { useAsync } from '../hooks';
import { Empty, Eyebrow, Metric, Panel } from '../components/ui';

type Micro={title:string;minutes:number;steps:string[]};type Pattern={id:string;category:string;description:string;count_total:number;count_30d:number;impact_score:number;examples_json:string;micro_lesson:string|null};
const micro=(value:string|null):Micro|null=>{if(!value)return null;try{return JSON.parse(value) as Micro}catch{return null}};
export function Patterns(){const state=useAsync(()=>api<{patterns:Pattern[]}>('/api/patterns'),[]);return <div className="page"><div className="page-heading split"><div><Eyebrow>ERROR LEDGER</Eyebrow><h1>Patterns, not<br/><em>one-off red marks.</em></h1></div><div className="trend-callout"><TrendingDown/><div><strong>30-day signal</strong><span>Recurring errors become short retraining loops after the third appearance.</span></div></div></div>{state.data?.patterns.length===0?<Empty title="No recurring pattern yet">Speaking, writing, and capture feedback will aggregate here.</Empty>:<div className="pattern-grid">{state.data?.patterns.map((pattern)=>{const lesson=micro(pattern.micro_lesson);return <Panel key={pattern.id}><div className="panel-head"><Eyebrow>{pattern.category}</Eyebrow><Metric label="30 days" value={pattern.count_30d}/></div><h3>{pattern.description}</h3><div className="impact"><span style={{width:`${pattern.impact_score*100}%`}}/></div><small>{pattern.count_total} appearances in the ledger</small>{lesson&&<div className="micro-lesson"><Eyebrow>{lesson.minutes}-MINUTE RETRAINING LOOP</Eyebrow><strong>{lesson.title}</strong><ol>{lesson.steps.map((step)=><li key={step}>{step}</li>)}</ol></div>}</Panel>})}</div>}</div>;
}
