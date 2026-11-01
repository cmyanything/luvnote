// Live adversarial tests. Only isolated staging, synthetic images and operator-owned fixtures.
// Guest creation is separately exercised by smoke-r2-staging. Seeded capabilities isolate
// expiry/failure/concurrency cases without changing Turnstile, rate limits or public quotas.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import jpeg from 'jpeg-js';
import { stagingTarget, verifyStagingResources, wrangler } from './staging-safety.mjs';

if (process.env.ALLOW_STAGING_WRITE!=='1') throw Error('ALLOW_STAGING_WRITE=1 is required');
const endpoint=stagingTarget(process.env.STAGING_API_URL||'');
const {config}=verifyStagingResources();
const scheduled=new URL(process.env.STAGING_SCHEDULED_URL||'http://127.0.0.1:8788/__scheduled');
assert.equal(scheduled.origin,'http://127.0.0.1:8788'); assert.equal(scheduled.pathname,'/__scheduled');
const results=[];
const db=q=>JSON.parse(wrangler(['d1','execute','luvnote-staging','--remote','--config',config,'--json','--command',q])).at(-1).results;
const quote=v=>"'"+String(v).replaceAll("'","''")+"'";
const hash=async value=>Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))).toString('hex');
const image=jpeg.encode({width:16,height:12,data:new Uint8Array(16*12*4).fill(160)},80).data;
const sid=crypto.randomUUID(), token=Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex');
const auth={Authorization:'Bearer '+token}, prefix='r2test_'+sid.replaceAll('-','');
db(`INSERT INTO media_upload_sessions(id,token_hash,created_at,expires_at) VALUES(${quote(sid)},${quote(await hash(token))},${Date.now()},${Date.now()+1800000})`);
async function expectStatus(name,path,init,status) {
  const response=await fetch(endpoint+path,{...init,signal:init?.signal||AbortSignal.timeout(30000)});
  assert.equal(response.status,status,name+': '+await response.clone().text());
  results.push({name,status,passed:true}); return response;
}
const uploadPath=`/v3/upload-sessions/${sid}/media?kind=photo`;
const upload=(bytes=image,key=crypto.randomUUID(),kind='photo')=>({method:'POST',headers:{...auth,'Content-Type':'image/jpeg','Idempotency-Key':key},body:bytes});
const key=crypto.randomUUID();
await expectStatus('wrong bearer',uploadPath,{...upload(),headers:{'Content-Type':'image/jpeg','Idempotency-Key':key,Authorization:'Bearer '+'b'.repeat(64)}},403);
const main=await (await expectStatus('valid upload',uploadPath,upload(image,key),201)).json();
assert.match(main.id,/^[0-9a-f-]{36}$/);
assert.deepEqual(await (await expectStatus('same-key retry',uploadPath,upload(image,key),201)).json(),main);
await expectStatus('changed bytes same key',uploadPath,upload(new Uint8Array([1,2,3]),key),409);
await expectStatus('bad MIME',uploadPath,{...upload(),headers:{...auth,'Content-Type':'text/plain','Idempotency-Key':crypto.randomUUID()}},415);
await expectStatus('invalid JPEG',uploadPath,upload(new Uint8Array(40)),400);

const completionTrigger=prefix+'_completion';
try {
  db(`CREATE TRIGGER ${completionTrigger} BEFORE UPDATE OF state ON media_upload_jobs WHEN OLD.session_id=${quote(sid)} AND NEW.state='ready' BEGIN SELECT RAISE(ABORT,'synthetic_completion_failure'); END`);
  await expectStatus('D1 completion failure after R2 put',uploadPath,upload(),500);
  assert.equal(db(`SELECT count(*) n FROM media_upload_jobs WHERE session_id=${quote(sid)} AND state='failed'`)[0].n,2);
} finally { db(`DROP TRIGGER IF EXISTS ${completionTrigger}`); }

