import { z, type ZodType } from 'zod';
import type { AudioResult, SpeechToTextProvider, TextModelProvider, TextRequest, TextResult, TextToSpeechProvider, TranscriptResult } from './types';

export interface AiUsageEvent { taskType:string; provider:string; model:string; latencyMs:number; inputTokens?:number; outputTokens?:number; audioSeconds?:number; estimatedCost:number; success:boolean; errorCode?:string; }
interface OpenAiOptions { baseUrl:string; apiKey?:string; gatewayToken?:string; byokAlias?:string; models:Record<string,string>; providerName:string; beforeRequest?:(input:{taskType:string;modelRole?:TextRequest['modelRole']})=>Promise<void>; usageSink?:(event:AiUsageEvent)=>Promise<void>; }
const privacyHeaders = { 'cf-aig-collect-log':'false', 'cf-aig-collect-log-payload':'false', 'cf-aig-skip-cache':'true', 'cf-aig-zdr':'true' };
const estimateTextCost=(inputTokens=0,outputTokens=0)=>Number((inputTokens*0.000001+outputTokens*0.000005).toFixed(6));
const errorCode=(error:unknown)=>error instanceof Error ? error.message.match(/\((\d{3})\)/)?.[1] ?? error.name : 'unknown';

export class OpenAiCompatibleTextProvider implements TextModelProvider {
  constructor(private readonly options:OpenAiOptions) {}
  private headers(sensitive=false):HeadersInit {
    return { 'content-type':'application/json', ...(this.options.apiKey ? {authorization:`Bearer ${this.options.apiKey}`} : {}), ...(this.options.gatewayToken ? {'cf-aig-authorization':`Bearer ${this.options.gatewayToken}`} : {}), ...(this.options.byokAlias ? {'cf-aig-byok-alias':this.options.byokAlias} : {}), ...(sensitive ? privacyHeaders : {}) };
  }
  async generateText(input:TextRequest):Promise<TextResult> {
    const started=Date.now(); const model=this.options.models[input.modelRole];
    if (!model) throw new Error(`Model is not configured for ${input.modelRole}`);
    await this.options.beforeRequest?.({taskType:input.taskType,modelRole:input.modelRole});
    let usage:{prompt_tokens?:number;completion_tokens?:number}={};
    try {
      const response=await fetch(`${this.options.baseUrl.replace(/\/$/,'')}/chat/completions`,{method:'POST',headers:this.headers(input.sensitive),body:JSON.stringify({model,temperature:0.3,messages:[{role:'system',content:input.system},{role:'user',content:input.prompt}]})});
      if (!response.ok) throw new Error(`AI provider request failed (${response.status})`);
      const payload:unknown=await response.json();
      if (!payload || typeof payload!=='object' || !('choices' in payload) || !Array.isArray(payload.choices)) throw new Error('AI provider returned an invalid response');
      const first=payload.choices[0] as {message?:{content?:unknown}}|undefined; const text=first?.message?.content;
      if (typeof text!=='string') throw new Error('AI provider returned no text');
      usage='usage' in payload && payload.usage && typeof payload.usage==='object' ? payload.usage as typeof usage : {};
      const result={text,provider:this.options.providerName,model,latencyMs:Date.now()-started,inputTokens:usage.prompt_tokens,outputTokens:usage.completion_tokens};
      await this.options.usageSink?.({taskType:input.taskType,provider:this.options.providerName,model,latencyMs:result.latencyMs,inputTokens:result.inputTokens,outputTokens:result.outputTokens,estimatedCost:estimateTextCost(result.inputTokens,result.outputTokens),success:true});
      return result;
    } catch(error) {
      await this.options.usageSink?.({taskType:input.taskType,provider:this.options.providerName,model,latencyMs:Date.now()-started,inputTokens:usage.prompt_tokens,outputTokens:usage.completion_tokens,estimatedCost:estimateTextCost(usage.prompt_tokens,usage.completion_tokens),success:false,errorCode:errorCode(error)});
      throw error;
    }
  }
  async generateStructured<T>(input:TextRequest,schema:ZodType<T>):Promise<T>{
    const requestedSchema=JSON.stringify(z.toJSONSchema(schema),null,2);
    let prompt=`${input.prompt}\nReturn only valid JSON matching this exact JSON Schema:\n${requestedSchema}`;
    for(let attempt=0;attempt<2;attempt+=1){ const result=await this.generateText({...input,prompt}); try{return schema.parse(JSON.parse(result.text) as unknown);}catch(error){if(attempt===1) throw new Error('AI output failed schema validation after one repair attempt'); prompt=`${prompt}\nYour last output was invalid. Repair it as JSON only. Validation issue: ${error instanceof Error ? error.message.slice(0,500) : 'unknown'}`;} }
    throw new Error('AI structured generation failed');
  }
}

