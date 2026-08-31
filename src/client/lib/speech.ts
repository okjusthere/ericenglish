type SpeakOptions={rate?:number;onStart?:()=>void;onEnd?:()=>void;onError?:(reason:string)=>void};

export type AudioFirstHandle = { cancel: () => void };

/** Play server-cached TTS first, then transparently fall back to SpeechSynthesis. */
export function speakAudioFirst(text:string,{rate=0.92,onStart,onEnd,onError}:SpeakOptions={}):AudioFirstHandle|null {
  const value=text.trim();
  if(!value || typeof window==='undefined') return null;
  let cancelled=false; let audio:HTMLAudioElement|undefined; let fallback:SpeechSynthesisUtterance|null=null;
  const cancel=()=>{cancelled=true;audio?.pause();audio?.removeAttribute('src');if(fallback&&'speechSynthesis' in window)window.speechSynthesis.cancel();onEnd?.();};
  void (async()=>{
    try {
      const response=await fetch('/api/audio/tts',{method:'POST',headers:{'content-type':'application/json','x-eric-csrf':'1'},credentials:'same-origin',body:JSON.stringify({text:value,speed:rate,format:'mp3',version:'v1'})});
      if(!response.ok) throw new Error(`tts-${response.status}`);
      const payload=await response.json() as {audioUrl?:string};
      if(cancelled || !payload.audioUrl) return;
      audio=new Audio(payload.audioUrl); audio.onplay=()=>onStart?.(); audio.onended=()=>onEnd?.(); audio.onerror=()=>{if(!cancelled){fallback=speakEnglish(value,{rate,onStart,onEnd,onError});if(!fallback)onError?.('audio');}};
      await audio.play();
    } catch {
      if(!cancelled){fallback=speakEnglish(value,{rate,onStart,onEnd,onError});if(!fallback)onError?.('unavailable');}
    }
  })();
  return {cancel};
}

export function speakEnglish(text:string,{rate=0.92,onStart,onEnd,onError}:SpeakOptions={}):SpeechSynthesisUtterance|null{
  if(typeof window==='undefined'||!('speechSynthesis' in window)||typeof SpeechSynthesisUtterance==='undefined')return null;
  const value=text.trim();if(!value)return null;
  const utterance=new SpeechSynthesisUtterance(value);utterance.lang='en-US';utterance.rate=rate;utterance.pitch=1;
  const voices=window.speechSynthesis.getVoices();
  utterance.voice=voices.find((voice)=>voice.lang==='en-US'&&/(Samantha|Alex|Ava|Google US English|Microsoft.*Online)/i.test(voice.name))
    ??voices.find((voice)=>voice.lang==='en-US')
    ??voices.find((voice)=>voice.lang.startsWith('en'))
    ??null;
  utterance.onstart=()=>onStart?.();utterance.onend=()=>onEnd?.();utterance.onerror=(event)=>onError?.(event.error);
  window.speechSynthesis.cancel();window.speechSynthesis.resume();window.speechSynthesis.speak(utterance);return utterance;
}
