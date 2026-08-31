import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Timer } from 'lucide-react';
import { api, post } from '../lib/api';
import { Button, Empty, Eyebrow, Panel } from '../components/ui';
import { SpeechButton } from '../components/SpeechButton';
import { speakAudioFirst } from '../lib/speech';

type Unit={id:string;term:string;definition_en:string;definition_zh:string};
export function Drill(){
  const [units,setUnits]=useState<Unit[]>([]);const [sessionId,setSessionId]=useState('');const [index,setIndex]=useState(0);const [seconds,setSeconds]=useState(8);const [show,setShow]=useState(false);const [response,setResponse]=useState('');const [correct,setCorrect]=useState(0);const [saving,setSaving]=useState(false);const started=useRef(Date.now());
  useEffect(()=>{void Promise.all([api<{units:Unit[]}>('/api/units'),post<{id:string}>('/api/drills/sessions',{})]).then(([data,session])=>{setUnits(data.units.slice(0,10));setSessionId(session.id);});},[]);
  useEffect(()=>{if(show)return;const timer=setInterval(()=>setSeconds((value)=>value<=1?(setShow(true),0):value-1),1000);return()=>clearInterval(timer);},[index,show]);
  const total=units.length*3;if(units.length&&index>=total)return <div className="page narrow"><Empty title="Automaticity sprint complete">You produced {correct} of {total} variants without hiding behind recognition. The attempts were saved to mastery and practice history.</Empty></div>;
  const unit=units[Math.floor(index/3)];if(!unit)return <div className="page"/>;const variant=index%3+1;const prompt=variant===1?(unit.definition_zh||unit.definition_en):variant===2?`In a work call, express this idea naturally: ${unit.definition_en}`:`Use the same idea in a different real-life sentence: ${unit.definition_en}`;
  const rate=async(wasCorrect:boolean)=>{setSaving(true);try{await post(`/api/drills/sessions/${sessionId}/answers`,{unitId:unit.id,prompt,response,correct:wasCorrect,responseMs:Date.now()-started.current,variant});if(wasCorrect)setCorrect((value)=>value+1);const next=index+1;if(next>=total)await post(`/api/drills/sessions/${sessionId}/complete`,{});setIndex(next);setSeconds(8);setShow(false);setResponse('');started.current=Date.now();}finally{setSaving(false);}};
  const reveal=()=>{setShow(true);speakAudioFirst(unit.term);};
  return <div className="page narrow"><div className="page-heading"><Eyebrow>AUTOMATICITY SPRINT · {index+1}/{total}</Eyebrow><h1>Eight seconds.<br/><em>Say it now.</em></h1><p>Each target returns in three contexts. Speak first; typing is optional evidence.</p></div><Panel className="drill-card"><div className="timer"><Timer/>{seconds}</div><Eyebrow>VARIATION {variant}/3</Eyebrow><p>{prompt}</p><textarea value={response} onChange={(event)=>setResponse(event.target.value)} placeholder="Optional: type exactly what you said…"/>{show?<div className="drill-answer"><h2>{unit.term}</h2><p>Listen, say the model once aloud, then rate the retrieval honestly.</p><SpeechButton text={unit.term} label="Replay model answer"/><div className="button-row"><Button disabled={saving} className="ghost" onClick={()=>void rate(false)}><RotateCcw/>Not yet · repeated</Button><Button disabled={saving} onClick={()=>void rate(true)}>Produced it · next variation</Button></div></div>:<Button onClick={reveal}>Reveal & hear answer</Button>}</Panel></div>;
}
