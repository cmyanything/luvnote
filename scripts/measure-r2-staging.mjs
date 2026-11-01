// Bounded synthetic workload; metrics must be read separately from Cloudflare Analytics.
import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import jpeg from 'jpeg-js';
import {stagingTarget,verifyStagingResources,wrangler} from './staging-safety.mjs';
if(process.env.ALLOW_STAGING_WRITE!=='1')throw Error('ALLOW_STAGING_WRITE=1 required');
const endpoint=stagingTarget(process.env.STAGING_API_URL||'');
const {config}=verifyStagingResources();
const db=sql=>JSON.parse(wrangler(['d1','execute','luvnote-staging','--remote','--config',config,'--json','--command',sql])).at(-1).results;
const encode=(width,height,noisy)=>{
 const pixels=new Uint8Array(width*height*4);let seed=1234567;
 for(let i=0;i<pixels.length;i+=4){
   for(let c=0;c<3;c++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;pixels[i+c]=noisy?seed>>>24:Math.round(120+70*Math.sin((i/4%width)/40+c)+30*Math.cos(Math.floor(i/4/width)/32));}
   pixels[i+3]=255;
 }
 return jpeg.encode({width,height,data:pixels},noisy?60:82).data;
};
const typical=encode(900,675,false),maximum=encode(1024,1024,true);
assert.ok(maximum.length<=1500000);
const results=[];
for(const [name,bytes,count,parallel] of [['typical',typical,5,false],['maximum',maximum,5,false],['maximum-concurrency-3',maximum,3,true]]) {
 const sid=crypto.randomUUID(),token=Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex');
 const hash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))).toString('hex');
 db(`INSERT INTO media_upload_sessions(id,token_hash,created_at,expires_at) VALUES('${sid}','${hash}',${Date.now()},${Date.now()+1800000})`);
 const start=new Date().toISOString(),samples=[];
 const upload=async()=>{
   const begin=performance.now();
   const r=await fetch(endpoint+`/v3/upload-sessions/${sid}/media?kind=photo`,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'image/jpeg','Idempotency-Key':crypto.randomUUID()},body:bytes,signal:AbortSignal.timeout(30000)});
   await r.arrayBuffer();samples.push({status:r.status,wallMs:Math.round(performance.now()-begin)});
 };
 try {if(parallel)await Promise.all(Array.from({length:count},upload));else for(let i=0;i<count;i++)await upload();}
 finally {
   const end=new Date().toISOString();
   const metadata=db(`SELECT count(*) n,sum(size) bytes FROM media_assets WHERE session_id='${sid}'`)[0];
   results.push({name,start,end,count,parallel:parallel?3:1,jpegBytes:bytes.length,samples,metadata,passed:samples.length===count&&samples.every(s=>s.status===201)&&metadata.n===count});
   // Only this workload's unused synthetic sessions; normal cleanup will remove their objects.
   db(`UPDATE media_upload_sessions SET expires_at=${Date.now()-7200000} WHERE id='${sid}'`);
 }
 console.log(JSON.stringify(results.at(-1)));
}
mkdirSync('.wrangler/acceptance',{recursive:true});
const evidence={sourceCommit:process.env.STAGING_SOURCE_COMMIT||'record exact deployed commit separately',environment:'real Cloudflare staging; operator-seeded synthetic capabilities',results,cloudflareCPU:'Read actual Analytics CPU/memory; these wall times are not CPU measurements'};
writeFileSync('.wrangler/acceptance/performance.json',JSON.stringify(evidence,null,2));
assert.ok(results.every(r=>r.passed));
