import test from 'node:test';
import assert from 'node:assert/strict';
import {jpegCorpus} from './helpers/jpeg-corpus.mjs';
import {validateJpeg,validateJpegNative,validateJpegTransformed} from '../worker/jpeg.js';
const corpus=jpegCorpus();
test('strict decoder enforces the synthetic JPEG corpus (MIME belongs to the API)',async t=>{
  for(const c of corpus)await t.test(c.name,()=>{
    assert.equal(!!validateJpeg(c.bytes),c.mime?true:c.accept);
  });
});
test('metadata inspection cannot establish the strict decoder contract',async()=>{
  // A metadata-only test double models the documented information contract, not
  // Cloudflare behavior. Real deployed acceptance separately reproduced all 3.
  const infoOnly={async info(){return {format:'image/jpeg',width:64,height:48};}};
  for(const name of ['truncated-entropy-with-EOI','corrupt-entropy-all-zero','forged-headers-no-pixels']) {
    const c=corpus.find(c=>c.name===name);
    assert.equal(validateJpeg(c.bytes),null,name);
    assert.ok(await validateJpegNative(c.bytes,infoOnly),name+': info alone is insufficient');
  }
});
test('native helper fails closed on missing, failed or inconsistent metadata',async()=>{
  const b=corpus[0].bytes;
  for(const images of [undefined,{}, {info:async()=>{throw Error('unavailable');}},
    {info:async()=>({format:'image/png',width:64,height:48})},
    {info:async()=>({format:'image/jpeg',width:63,height:48})},
    {info:async()=>null}])assert.equal(await validateJpegNative(b,images),null);
});

test('full transformation stores bounded sanitized output rather than original bytes',async()=>{
  const input=corpus.find(c=>c.name==='embedded-comment').bytes;
  const output=corpus.find(c=>c.name==='valid-progressive').bytes;
  let calls=0;
  const images={input(stream){return {async output(options){
    calls++; assert.deepEqual(options,{format:'image/jpeg',quality:95});
    assert.deepEqual(new Uint8Array(await new Response(stream).arrayBuffer()),validateJpeg(input));
    return {response:()=>new Response(output,{headers:{'Content-Type':'image/jpeg'}})};
  }};}};
  const result=await validateJpegTransformed(input,images);
  assert.equal(calls,1);assert.deepEqual(result,validateJpeg(output));
  assert.notDeepEqual(result,validateJpeg(input));assert.ok(validateJpeg(result));
});

test('full transformation fails closed on provider, output type/size/dimension or metadata errors',async()=>{
  const input=corpus[0].bytes;
  const responses=[
    ()=>new Response(input,{status:503,headers:{'Content-Type':'image/jpeg'}}),
    ()=>new Response(input,{headers:{'Content-Type':'image/png'}}),
    ()=>new Response(input,{headers:{'Content-Type':'image/jpeg','Content-Length':'3000001'}}),
    ()=>new Response(new Uint8Array(3000001),{headers:{'Content-Type':'image/jpeg'}}),
    ()=>new Response(corpus.find(c=>c.name==='EXIF-GPS').bytes,{headers:{'Content-Type':'image/jpeg'}}),
    ()=>new Response(corpus.find(c=>c.name==='maximum-dimensions').bytes,{headers:{'Content-Type':'image/jpeg'}}),
    ()=>new Response('not an image',{headers:{'Content-Type':'image/jpeg'}}),
  ];
  for(const response of responses)
    assert.equal(await validateJpegTransformed(input,{input:()=>({output:async()=>({response})})}),null);
  for(const images of [undefined,{}, {input(){throw Error('Images 9422 quota reached');}}])
    assert.equal(await validateJpegTransformed(input,images),null);
  let calls=0;
  const unavailable={input(){calls++;throw Error('must not call for marker-invalid/metadata input');}};
  for(const name of ['EXIF-GPS','malformed-structure','truncated-no-EOI','over-byte-limit'])
    assert.equal(await validateJpegTransformed(corpus.find(c=>c.name===name).bytes,unavailable),null);
  assert.equal(calls,0);
});

test('larger generated output does not raise the raw JPEG input limit',async()=>{
  const raw=corpus.find(c=>c.name==='exact-byte-limit-comments').bytes;
  const larger=Buffer.concat([raw.subarray(0,2),Buffer.from([255,254,0,6,0,0,0,0]),raw.subarray(2)]);
  assert.ok(larger.length>1500000);assert.equal(validateJpeg(larger),null);
  const output=await validateJpegTransformed(corpus[0].bytes,{input:()=>({output:async()=>({response:()=>new Response(larger,{headers:{'Content-Type':'image/jpeg'}})})})});
  assert.deepEqual(output,validateJpeg(corpus[0].bytes));
  let calls=0;
  assert.equal(await validateJpegTransformed(larger,{input(){calls++;}}),null);
  assert.equal(calls,0);
});