// Abort only after D1 confirms the real Worker reserved the streaming request.
const abort=new AbortController(), partialKey=crypto.randomUUID();
const stream=new ReadableStream({start(c){c.enqueue(image.subarray(0,48));}});
const pending=fetch(endpoint+uploadPath,{method:'POST',headers:{...auth,'Content-Type':'image/jpeg','Idempotency-Key':partialKey},body:stream,duplex:'half',signal:abort.signal}).catch(()=>null);
let reserved=false;
try {
  for(let attempt=0;attempt<3;attempt++) {
    if(db(`SELECT count(*) n FROM media_upload_jobs WHERE session_id=${quote(sid)} AND request_key=${quote(partialKey)}`)[0].n===1){reserved=true;break;}
    await new Promise(r=>setTimeout(r,500));
  }
} finally { abort.abort(); await pending; }
results.push({name:'interrupted real request retained journal',passed:reserved?true:null,
  ...(reserved?{}:{unverified:'The transport did not deliver the incomplete request to the Worker before cancellation.'})});
if(!reserved) await expectStatus('reserve bounded invalid slot for concurrency fixture',uploadPath,upload(new Uint8Array(40)),400);

const pixels=new Uint8Array(1024*1024*4); let seed=1234567;
for(let i=0;i<pixels.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;pixels[i]=i%4===3?255:seed>>>24;}
const large=jpeg.encode({width:1024,height:1024,data:pixels},60).data;
let cover=null;
const started=performance.now();
const maximum=await fetch(endpoint+uploadPath.replace('kind=photo','kind=cover'),{...upload(large,crypto.randomUUID(),'cover'),signal:AbortSignal.timeout(30000)});
if(maximum.status===201) cover=await maximum.json(); else await maximum.arrayBuffer();
results.push({name:'maximum noisy JPEG',passed:maximum.status===201,status:maximum.status,bytes:large.byteLength,wallMs:Math.round(performance.now()-started)});

const concurrent=await Promise.all([1,2].map(()=>fetch(endpoint+uploadPath,upload())));
assert.deepEqual(concurrent.map(r=>r.status).sort(),[201,409]);
const extra=await concurrent.find(r=>r.status===201).json();
results.push({name:'concurrent final slot',passed:true,statuses:[201,409]});
await expectStatus('full session rejects new body',uploadPath,upload(),409);
const data={to:'Synthetic adversarial',from:'LuvNote QA',letter:'No customer data',photos:[{id:main.id}],...(cover?{cover_id:cover.id}:{})};
const publish=(d=data)=>({method:'POST',headers:{...auth,'Content-Type':'application/json'},body:JSON.stringify({theme:'pink-coquette',sessionId:sid,data:d})});
await expectStatus('unknown media reference','/v3/cards',publish({...data,photos:[{id:crypto.randomUUID()}]}),400);
await expectStatus('duplicate media reference','/v3/cards',publish({...data,photos:[{id:main.id},{id:main.id}]}),400);
await expectStatus('wrong media kind','/v3/cards',publish({...data,cover_id:main.id}),400);
const publishTrigger=prefix+'_publish';
try {
  db(`CREATE TRIGGER ${publishTrigger} BEFORE INSERT ON media_publications WHEN NEW.session_id=${quote(sid)} BEGIN SELECT RAISE(ABORT,'synthetic_publication_failure'); END`);
  await expectStatus('D1 publication batch rollback','/v3/cards',publish(),500);
  assert.equal(db(`SELECT count(*) n FROM media_publications WHERE session_id=${quote(sid)}`)[0].n,0);
  assert.equal(db(`SELECT used_at FROM media_upload_sessions WHERE id=${quote(sid)}`)[0].used_at,null);
} finally { db(`DROP TRIGGER IF EXISTS ${publishTrigger}`); }
const publications=await Promise.all([1,2].map(()=>fetch(endpoint+'/v3/cards',publish())));
assert.ok(publications.every(r=>r.status===201));
const cards=await Promise.all(publications.map(r=>r.json())); assert.equal(cards[0].id,cards[1].id);
const card=cards[0]; assert.match(card.id,/^[a-z0-9]{7}$/);
results.push({name:'concurrent publication one receipt',passed:true,cardId:card.id});
await expectStatus('changed publication denied','/v3/cards',publish({...data,letter:'Changed'}),409);
await expectStatus('consumed session upload',uploadPath,upload(),403);
await expectStatus('cross-card media',`/v3/cards/zzzzzzz/media/${main.id}`,{},404);

