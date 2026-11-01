// Real incomplete HTTP request, synthetic capability and bounded payload only.
import assert from 'node:assert/strict';
import https from 'node:https';
import jpeg from 'jpeg-js';
import {stagingTarget,verifyStagingResources,wrangler} from './staging-safety.mjs';
if(process.env.ALLOW_STAGING_WRITE!=='1')throw Error('ALLOW_STAGING_WRITE=1 required');
const endpoint=stagingTarget(process.env.STAGING_API_URL||'');
const {config}=verifyStagingResources();
const db=sql=>JSON.parse(wrangler(['d1','execute','luvnote-staging','--remote','--config',config,'--json','--command',sql])).at(-1).results;
const sid=crypto.randomUUID(),key=crypto.randomUUID(),token=Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex');
const hash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))).toString('hex');
db(`INSERT INTO media_upload_sessions(id,token_hash,created_at,expires_at) VALUES('${sid}','${hash}',${Date.now()},${Date.now()+1800000})`);
const pixels=new Uint8Array(1024*1024*4);let seed=1234567;
for(let i=0;i<pixels.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;pixels[i]=i%4===3?255:seed>>>24;}
const image=jpeg.encode({width:1024,height:1024,data:pixels},60).data;
let responseStatus=null,reserved=false;
const req=https.request(endpoint+`/v3/upload-sessions/${sid}/media?kind=photo`,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'image/jpeg','Idempotency-Key':key,'Content-Length':image.length}},r=>{responseStatus=r.statusCode;r.resume();});
req.on('error',()=>{});req.flushHeaders();
await new Promise((resolve,reject)=>req.write(image.subarray(0,262144),e=>e?reject(e):resolve()));
try{
 for(let i=0;i<4;i++){
  await new Promise(r=>setTimeout(r,500));
  reserved=db(`SELECT count(*) n FROM media_upload_jobs WHERE session_id='${sid}' AND request_key='${key}'`)[0].n===1;
  if(reserved)break;
 }
}finally{req.destroy();}
let state=null;
for(let i=0;i<3;i++){
 await new Promise(r=>setTimeout(r,700));
 state=db(`SELECT j.state,m.size FROM media_upload_jobs j JOIN media_assets m ON m.id=j.asset_id WHERE j.session_id='${sid}'`)[0]||null;
 if(state?.state==='failed')break;
}
db(`UPDATE media_upload_sessions SET expires_at=${Date.now()-7200000} WHERE id='${sid}'`);
console.log(JSON.stringify({environment:'real Cloudflare staging',transport:'HTTPS with declared full length; only 262144 bytes sent, then socket destroyed',reservedBeforeAbort:reserved,responseStatus,journal:state,status:reserved&&state?.state==='failed'&&state.size===0?'PASS':'NOT_VERIFIED'}));
if(reserved){assert.equal(state?.state,'failed');assert.equal(state.size,0);}
