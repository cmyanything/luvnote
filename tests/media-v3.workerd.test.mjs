import assert from 'node:assert/strict';
import test from 'node:test';
import { workerdFixture } from './helpers/workerd-env.mjs';
import jpeg from 'jpeg-js';

const image=jpeg.encode({width:24,height:16,data:new Uint8Array(24*16*4).fill(180)},80).data;
const themes=['pink-coquette','coquette-dream','little-memories','birthday-chat','velvet-gift'];

test('native request reader preserves chunked JPEG bytes and rejects unknown-length overflow before R2',async t=>{
  const f=await workerdFixture();t.after(()=>f.mf.dispose());const s=await f.session();
  const stream=(bytes,size)=>{let offset=0;return new ReadableStream({pull(c){if(offset===bytes.length){c.close();return;}c.enqueue(bytes.subarray(offset,Math.min(bytes.length,offset+size)));offset=Math.min(bytes.length,offset+size);}});};
  const upload=body=>f.request(`/v3/upload-sessions/${s.sessionId}/media?kind=photo`,{method:'POST',headers:{Authorization:'Bearer '+s.uploadToken,'Content-Type':'image/jpeg','Idempotency-Key':crypto.randomUUID()},body,duplex:'half'});
  const good=await upload(stream(image,17));assert.equal(good.status,201,await good.clone().text());
  assert.equal((await f.bucket.list()).objects.length,1);
  const bad=await upload(stream(new Uint8Array(1500001),65536));assert.equal(bad.status,413,await bad.clone().text());
  assert.equal((await f.bucket.list()).objects.length,1);
});

test('workerd with local D1/R2: all five themes publish, verify actual bindings and retain V2 reads', async t => {
  const f=await workerdFixture(); t.after(()=>f.mf.dispose());
  for (const theme of themes) {
    const session=await f.session(); const auth={Authorization:'Bearer '+session.uploadToken};
    const uploads=[];
    for (const kind of ['photo','cover']) {
      const res=await f.request(`/v3/upload-sessions/${session.sessionId}/media?kind=${kind}`,{method:'POST',headers:{...auth,'Content-Type':'image/jpeg','Idempotency-Key':crypto.randomUUID()},body:image});
      assert.equal(res.status,201,await res.clone().text()); uploads.push(await res.json());
    }
    const rows=await f.db.prepare('SELECT id,object_key,size FROM media_assets WHERE session_id=?').bind(session.sessionId).all();
    assert.equal(rows.results.length,2);
    for (const row of rows.results) assert.equal((await f.bucket.head(row.object_key)).size,row.size);
    const body=JSON.stringify({theme,sessionId:session.sessionId,data:{to:'Synthetic',from:'Test',letter:'Runtime test',photos:[{id:uploads[0].id,cap:'memory'}],cover_id:uploads[1].id}});
    const results=await Promise.all([1,2].map(()=>f.request('/v3/cards',{method:'POST',headers:auth,body})));
    assert.ok(results.every(r=>r.status===201));
    const [card,retry]=await Promise.all(results.map(r=>r.json())); assert.equal(card.id,retry.id);
    const returned=await (await f.request('/v2/cards/'+card.id)).json(); assert.equal(returned.theme,theme);
    for (const url of [returned.data.cover,returned.data.photos[0].src]) {
      const res=await f.request(new URL(url).pathname); assert.equal(res.status,200);
      assert.deepEqual(jpeg.decode(new Uint8Array(await res.arrayBuffer())).data,jpeg.decode(image).data);
    }
    assert.equal((await f.request('/v3/cards/zzzzzzz/media/'+uploads[0].id)).status,404);
  }
  const legacy={to:'Legacy',from:'Test',letter:'Old',photos:[{src:'data:image/jpeg;base64,'+Buffer.from(image).toString('base64'),cap:'base64'}]};
  await f.db.prepare('INSERT INTO theme_cards VALUES(?,?,?,?,?)').bind('old2345','pink-coquette',JSON.stringify(legacy),Date.now(),Date.now()+100000).run();
  assert.deepEqual((await (await f.request('/v2/cards/old2345')).json()).data,legacy);
});

test('workerd D1 batch really rolls back a failed publication transaction', async t => {
  const f=await workerdFixture(); t.after(()=>f.mf.dispose()); const session=await f.session();
  await f.db.prepare("CREATE TRIGGER reject_publication BEFORE INSERT ON media_publications BEGIN SELECT RAISE(ABORT,'synthetic failure'); END").run();
  const body=JSON.stringify({theme:'pink-coquette',sessionId:session.sessionId,data:{to:'A',from:'B',letter:'C',photos:[]}});
  const post=()=>f.request('/v3/cards',{method:'POST',headers:{Authorization:'Bearer '+session.uploadToken},body});
  assert.equal((await post()).status,500);
  assert.equal((await f.db.prepare('SELECT count(*) n FROM theme_cards').first()).n,0);
  assert.equal((await f.db.prepare('SELECT used_at FROM media_upload_sessions').first()).used_at,null);
  await f.db.prepare('DROP TRIGGER reject_publication').run(); assert.equal((await post()).status,201);
});

test('workerd scheduled handler cleans expired local R2 assets and journals', async t => {
  const f=await workerdFixture(); t.after(()=>f.mf.dispose()); const session=await f.session();
  const response=await f.request(`/v3/upload-sessions/${session.sessionId}/media?kind=photo`,{method:'POST',headers:{Authorization:'Bearer '+session.uploadToken,'Content-Type':'image/jpeg','Idempotency-Key':crypto.randomUUID()},body:image});
  assert.equal(response.status,201); assert.equal((await f.bucket.list()).objects.length,1);
  await f.db.prepare('UPDATE media_upload_sessions SET expires_at=?').bind(Date.now()-7200000).run();
  const worker=await f.mf.getWorker(); await worker.scheduled({cron:'0 * * * *'});
  assert.equal((await f.bucket.list()).objects.length,0);
  assert.equal((await f.db.prepare('SELECT count(*) n FROM media_assets').first()).n,0);
});

test('workerd accepts a bounded maximum-resolution noisy JPEG', async t => {
  const f=await workerdFixture(); t.after(()=>f.mf.dispose()); const session=await f.session();
  const pixels=new Uint8Array(1024*1024*4); let seed=1234567;
  for (let i=0;i<pixels.length;i++) { seed=(Math.imul(seed,1664525)+1013904223)>>>0; pixels[i]=(i%4===3)?255:seed>>>24; }
  const noisy=jpeg.encode({width:1024,height:1024,data:pixels},60).data;
  assert.ok(noisy.byteLength<=1500000);
  const started=performance.now();
  const res=await f.request(`/v3/upload-sessions/${session.sessionId}/media?kind=photo`,{method:'POST',headers:{Authorization:'Bearer '+session.uploadToken,'Content-Type':'image/jpeg','Idempotency-Key':crypto.randomUUID()},body:noisy});
  assert.equal(res.status,201,await res.clone().text());
  console.log(JSON.stringify({event:'local_max_jpeg',pixels:1048576,bytes:noisy.byteLength,wallMs:Math.round(performance.now()-started),cloudflareCPUVerified:false}));
});
