export class ApiError extends Error { constructor(message:string,readonly status:number){super(message);} }
export async function api<T>(path:string,options:RequestInit={}):Promise<T>{
  const headers=new Headers(options.headers); headers.set('x-eric-csrf','1');
  if(options.body&&!(options.body instanceof FormData)&&!headers.has('content-type'))headers.set('content-type','application/json');
  const response=await fetch(path,{...options,headers,credentials:'same-origin'}); const type=response.headers.get('content-type')??'';
  const payload:typePayload=type.includes('application/json')?await response.json() as typePayload:{error:await response.text()};
  if(!response.ok)throw new ApiError(typeof payload.error==='string'?payload.error:`Request failed (${response.status})`,response.status);
  return payload as T;
}
type typePayload=Record<string,unknown>;
export const post=<T>(path:string,value:unknown={})=>api<T>(path,{method:'POST',body:value instanceof FormData?value:JSON.stringify(value)});
export const put=<T>(path:string,value:unknown)=>api<T>(path,{method:'PUT',body:JSON.stringify(value)});
