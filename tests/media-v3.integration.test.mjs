import assert from 'node:assert/strict';
import test from 'node:test';
import { fixture, image, sid, token } from './helpers/media-env.mjs';
import { cleanupMediaV3 } from '../worker/media-v3.js';
import { validateJpeg } from '../worker/jpeg.js';
import jpeg from 'jpeg-js';
import { readLimitedBody } from '../worker/guards.js';

test('rejects JPEG-shaped garbage before storing an object', async () => {
  const f = await fixture();
  const fake = new Uint8Array(40); fake.set([255,216,255]); fake.set([255,217],38);
  assert.equal((await f.upload(fake)).status,400);
  assert.equal(f.objects.size,0);
});

test('a D1 completion failure keeps durable cleanup metadata for an R2 object', async () => {
  const f = await fixture();
  f.env.failSQL = query => f.objects.size > 0 && /INSERT INTO media_assets|UPDATE media_upload_jobs SET state='ready'/.test(query);
  f.env.MEDIA.delete = async () => { throw Error('injected R2 delete failure'); };
  assert.equal((await f.upload(image)).status,500);
  assert.equal(f.objects.size,1);
  assert.equal(f.sql.prepare('SELECT count(*) n FROM media_assets').get().n,1);
});

test('rejects JSON null without a server error', async () => {
  const f = await fixture();
  const res = await f.request('/v3/upload-sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:'null'});
  assert.equal(res.status,400);
});

test('expiry between validation and batch cannot consume or publish a session', async () => {
  const f = await fixture();
  f.env.beforeBatch = () => { f.sql.prepare('UPDATE media_upload_sessions SET expires_at=? WHERE id=?').run(Date.now()-1,sid); };
  const res = await f.publish();
  assert.ok([403,409].includes(res.status));
  assert.equal(f.sql.prepare('SELECT used_at FROM media_upload_sessions').get().used_at,null);
  assert.equal(f.sql.prepare('SELECT count(*) n FROM theme_cards').get().n,0);
});

test('real SQLite publication, materialization and binary read preserve decoded pixels', async () => {
  const f = await fixture(); const asset = await (await f.upload()).json();
  const res = await f.publish([{id:asset.id,cap:'Synthetic'}]); assert.equal(res.status,201);
  const card = await res.json(); const returned = await (await f.request('/v2/cards/'+card.id)).json();
  assert.equal(returned.data.photos[0].cap,'Synthetic');
  const media = await f.request(new URL(returned.data.photos[0].src).pathname);
  assert.equal(media.status,200); assert.match(media.headers.get('cache-control'),/no-store/);
  assert.deepEqual(jpeg.decode(new Uint8Array(await media.arrayBuffer())).data,jpeg.decode(image).data);
  assert.equal((await f.request('/v3/cards/zzzzzzz/media/'+asset.id)).status,404);
  f.objects.clear(); assert.equal((await f.request(new URL(returned.data.photos[0].src).pathname)).status,404);
});

test('duplicate upload retries reuse one object and reject changed content or kind', async () => {
  const f = await fixture(), key = crypto.randomUUID();
  const a = await (await f.upload(image,key)).json(), b = await (await f.upload(image,key)).json();
  assert.equal(a.id,b.id); assert.equal(f.objects.size,1);
  assert.equal((await f.upload(image,key,'cover')).status,409);
  const changed = jpeg.encode({width:1,height:1,data:new Uint8Array([0,0,0,255])}).data;
  assert.equal((await f.upload(changed,key)).status,409);
});

test('parallel uploads reserve at most five photo slots', async () => {
  const f = await fixture();
  const results = await Promise.all(Array.from({length:12},()=>f.upload()));
  assert.equal(results.filter(r=>r.status===201).length,5);
  assert.equal(results.filter(r=>r.status===409).length,7);
  assert.equal(f.objects.size,5); assert.equal(f.sql.prepare('SELECT photo_count n FROM media_upload_sessions').get().n,5);
});

test('a full upload session rejects new requests before reading or decoding their body', async () => {
  const f=await fixture(); await Promise.all(Array.from({length:5},()=>f.upload()));
  let reads=0;
  const body=new ReadableStream({pull(c){reads++;c.enqueue(image);c.close();}},{highWaterMark:0});
  const res=await f.request(`/v3/upload-sessions/${sid}/media?kind=photo`,{method:'POST',duplex:'half',headers:{'Content-Type':'image/jpeg','Idempotency-Key':crypto.randomUUID()},body});
  assert.equal(res.status,409); assert.equal(reads,0);
});

test('concurrent duplicate request keys never duplicate R2 writes', async () => {
  const f = await fixture(), key = crypto.randomUUID();
  const results = await Promise.all([f.upload(image,key),f.upload(image,key)]);
  assert.ok(results.some(r=>r.status===201)); assert.equal(f.objects.size,1);
  assert.equal(f.sql.prepare('SELECT count(*) n FROM media_assets').get().n,1);
});

test('concurrent identical publications return the same receipt once', async () => {
  const f = await fixture(); const asset = await (await f.upload()).json();
  const results = await Promise.all(Array.from({length:5},()=>f.publish([{id:asset.id}])));
  assert.ok(results.every(r=>r.status===201));
  const receipts = await Promise.all(results.map(r=>r.json()));
  assert.equal(new Set(receipts.map(r=>r.id)).size,1);
  assert.equal(f.sql.prepare('SELECT count(*) n FROM theme_cards').get().n,1);
  assert.equal((await f.publish([{id:asset.id}],{letter:'Changed'})).status,409);
  assert.equal((await f.upload()).status,403);
});

test('publication batch rollback preserves unattached media and permits retry', async () => {
  const f = await fixture(); const asset = await (await f.upload()).json();
  f.env.failSQL = q => q.startsWith('INSERT INTO media_publications');
  assert.equal((await f.publish([{id:asset.id}])).status,500);
  assert.equal(f.sql.prepare('SELECT count(*) n FROM theme_cards').get().n,0);
  assert.equal(f.sql.prepare('SELECT card_id FROM media_assets').get().card_id,null);
  assert.equal(f.sql.prepare('SELECT used_at FROM media_upload_sessions').get().used_at,null);
  f.env.failSQL = null; assert.equal((await f.publish([{id:asset.id}])).status,201);
});

test('wrong bearer, expired session and missing bearer cannot upload or publish', async () => {
  const f = await fixture();
  const path = `/v3/upload-sessions/${sid}/media?kind=photo`;
  for (const authorization of ['', 'Bearer '+'b'.repeat(64)]) {
    assert.equal((await f.request(path,{method:'POST',headers:{Authorization:authorization,'Content-Type':'image/jpeg','Idempotency-Key':crypto.randomUUID()},body:image})).status,403);
  }
  f.sql.prepare('UPDATE media_upload_sessions SET expires_at=?').run(Date.now()-1);
  assert.equal((await f.upload()).status,403); assert.equal((await f.publish()).status,403);
});

test('foreign session references, duplicate IDs and swapped media kinds are denied', async () => {
  const f = await fixture(); const asset = await (await f.upload()).json();
  assert.equal((await f.publish([{id:asset.id},{id:asset.id}])).status,400);
  assert.equal((await f.publish([],{cover_id:asset.id})).status,400);
  const other = crypto.randomUUID();
  f.sql.prepare('INSERT INTO media_upload_sessions(id,token_hash,created_at,expires_at) SELECT ?,token_hash,created_at,expires_at FROM media_upload_sessions').run(other);
  f.sql.prepare('UPDATE media_assets SET session_id=? WHERE id=?').run(other,asset.id);
  assert.equal((await f.publish([{id:asset.id}])).status,400);
});

test('missing R2 object and unfinished upload intent cannot be published', async () => {
  const f = await fixture(); const asset = await (await f.upload()).json();
  f.objects.clear(); assert.equal((await f.publish([{id:asset.id}])).status,409);
  f.sql.prepare("UPDATE media_upload_jobs SET state='writing'").run();
  assert.equal((await f.publish([{id:asset.id}])).status,400);
});

test('interrupted request streams retain bounded failed intents without R2 objects', async () => {
  const f = await fixture();
  const body = new ReadableStream({ start(c) { c.enqueue(image.subarray(0,20)); c.error(Error('interrupted')); } });
  const res = await f.request(`/v3/upload-sessions/${sid}/media?kind=photo`,{method:'POST',duplex:'half',headers:{'Content-Type':'image/jpeg','Idempotency-Key':crypto.randomUUID()},body});
  assert.equal(res.status,500); assert.equal(f.objects.size,0);
  assert.equal(f.sql.prepare('SELECT photo_count n FROM media_upload_sessions').get().n,1);
  assert.equal(f.sql.prepare('SELECT state FROM media_upload_jobs').get().state,'failed');
});

test('failed R2 put retains a discoverable journal and denies publication', async () => {
  const f = await fixture(); f.env.MEDIA.put = async () => { throw Error('interrupted R2'); };
  assert.equal((await f.upload()).status,500);
  assert.equal(f.sql.prepare('SELECT state FROM media_upload_jobs').get().state,'failed');
  const asset = f.sql.prepare('SELECT id FROM media_assets').get();
  assert.equal((await f.publish([{id:asset.id}])).status,400);
});

test('cleanup retries failed deletes, continues other assets and never deletes legacy cards', async () => {
  const f = await fixture(); await f.upload(); await f.upload();
  f.sql.prepare('UPDATE media_upload_sessions SET expires_at=?').run(Date.now()-7200000);
  f.sql.prepare('INSERT INTO theme_cards VALUES(?,?,?,?,?)').run('old2345','pink-coquette',JSON.stringify({photos:[{src:'data:image/jpeg;base64,/9j/'}]}),0,1);
  const original = f.env.MEDIA.delete; let count=0;
  f.env.MEDIA.delete = async key => { if (++count===1) throw Error('delete unavailable'); await original(key); };
  await assert.rejects(cleanupMediaV3(f.env),/cleanup_incomplete/);
  assert.equal(f.objects.size,1); assert.equal(f.sql.prepare('SELECT count(*) n FROM media_assets').get().n,1);
  await cleanupMediaV3(f.env); assert.equal(f.objects.size,0);
  assert.equal(f.sql.prepare('SELECT count(*) n FROM theme_cards WHERE id=?').get('old2345').n,1);
});

test('orphan reconciliation reclaims late R2 writes but preserves young objects and known assets', async () => {
  const f=await fixture(); await f.upload();
  f.objects.set('v3/lost/late.jpg',image); f.objects.set('v3/lost/young.jpg',image);
  f.env.MEDIA.list=async()=>({truncated:false,objects:[...f.objects.keys()].map(key=>({key,uploaded:new Date(Date.now()-(key.endsWith('young.jpg')?1000:172800000))}))});
  f.env.MEDIA.delete=async keys=>{ for (const key of Array.isArray(keys)?keys:[keys]) f.objects.delete(key); };
  await cleanupMediaV3(f.env);
  assert.equal(f.objects.has('v3/lost/late.jpg'),false); assert.equal(f.objects.has('v3/lost/young.jpg'),true);
  assert.equal(f.objects.size,2);
});

test('cleanup switch blocks all deletion during recovery', async () => {
  const f=await fixture(); await f.upload(); f.env.MEDIA_CLEANUP_ENABLED='false';
  f.env.MEDIA.delete=async()=>{throw Error('must not delete');};
  f.sql.prepare('UPDATE media_upload_sessions SET expires_at=?').run(1);
  await cleanupMediaV3(f.env); assert.equal(f.objects.size,1);
});

test('active card media survives cleanup; expired card and asset reads fail', async () => {
  const f = await fixture(); const asset = await (await f.upload()).json(); const card = await (await f.publish([{id:asset.id}])).json();
  await cleanupMediaV3(f.env); assert.equal(f.objects.size,1);
  f.sql.prepare('UPDATE theme_cards SET expires_at=?').run(Date.now()-1);
  assert.equal((await f.request('/v2/cards/'+card.id)).status,410);
  assert.equal((await f.request('/v3/cards/'+card.id+'/media/'+asset.id)).status,404);
  f.sql.prepare('UPDATE media_assets SET expires_at=?').run(Date.now()-1);
  await cleanupMediaV3(f.env); assert.equal(f.objects.size,0);
});

test('V2 Base64 and V1 reads work without R2 even with V3 uploads disabled', async () => {
  const f = await fixture(); delete f.env.MEDIA; f.env.MEDIA_V3_UPLOADS_ENABLED='false';
  const data = {to:'A',from:'B',letter:'C',photos:[{src:'data:image/jpeg;base64,'+Buffer.from(image).toString('base64'),cap:'old'}]};
  f.sql.prepare('INSERT INTO theme_cards VALUES(?,?,?,?,?)').run('old2345','pink-coquette',JSON.stringify(data),Date.now(),Date.now()+100000);
  assert.deepEqual((await (await f.request('/v2/cards/old2345')).json()).data,data);
  f.sql.prepare('INSERT INTO cards(id,t,to_name,msg,from_name,img,created_at) VALUES(?,?,?,?,?,?,?)').run('v1a2345','rose','A','C','B',Buffer.from(image).toString('base64'),Date.now());
  assert.equal((await f.request('/cards/v1a2345')).status,200);
  assert.equal((await f.request('/cards/v1a2345/img')).status,200);
});

test('V3 kill switch preserves already published media reads', async () => {
  const f = await fixture(); const asset = await (await f.upload()).json(); const card = await (await f.publish([{id:asset.id}])).json();
  f.env.MEDIA_V3_UPLOADS_ENABLED='false'; assert.equal((await f.upload()).status,503);
  assert.equal((await f.request('/v3/cards/'+card.id+'/media/'+asset.id)).status,200);
});

test('JPEG parser rejects EXIF beyond 128KiB, oversized dimensions and truncated entropy', () => {
  const app = Buffer.concat([Buffer.from([255,224,255,255]),Buffer.alloc(65533)]);
  const exif = Buffer.from([255,225,0,8,69,120,105,102,0,0]);
  assert.equal(validateJpeg(Buffer.concat([image.subarray(0,2),app,app,app,exif,image.subarray(2)])),null);
  assert.equal(validateJpeg(Buffer.concat([image.subarray(0,-2),exif,image.subarray(-2)])),null);
  assert.equal(validateJpeg(Buffer.concat([image.subarray(0,Math.floor(image.length/2)),Buffer.from([255,217])])),null);
  const big = Buffer.from(image); const frame = big.indexOf(Buffer.from([255,192])); big[frame+7]=8; big[frame+8]=0;
  assert.equal(validateJpeg(big),null);
});

test('JPEG comments are stripped without changing pixels', () => {
  const comment = Buffer.from([255,254,0,8,...Buffer.from('secret')]);
  const clean = validateJpeg(Buffer.concat([image.subarray(0,2),comment,image.subarray(2)]));
  assert.ok(clean); assert.equal(Buffer.from(clean).includes(Buffer.from('secret')),false);
  assert.deepEqual(jpeg.decode(clean).data,jpeg.decode(image).data);
});

test('write rate guard and D1 quota failures reject requests before R2 writes', async () => {
  const f = await fixture(); f.env.WRITE_LIMITER.limit = async () => ({success:false});
  assert.equal((await f.upload()).status,429); assert.equal(f.objects.size,0);
  delete f.env.WRITE_LIMITER; assert.equal((await f.upload()).status,503);
});

test('read rate guard rejects enumeration before querying card data', async () => {
  const f=await fixture(); f.env.READ_LIMITER={limit:async()=>({success:false})};
  f.env.failSQL=()=>{throw Error('must not query D1');};
  assert.equal((await f.request('/v2/cards/abc2345')).status,429);
  assert.equal((await f.request('/v3/cards/abc2345/media/'+sid)).status,429);
});

test('daily global session budget is enforced across different source IPs', async t => {
  const f=await fixture(); t.mock.method(globalThis,'fetch',async()=>Response.json({success:true,action:'luvnote_media_upload',hostname:'luvnote.fun'}));
  f.sql.prepare('INSERT INTO media_write_budgets VALUES(?,?,?)').run('sessions:global',Math.floor(Date.now()/86400000)*86400000+86400000,100);
  const res=await f.request('/v3/upload-sessions',{method:'POST',headers:{'CF-Connecting-IP':'198.51.100.90'},body:JSON.stringify({turnstileToken:'synthetic'})});
  assert.equal(res.status,429); assert.equal(f.sql.prepare('SELECT count(*) n FROM media_upload_sessions').get().n,1);
});

test('V1 and V2 creation share a bounded legacy write budget', async () => {
  const f=await fixture();
  f.sql.prepare('INSERT INTO media_write_budgets VALUES(?,?,?)').run('legacy:global',Math.floor(Date.now()/86400000)*86400000+86400000,100);
  for (const path of ['/cards','/v2/cards']) assert.equal((await f.request(path,{method:'POST',body:'{}'})).status,429);
});

test('CORS rejects foreign writes and allows localhost only in staging', async () => {
  const f = await fixture();
  for (const origin of ['https://attacker.test','http://localhost:5173']) {
    const res=await f.request('/v3/cards',{method:'POST',headers:{Origin:origin},body:'{}'});
    assert.equal(res.status,403); assert.equal(res.headers.has('access-control-allow-origin'),false);
  }
  f.env.ENVIRONMENT='staging';
  const preflight=await f.request('/v3/cards',{method:'OPTIONS',headers:{Origin:'http://localhost:5173'}});
  assert.equal(preflight.headers.get('access-control-allow-origin'),'http://localhost:5173');
  assert.match(preflight.headers.get('access-control-allow-headers'),/Idempotency-Key/);
});

test('Turnstile action, hostname, failures, replay and test-mode isolation fail closed', async t => {
  const f = await fixture(); let verified={success:true,action:'luvnote_media_upload',hostname:'luvnote.fun'};
  t.mock.method(globalThis,'fetch',async () => Response.json(verified));
  const start = () => f.request('/v3/upload-sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({turnstileToken:'synthetic-token'})});
  assert.equal((await start()).status,201);
  for (const change of [{action:'wrong'},{hostname:'attacker.test'},{success:false,'error-codes':['timeout-or-duplicate']}]) {
    const original=verified; verified={...verified,...change}; assert.equal((await start()).status,403); verified=original;
  }
  f.env.TURNSTILE_TEST_MODE='true'; assert.equal((await start()).status,403);
});

test('session quotas are exact in SQLite and bearer secrets are stored only as hashes', async t => {
  const f=await fixture(); t.mock.method(globalThis,'fetch',async () => Response.json({success:true,action:'luvnote_media_upload',hostname:'luvnote.fun'}));
  const responses=await Promise.all(Array.from({length:8},()=>f.request('/v3/upload-sessions',{method:'POST',body:JSON.stringify({turnstileToken:'synthetic-token'})})));
  assert.equal(responses.filter(r=>r.status===201).length,5); assert.equal(responses.filter(r=>r.status===429).length,3);
  for (const row of f.sql.prepare('SELECT token_hash FROM media_upload_sessions').all()) { assert.match(row.token_hash,/^[a-f0-9]{64}$/); assert.notEqual(row.token_hash,token); }
});

test('JSON bodies are bounded by streamed UTF-8 bytes before parsing', async () => {
  const f=await fixture();
  const large=JSON.stringify({turnstileToken:'ก'.repeat(2000)});
  assert.equal((await f.request('/v3/upload-sessions',{method:'POST',body:large})).status,413);
  for (const body of ['null','[]','1','{broken']) assert.equal((await f.request('/v3/cards',{method:'POST',body})).status,400);
});

test('a stalled body times out rather than accepting the prefix after cancellation', async t => {
  t.mock.timers.enable({apis:['setTimeout']});
  const body=new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('{}'));}});
  const req=new Request('https://example.test',{method:'POST',body,duplex:'half'});
  const pending=readLimitedBody(req,4096);
  const result=assert.rejects(pending,error=>error.status===408);
  await new Promise(resolve=>setImmediate(resolve)); t.mock.timers.tick(20001);
  await result;
});