export class OpenAiCompatibleSttProvider implements SpeechToTextProvider {
  constructor(private readonly options:OpenAiOptions,private readonly model:string){}
  async transcribe(audio:ArrayBuffer,mimeType:string):Promise<TranscriptResult>{const started=Date.now();await this.options.beforeRequest?.({taskType:'transcription'});try{const form=new FormData();form.set('model',this.model);form.set('file',new File([audio],'turn.webm',{type:mimeType}));const headers:HeadersInit={...privacyHeaders,...(this.options.apiKey?{authorization:`Bearer ${this.options.apiKey}`}:{}) ,...(this.options.gatewayToken?{'cf-aig-authorization':`Bearer ${this.options.gatewayToken}`}:{}) ,...(this.options.byokAlias?{'cf-aig-byok-alias':this.options.byokAlias}:{})};const res=await fetch(`${this.options.baseUrl.replace(/\/$/,'')}/audio/transcriptions`,{method:'POST',headers,body:form});if(!res.ok)throw new Error(`Transcription failed (${res.status})`);const data:unknown=await res.json();if(!data||typeof data!=='object'||!('text' in data)||typeof data.text!=='string')throw new Error('Invalid transcription response');await this.options.usageSink?.({taskType:'transcription',provider:this.options.providerName,model:this.model,latencyMs:Date.now()-started,estimatedCost:0,success:true});return{text:data.text,provider:this.options.providerName,model:this.model};}catch(error){await this.options.usageSink?.({taskType:'transcription',provider:this.options.providerName,model:this.model,latencyMs:Date.now()-started,estimatedCost:0,success:false,errorCode:errorCode(error)});throw error;} }
}
export class OpenAiCompatibleTtsProvider implements TextToSpeechProvider { constructor(private readonly options:OpenAiOptions,private readonly model:string){} async synthesize(text:string):Promise<AudioResult>{const started=Date.now();await this.options.beforeRequest?.({taskType:'speech_synthesis'});try{const res=await fetch(`${this.options.baseUrl.replace(/\/$/,'')}/audio/speech`,{method:'POST',headers:{'content-type':'application/json',...privacyHeaders,...(this.options.apiKey?{authorization:`Bearer ${this.options.apiKey}`}:{}) ,...(this.options.gatewayToken?{'cf-aig-authorization':`Bearer ${this.options.gatewayToken}`}:{}) ,...(this.options.byokAlias?{'cf-aig-byok-alias':this.options.byokAlias}:{})},body:JSON.stringify({model:this.model,voice:'alloy',input:text,format:'mp3'})});if(!res.ok)throw new Error(`TTS failed (${res.status})`);const result={audio:await res.arrayBuffer(),contentType:'audio/mpeg',provider:this.options.providerName,model:this.model};await this.options.usageSink?.({taskType:'speech_synthesis',provider:this.options.providerName,model:this.model,latencyMs:Date.now()-started,estimatedCost:0,success:true});return result;}catch(error){await this.options.usageSink?.({taskType:'speech_synthesis',provider:this.options.providerName,model:this.model,latencyMs:Date.now()-started,estimatedCost:0,success:false,errorCode:errorCode(error)});throw error;}} }
