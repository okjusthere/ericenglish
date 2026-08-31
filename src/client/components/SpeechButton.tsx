import { useState } from 'react';
import { Square, Volume2 } from 'lucide-react';
import { Button } from './ui';
import { speakAudioFirst } from '../lib/speech';

export function SpeechButton({text,label='Listen',rate=0.92,className=''}:{text:string;label?:string;rate?:number;className?:string}){
  const [playing,setPlaying]=useState(false);const [unavailable,setUnavailable]=useState(false);const [handle,setHandle]=useState<{cancel:()=>void}|null>(null);
  const toggle=()=>{if(playing){handle?.cancel();setHandle(null);setPlaying(false);return;}const next=speakAudioFirst(text,{rate,onStart:()=>setPlaying(true),onEnd:()=>{setPlaying(false);setHandle(null);},onError:(reason)=>{setPlaying(false);setHandle(null);if(reason!=='canceled'&&reason!=='interrupted')setUnavailable(true);}});if(!next)setUnavailable(true);else setHandle(next);};
  return <Button type="button" className={`ghost speech-button ${className}`} disabled={!text.trim()||unavailable} title={unavailable?'Speech is unavailable in this browser.':'Play with a US English browser voice.'} onClick={toggle}>{playing?<Square/>:<Volume2/>}{unavailable?'Audio unavailable':playing?'Stop':label}</Button>;
}