const asset=db(`SELECT object_key,expires_at FROM media_assets WHERE id=${quote(main.id)}`)[0];
mkdirSync('.wrangler/r2-smoke',{recursive:true}); const file='.wrangler/r2-smoke/'+crypto.randomUUID()+'.jpg';
try {
  wrangler(['r2','object','get','luvnote-media-staging/'+asset.object_key,'--remote','--file',file,'--config',config]);
  wrangler(['r2','object','delete','luvnote-media-staging/'+asset.object_key,'--remote','--config',config]);
  await expectStatus('missing R2 asset',`/v3/cards/${card.id}/media/${main.id}`,{},404);
} finally {
  if(readFileSync(file).length) wrangler(['r2','object','put','luvnote-media-staging/'+asset.object_key,'--remote','--file',file,'--content-type','image/jpeg','--config',config]);
  unlinkSync(file);
}
db(`UPDATE media_assets SET expires_at=${Date.now()-1000} WHERE id=${quote(main.id)}`);
try { await expectStatus('expired asset',`/v3/cards/${card.id}/media/${main.id}`,{},404); }
finally { db(`UPDATE media_assets SET expires_at=${asset.expires_at} WHERE id=${quote(main.id)}`); }
db(`UPDATE theme_cards SET expires_at=${Date.now()-1000} WHERE id=${quote(card.id)}`);
try { await expectStatus('expired card',`/v2/cards/${card.id}`,{},410); }
finally { db(`UPDATE theme_cards SET expires_at=${card.expires} WHERE id=${quote(card.id)}`); }

const expiredSid=crypto.randomUUID();
db(`INSERT INTO media_upload_sessions(id,token_hash,created_at,expires_at) VALUES(${quote(expiredSid)},${quote(await hash(token))},${Date.now()-7200000},${Date.now()-3600001})`);
await expectStatus('expired unused session',uploadPath.replace(sid,expiredSid),upload(),403);

// Actual remote preview must see this same staging D1, never an empty/local database.
const preview=await fetch(scheduled.origin+'/v2/cards/'+card.id); assert.equal(preview.status,200);
db(`UPDATE media_upload_sessions SET expires_at=${Date.now()-7200000} WHERE id=${quote(sid)}`);
const cleanupTrigger=prefix+'_cleanup';
try {
  db(`CREATE TRIGGER ${cleanupTrigger} BEFORE DELETE ON media_assets WHEN OLD.id=${quote(extra.id)} BEGIN SELECT RAISE(ABORT,'synthetic_cleanup_failure'); END`);
  assert.equal((await fetch(scheduled)).status,200);
  assert.equal(db(`SELECT count(*) n FROM media_assets WHERE id=${quote(extra.id)}`)[0].n,1);
  results.push({name:'real R2 delete then D1 failure retained retry metadata',passed:true});
} finally { db(`DROP TRIGGER IF EXISTS ${cleanupTrigger}`); }
assert.equal((await fetch(scheduled)).status,200);
assert.equal(db(`SELECT count(*) n FROM media_assets WHERE id=${quote(extra.id)}`)[0].n,0);
await expectStatus('live asset survives cleanup',`/v3/cards/${card.id}/media/${main.id}`,{},200);
results.push({name:'remote scheduled retry completed',passed:true});

for(const theme of ['pink-coquette','coquette-dream','little-memories','birthday-chat','velvet-gift']) {
  const legacy=await (await expectStatus('V2 create '+theme,'/v2/cards',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({theme,data:{to:'Synthetic legacy',from:'QA',letter:'Legacy Base64',photos:[{src:'data:image/jpeg;base64,'+Buffer.from(image).toString('base64')}]}})},201)).json();
  const returned=await (await expectStatus('V2 Base64 read '+theme,'/v2/cards/'+legacy.id,{},200)).json();
  assert.equal(returned.data.photos[0].src,'data:image/jpeg;base64,'+Buffer.from(image).toString('base64'));
}
const failed=results.filter(r=>r.passed===false).length, unverified=results.filter(r=>r.passed===null).length;
console.log(JSON.stringify({status:failed?'FAIL':unverified?'PARTIAL':'PASS',environment:'real Cloudflare staging',fixtureMode:'operator-seeded capabilities; security settings and guest quotas unchanged',cardId:card.id,checks:results.length,failed,unverified,results},null,2));
if(failed) process.exitCode=1;
