import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createJpegMarkerSearchFactory} from '../worker/jpeg-search.js';
import {parseJpeg} from '../worker/jpeg.js';
import {jpegCorpus} from './helpers/jpeg-corpus.mjs';
const createJpegMarkerSearch=createJpegMarkerSearchFactory(new WebAssembly.Module(readFileSync(new URL('../worker/jpeg-scan.wasm',import.meta.url))));

function reference(bytes, offset) {
  while(offset < bytes.length) {
    if(bytes[offset++] !== 255) continue;
    const prefix=offset-1;
    while(bytes[offset]===255)offset++;
    const next=bytes[offset++];
    if(next===0||(next>=0xd0&&next<=0xd7))continue;
    return prefix;
  }
  return bytes.length;
}
test('native marker search preserves every byte value, fill/restart boundary and subarray offset',()=>{
  for(let value=0;value<256;value++)for(let fill=1;fill<=4;fill++) {
    const padded=Buffer.from([9,255,...Array(fill).fill(255),value,34,255,217,9]);
    const bytes=padded.subarray(1,-1),find=createJpegMarkerSearch(bytes);
    for(let offset=0;offset<=bytes.length;offset++)assert.equal(find(offset),reference(bytes,offset));
  }
  // Long non-matching fill runs must terminate with bounded memory.
  const bytes=new Uint8Array(1500000).fill(255);bytes[bytes.length-1]=0;
  assert.equal(createJpegMarkerSearch(bytes)(0),bytes.length);
});
test('accelerated parser preserves sanitized bytes and decisions across corpus and seeded corruptions',()=>{
  const corpus=jpegCorpus();let seed=728352;
  for(const c of corpus)assert.deepEqual(parseJpeg(c.bytes,1500000,createJpegMarkerSearch),parseJpeg(c.bytes),c.name);
  for(let i=0;i<2000;i++){
    const b=Buffer.from(corpus[i%2].bytes);
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    b[seed%b.length]=[0,255,0xd9,0xda,0xd0,(seed>>>16)&255][i%6];
    assert.deepEqual(parseJpeg(b,1500000,createJpegMarkerSearch),parseJpeg(b),'mutation '+i);
  }
});
