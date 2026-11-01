import test from 'node:test';
import assert from 'node:assert/strict';
import {jpegCorpus} from './helpers/jpeg-corpus.mjs';
import {validateJpeg,validateJpegNative} from '../worker/jpeg.js';
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
