#!/usr/bin/env node
// Synthetic data ONLY. Guard both the HTTP origin and the independent Cloudflare bindings.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import jpeg from 'jpeg-js';
import { stagingTarget, verifyStagingResources, wrangler } from './staging-safety.mjs';

if (process.env.ALLOW_STAGING_WRITE !== '1') throw Error('ALLOW_STAGING_WRITE=1 is required');
const endpoint=stagingTarget(process.env.STAGING_API_URL || '');
const {config}=verifyStagingResources();
const photo=jpeg.encode({width:16,height:12,data:new Uint8Array(16*12*4).fill(160)},80).data;
const themes=['pink-coquette','coquette-dream','little-memories','birthday-chat','velvet-gift'];
const evidence=[];
async function request(path,init={},expected=200) {
  const res=await fetch(endpoint+path,{...init,signal:AbortSignal.timeout(30000)});
  assert.equal(res.status,expected,path+' HTTP status'); return res;
}
for (const theme of themes) {
  const session=await (await request('/v3/upload-sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({turnstileToken:'XXXX.DUMMY.TOKEN.XXXX'})},201)).json();
  assert.match(session.sessionId,/^[0-9a-f-]{36}$/); assert.match(session.uploadToken,/^[0-9a-f]{64}$/);
  const auth={Authorization:'Bearer '+session.uploadToken}, key=crypto.randomUUID();
  const path='/v3/upload-sessions/'+session.sessionId+'/media?kind=photo';
  await request(path,{method:'POST',headers:{'Content-Type':'image/jpeg','Idempotency-Key':key},body:photo},403);
  const upload=()=>request(path,{method:'POST',headers:{...auth,'Content-Type':'image/jpeg','Idempotency-Key':key},body:photo},201);
  const uploaded=await (await upload()).json();
  assert.match(uploaded.id,/^[0-9a-f-]{36}$/);
  assert.deepEqual(await (await upload()).json(),uploaded);
  const metadata=JSON.parse(wrangler(['d1','execute','luvnote-staging','--remote','--config',config,'--json','--command',
    "SELECT object_key,size FROM media_assets WHERE id='"+uploaded.id+"' AND session_id='"+session.sessionId+"'"]));
  const row=metadata[0].results[0]; assert.ok(row); assert.match(row.object_key,/^v3\//);
  mkdirSync('.wrangler/r2-smoke',{recursive:true});
  const file='.wrangler/r2-smoke/'+crypto.randomUUID()+'.jpg';
  try {
    wrangler(['r2','object','get','luvnote-media-staging/'+row.object_key,'--remote','--file',file,'--config',config]);
    const stored=readFileSync(file); assert.equal(stored.byteLength,row.size);
    assert.deepEqual(jpeg.decode(stored).data,jpeg.decode(photo).data);
  } finally { try { unlinkSync(file); } catch {} }
  const body=JSON.stringify({theme,sessionId:session.sessionId,data:{to:'Synthetic Test',from:'LuvNote QA',letter:'Non-customer staging integration',photos:[{id:uploaded.id,cap:'synthetic'}]}});
  const publish=()=>request('/v3/cards',{method:'POST',headers:{...auth,'Content-Type':'application/json'},body},201);
  const card=await (await publish()).json(); assert.deepEqual(await (await publish()).json(),card);
  const returned=await (await request('/v2/cards/'+card.id)).json(); assert.equal(returned.theme,theme);
  const url=new URL(returned.data.photos[0].src); assert.equal(url.origin,endpoint);
  const bytes=new Uint8Array(await (await request(url.pathname)).arrayBuffer());
  assert.deepEqual(jpeg.decode(bytes).data,jpeg.decode(photo).data);
  await request('/v3/cards/zzzzzzz/media/'+uploaded.id,{},404);
  await request(path,{method:'POST',headers:{...auth,'Content-Type':'image/jpeg','Idempotency-Key':crypto.randomUUID()},body:photo},403);
  evidence.push({theme,cardId:card.id,d1MetadataVerified:true,directR2ObjectVerified:true,imageBytes:bytes.length});
}
console.log(JSON.stringify({ok:true,environment:'real isolated Cloudflare staging',turnstile:'public dummy keys',evidence},null,2));
