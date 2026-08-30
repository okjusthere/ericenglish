export {};
const base=process.argv[2]||process.env.PRODUCTION_URL||'http://127.0.0.1:5173';
const headers:Record<string,string>={origin:new URL(base).origin,'x-eric-csrf':'1'};
const response=await fetch(`${base.replace(/\/$/,'')}/api/provider-health-check`,{method:'POST',headers});console.log(JSON.stringify(await response.json(),null,2));if(!response.ok)process.exit(1);
