// Real Cloudflare acceptance. Synthetic, operator-owned sessions only; no guest bypass in Worker.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,unlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {stagingTarget,verifyStagingResources,wrangler} from './staging-safety.mjs';
import {jpegCorpus,syntheticJpeg} from '../tests/helpers/jpeg-corpus.mjs';
import {validateJpeg} from '../worker/jpeg.js';
if(process.env.ALLOW_STAGING_WRITE!=='1')throw Error('ALLOW_STAGING_WRITE=1 required');
const endpoint=stagingTarget(process.env.STAGING_API_URL||'');
const {config}=verifyStagingResources();
const mode=process.env.STAGING_VALIDATOR;
assert.ok(['legacy','images'].includes(mode));
const text=readFileSync(config,'utf8');
assert.match(text,new RegExp('^MEDIA_JPEG_VALIDATOR\\s*=\\s*"'+mode+'"\\s*$','m'));
assert.match(text,/^MEDIA_V3_UPLOADS_ENABLED\s*=\s*"true"\s*$/m);
assert.match(process.env.STAGING_SOURCE_COMMIT||'',/^[a-f0-9]{40}$/);
assert.match(process.env.STAGING_VERSION||'',/^[a-f0-9-]{36}$/);
const task=process.argv[2]; assert.ok(['matrix','benchmark'].includes(task));
const db=sql=>JSON.parse(wrangler(['d1','execute','luvnote-staging','--remote','--config',config,'--json','--command',sql])).at(-1).results;
const hash=b=>createHash('sha256').update(b).digest('hex');
const sessions=[];
function session(){
 const sid=crypto.randomUUID(),token=Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex');
 db(`INSERT INTO media_upload_sessions(id,token_hash,created_at,expires_at) VALUES('${sid}','${hash(token)}',${Date.now()},${Date.now()+1800000})`);
 sessions.push(sid);return {sid,token};
}
async function upload(s,bytes,mime='image/jpeg') {
 const key=crypto.randomUUID(),start=performance.now();
 try {
  const r=await fetch(`${endpoint}/v3/upload-sessions/${s.sid}/media?kind=photo`,{method:'POST',headers:{Authorization:'Bearer '+s.token,'Content-Type':mime,'Idempotency-Key':key},body:bytes,signal:AbortSignal.timeout(30000)});
  const body=await r.text();return {status:r.status,wallMs:Math.round(performance.now()-start),error1102:/1102/.test(body),key,...(r.status===201?{id:JSON.parse(body).id}:{})};
 }catch(e){return {status:null,error:e.name,key,wallMs:Math.round(performance.now()-start)};}
}
mkdirSync('.wrangler/acceptance',{recursive:true});
const results=[],startedAt=new Date().toISOString();
try {
 const corpus=jpegCorpus();
 if(task==='matrix') {
  let s;
  for(const [i,c] of corpus.entries()) {
   if(i%5===0)s=session();
   const r=await upload(s,c.bytes,c.mime);
   const rows=db(`SELECT m.object_key,m.size,j.state FROM media_upload_jobs j JOIN media_assets m ON m.id=j.asset_id WHERE j.session_id='${s.sid}' AND j.request_key='${r.key}'`);
   let object=null;
   if(r.status===201) {
    const file='.wrangler/acceptance/'+crypto.randomUUID()+'.jpg';
    try {
     wrangler(['r2','object','get','luvnote-media-staging/'+rows[0].object_key,'--remote','--config',config,'--file',file]);
     const stored=readFileSync(file),legacy=validateJpeg(c.bytes);
     object={exists:true,bytes:stored.length,sha256:hash(stored),strictlyDecodable:!!validateJpeg(stored),...(legacy?{matchesLegacySanitized:hash(stored)===hash(legacy)}:{})};
    } finally {try{unlinkSync(file);}catch{}}
   }
   const expected=c.accept?201:c.name==='over-byte-limit'?413:c.mime?415:400;
   const row={name:c.name,inputBytes:c.bytes.length,inputSha256:hash(c.bytes),legacyValidatorAccepts:!!validateJpeg(c.bytes),policy:c.accept?'accept (strip metadata)':'reject',expected,status:r.status,error1102:r.error1102||false,journalState:rows[0]?.state||null,object,passed:r.status===expected&&(!c.accept||object?.matchesLegacySanitized===true)};
   results.push(row);console.log(JSON.stringify(row));
  }
 }else {
  const typical=syntheticJpeg(900,675),maximum=corpus.find(c=>c.name==='maximum-dimensions').bytes,near=corpus.find(c=>c.name==='near-byte-limit-noisy').bytes;
  for(const [name,bytes,count,concurrency] of [['typical-sequential',typical,10,1],['maximum-sequential',maximum,10,1],['near-byte-limit-sequential',near,10,1],['maximum-concurrent',maximum,12,3]]) {
   const start=new Date().toISOString(),samples=[];
   for(let offset=0;offset<count;offset+=Math.min(5,concurrency===1?5:3)) {
    const s=session(),n=Math.min(count-offset,concurrency===1?5:3);
    if(concurrency===1)for(let j=0;j<n;j++)samples.push(await upload(s,bytes));
    else samples.push(...await Promise.all(Array.from({length:n},()=>upload(s,bytes))));
   }
   const end=new Date().toISOString();
   const row={name,start,end,count,concurrency,jpegBytes:bytes.length,inputSha256:hash(bytes),samples:samples.map(({key,id,...r})=>r),passed:samples.length===count&&samples.every(r=>r.status===201)};
   results.push(row);console.log(JSON.stringify(row));
  }
 }
}finally {
 // Expire only capabilities created by this run; normal existing cleanup reclaims fixtures.
 for(const sid of sessions)db(`UPDATE media_upload_sessions SET expires_at=${Date.now()-7200000} WHERE id='${sid}'`);
 const result={mode,task,sourceCommit:process.env.STAGING_SOURCE_COMMIT,version:process.env.STAGING_VERSION,startedAt,endedAt:new Date().toISOString(),realCloudflare:true,operatorSeeded:true,results};
 writeFileSync(`.wrangler/acceptance/native-${mode}-${task}.json`,JSON.stringify(result,null,2));
}
assert.ok(results.every(r=>r.passed),'Actual staging acceptance failed; inspect recorded evidence');
