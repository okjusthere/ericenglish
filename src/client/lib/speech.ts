type SpeakOptions={rate?:number;onStart?:()=>void;onEnd?:()=>void;onError?:(reason:string)=>void};

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
