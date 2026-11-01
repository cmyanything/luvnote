// Real isolated staging only. <=20 distinct synthetic inputs; <=30 attempts including retries.
// The Owner must confirm Images Free first. No billing/zone settings are changed.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,unlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import jpeg from 'jpeg-js';
import {stagingTarget,verifyStagingResources,wrangler} from './staging-safety.mjs';
import {jpegCorpus,syntheticJpeg} from '../tests/helpers/jpeg-corpus.mjs';
import {validateJpeg} from '../worker/jpeg.js';

assert.equal(process.env.ALLOW_STAGING_WRITE,'1');
assert.equal(process.env.STAGING_IMAGES_FREE_CONFIRMED,'1');
assert.equal(process.env.STAGING_ACCEPT_CANONICAL_REPAIR,'1');
const phase=process.argv[2]||'all';assert.ok(['all','themes','retry'].includes(phase));
const repairCases=new Set(['truncated-entropy-with-EOI','corrupt-entropy-all-zero','forged-headers-no-pixels']);
const endpoint=stagingTarget(process.env.STAGING_API_URL||'');
const {config}=verifyStagingResources();
const text=readFileSync(config,'utf8');
assert.match(text,/^MEDIA_JPEG_VALIDATOR\s*=\s*"images-transform"\s*$/m);
assert.match(text,/^MEDIA_V3_UPLOADS_ENABLED\s*=\s*"true"\s*$/m);
assert.match(process.env.STAGING_SOURCE_COMMIT||'',/^[a-f0-9]{40}$/);
assert.match(process.env.STAGING_VERSION||'',/^[a-f0-9-]{36}$/);
const hash=b=>createHash('sha256').update(b).digest('hex');
const db=sql=>JSON.parse(wrangler(['d1','execute','luvnote-staging','--remote','--config',config,'--json','--command',sql])).at(-1).results;
const sessions=[],rows=[],cards=[];let requests=0,stopReason=null;
const startedAt=new Date().toISOString();
mkdirSync('.wrangler/acceptance/transform-objects',{recursive:true});
mkdirSync('.wrangler/acceptance/transform-inputs',{recursive:true});
function session() {
  const sid=crypto.randomUUID(),token=crypto.getRandomValues(new Uint8Array(32));
  const secret=Buffer.from(token).toString('hex');
  db(`INSERT INTO media_upload_sessions(id,token_hash,created_at,expires_at) VALUES('${sid}','${hash(secret)}',${Date.now()},${Date.now()+1800000})`);
  const s={sid,secret,published:false};sessions.push(s);return s;
}
function quality(input,output) {
  const a=jpeg.decode(input,{useTArray:true,formatAsRGBA:false,tolerantDecoding:false});
  const b=jpeg.decode(output,{useTArray:true,formatAsRGBA:false,tolerantDecoding:false});
  assert.equal(b.width,a.width);assert.equal(b.height,a.height);
  let sum=0,max=0;for(let i=0;i<a.data.length;i++){const d=Math.abs(a.data[i]-b.data[i]);sum+=d*d;max=Math.max(max,d);}
  const mse=sum/a.data.length;return {width:b.width,height:b.height,psnrDb:mse?10*Math.log10(255*255/mse):null,identicalPixels:mse===0,maxChannelError:max};
}
async function upload(s,c,kind='photo') {
  assert.ok(++requests<=20,'per-run operator attempt cap; D1 enforces 30 across all runs');
  const key=crypto.randomUUID(),start=new Date().toISOString(),wall=performance.now();
  let r,body;
  try {
    r=await fetch(`${endpoint}/v3/upload-sessions/${s.sid}/media?kind=${kind}`,{method:'POST',headers:{Authorization:'Bearer '+s.secret,'Content-Type':c.mime||'image/jpeg','Idempotency-Key':key},body:c.bytes,signal:AbortSignal.timeout(30000)});
    body=await r.text();
  } catch(e) {r={status:0};body=e.name;}
  const accepts=c.accept||repairCases.has(c.name);
  const row={name:c.name,kind,start,end:new Date().toISOString(),clientWallMs:Math.round(performance.now()-wall),inputBytes:c.bytes.length,inputSha256:hash(c.bytes),legacyAccepts:!!validateJpeg(c.bytes),policy:repairCases.has(c.name)?'Owner-approved canonical repair':c.accept?'accept':'reject',httpStatus:r.status,error1102:/1102/.test(body),object:null};
  const metadata=db(`SELECT m.id,m.object_key,m.size,j.state FROM media_upload_jobs j JOIN media_assets m ON m.id=j.asset_id WHERE j.session_id='${s.sid}' AND j.request_key='${key}'`)[0];
  row.journalState=metadata?.state||null;
  if(r.status===201) {
    const file='.wrangler/acceptance/transform-objects/'+crypto.randomUUID()+'.jpg';
    try {
      wrangler(['r2','object','get','luvnote-media-staging/'+metadata.object_key,'--remote','--config',config,'--file',file]);
      const output=readFileSync(file),strict=validateJpeg(output,3000000);
      row.object={exists:true,bytes:output.length,sha256:hash(output),strictlyDecodable:!!strict,
        metadataStripped:!!strict&&Buffer.from(strict).equals(output),differentFromInput:hash(output)!==hash(c.bytes),
        ...(row.legacyAccepts&&strict?{quality:quality(c.bytes,output)}:{})};
      if(c.accept){writeFileSync('.wrangler/acceptance/transform-objects/'+c.name+'.jpg',output);writeFileSync('.wrangler/acceptance/transform-inputs/'+c.name+'.jpg',c.bytes);}
    } finally {try{unlinkSync(file);}catch{}}
  }
  row.passed=accepts?r.status===201&&row.object?.strictlyDecodable===true&&row.object?.metadataStripped===true&&row.object?.differentFromInput===true:r.status===400;
  rows.push(row);console.log(JSON.stringify(row));
  return {row,id:metadata?.id};
}
try {
  const corpus=jpegCorpus(),get=name=>corpus.find(c=>c.name===name);
  if(phase==='retry') {
    const s=session();
    await upload(s,get('valid-progressive'));
    for(const name of repairCases)await upload(s,get(name));
    if(rows.some(r=>!r.passed))stopReason='canonical-output-recheck-failed';
  }
  if(phase==='all') {
  const s=session();
  // A valid positive control prevents a missing service/quota from masquerading as security rejection.
  const control=await upload(s,{name:'typical-900x675',bytes:syntheticJpeg(900,675),accept:true});
  if(!control.row.passed) {stopReason='valid-positive-control-failed';}
  else {
    await upload(s,get('valid-progressive'));
    // These three fit the same capability's remaining three slots. No card is published.
    await Promise.all(['truncated-entropy-with-EOI','corrupt-entropy-all-zero','forged-headers-no-pixels'].map(name=>upload(s,get(name))));
    const negative=session();
    for(const name of ['truncated-no-EOI','PNG-as-JPEG','invalid-marker-length','duplicate-frame','EXIF-GPS'])await upload(negative,get(name));
    if(rows.some(r=>!r.passed))stopReason='security-matrix-failed-stop-before-publication';
  }
  }
  if(!stopReason) {
    const themes=['pink-coquette','coquette-dream','little-memories','birthday-chat','velvet-gift'];
    for(const [i,theme] of themes.entries()) {
      const s=session();
      const photoBytes=i===1?get('maximum-dimensions').bytes:i===2?get('near-byte-limit-noisy').bytes:syntheticJpeg(900-i*20,675-i*10);
      const [photo,cover]=await Promise.all([
        upload(s,{name:theme+'-photo',bytes:photoBytes,accept:true}),
        upload(s,{name:theme+'-cover',bytes:syntheticJpeg(512-i*16,384-i*12),accept:true},'cover')]);
      if(!photo.row.passed||!cover.row.passed){stopReason='valid-theme-upload-failed';break;}
      const body=JSON.stringify({theme,sessionId:s.sid,data:{to:'Synthetic Transform Test',from:'LuvNote QA',letter:'Synthetic full transformation acceptance',photos:[{id:photo.id,cap:'synthetic'}],cover_id:cover.id}});
      const publish=()=>fetch(endpoint+'/v3/cards',{method:'POST',headers:{Authorization:'Bearer '+s.secret,'Content-Type':'application/json'},body});
      const published=await publish();assert.equal(published.status,201,await published.clone().text());
      const card=await published.json();s.published=true;
      const repeated=await publish();assert.equal(repeated.status,201);assert.equal((await repeated.json()).id,card.id);
      const returned=await (await fetch(endpoint+'/v2/cards/'+card.id)).json();assert.equal(returned.theme,theme);
      for(const src of [returned.data.photos[0].src,returned.data.cover]) {
        const url=new URL(src);assert.equal(url.origin,endpoint);
        const read=await fetch(url);assert.equal(read.status,200);assert.ok(validateJpeg(new Uint8Array(await read.arrayBuffer()),3000000));
      }
      cards.push({theme,id:card.id,photoAndCoverRead:true,publicationReplay:true});
    }
  }
} catch(error) {stopReason='operator-check-failed';throw error;}
finally {
  for(const s of sessions.filter(s=>!s.published))db(`UPDATE media_upload_sessions SET expires_at=${Date.now()-7200000} WHERE id='${s.sid}'`);
  const result={sourceCommit:process.env.STAGING_SOURCE_COMMIT,version:process.env.STAGING_VERSION,startedAt,endedAt:new Date().toISOString(),realCloudflare:true,operatorSeeded:true,ownerConfirmedImagesFree:true,ownerApprovedCanonicalRepair:true,phase,maximumGlobalAttemptsIncludingRetries:30,requests,stopReason,rows,cards,
    monthlyMeterBefore:'NOT_VERIFIED',monthlyMeterAfter:'NOT_VERIFIED',note:'Upload/binding attempt count is not the account billing/unique-transformation meter.'};
  writeFileSync('.wrangler/acceptance/full-transformation-'+phase+'.json',JSON.stringify(result,null,2));
}
if(stopReason)process.exitCode=1;
