import { useState } from 'react';
import { Square, Volume2 } from 'lucide-react';
import { Button } from './ui';
import { speakEnglish } from '../lib/speech';

export function SpeechButton({text,label='Listen',rate=0.92,className=''}:{text:string;label?:string;rate?:number;className?:string}){
  const [playing,setPlaying]=useState(false);const [unavailable,setUnavailable]=useState(false);
  const toggle=()=>{if(playing){window.speechSynthesis.cancel();setPlaying(false);return;}const utterance=speakEnglish(text,{rate,onStart:()=>setPlaying(true),onEnd:()=>setPlaying(false),onError:(reason)=>{setPlaying(false);if(reason!=='canceled'&&reason!=='interrupted')setUnavailable(true);}});if(!utterance)setUnavailable(true);};
  return <Button type="button" className={`ghost speech-button ${className}`} disabled={!text.trim()||unavailable} title={unavailable?'Speech is unavailable in this browser.':'Play with a US English browser voice.'} onClick={toggle}>{playing?<Square/>:<Volume2/>}{unavailable?'Audio unavailable':playing?'Stop':label}</Button>;
}
