// Synthetic inputs shared by local strict-decoder and real-staging acceptance.
import {readFileSync} from 'node:fs';
import jpeg from 'jpeg-js';
export function syntheticJpeg(width=64,height=48,noisy=false,quality=82) {
  const data=new Uint8Array(width*height*4); let seed=1234567;
  for(let i=0;i<data.length;i+=4) {
    for(let c=0;c<3;c++) {seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      data[i+c]=noisy?seed>>>24:Math.round(120+70*Math.sin((i/4%width)/40+c)+30*Math.cos(Math.floor(i/4/width)/32));}
    data[i+3]=255;
  }
  return jpeg.encode({width,height,data},quality).data;
}
export function segments(bytes) {
  const found=[];let offset=2;
  while(offset<bytes.length-2) {
    const start=offset; if(bytes[offset++]!==255)throw Error('fixture marker');
    const marker=bytes[offset++],length=(bytes[offset]<<8)|bytes[offset+1];
    found.push({marker,start,end:offset+length});offset+=length;
    if(marker===0xda)break;
  }
  return found;
}
const join=(...parts)=>Buffer.concat(parts.map(p=>Buffer.from(p)));
const inject=(bytes,marker,payload)=>join(bytes.subarray(0,2),[255,marker,(payload.length+2)>>8,(payload.length+2)&255],payload,bytes.subarray(2));
export function jpegCorpus() {
  const base=syntheticJpeg(),table=segments(base),frame=table.find(x=>x.marker===0xc0),scan=table.find(x=>x.marker===0xda);
  const edit=fn=>{const b=Buffer.from(base);fn(b);return b;};
  const cutEntropy=join(base.subarray(0,scan.end),base.subarray(scan.end,scan.end+1),[255,217]);
  const forged=join(base.subarray(0,scan.end),[255,217]);
  const corrupt=edit(b=>b.fill(0,scan.end,b.length-2));
  const wrongTable=edit(b=>{b[scan.start+5]=0x33;});
  const max=syntheticJpeg(1024,1024,true,60);
  // Quality is chosen deterministically to approach the existing 1,500,000-byte limit.
  let near=max;
  for(let q=61;q<=90;q++) {const b=syntheticJpeg(1024,1024,true,q);if(b.length>1500000)break;near=b;}
  const padding=[];let remaining=1500000-base.length;
  while(remaining>0){const size=Math.min(remaining,65537);if(size<4)throw Error('fixture padding');padding.push(Buffer.alloc(size));padding.at(-1).set([255,254,(size-2)>>8,(size-2)&255]);remaining-=size;}
  const exact=join(base.subarray(0,2),...padding,base.subarray(2));
  return [
    {name:'valid-baseline',bytes:base,accept:true},
    {name:'valid-progressive',bytes:readFileSync(new URL('../fixtures/synthetic-progressive.jpg',import.meta.url)),accept:true},
    {name:'maximum-dimensions',bytes:max,accept:true},
    {name:'near-byte-limit-noisy',bytes:near,accept:true},
    {name:'exact-byte-limit-comments',bytes:exact,accept:true,stripped:true},
    {name:'over-byte-limit',bytes:join(exact.subarray(0,2),[0],exact.subarray(2)),accept:false},
    {name:'malformed-structure',bytes:edit(b=>{b[2]=0;}),accept:false},
    {name:'truncated-no-EOI',bytes:base.subarray(0,-20),accept:false},
    {name:'truncated-entropy-with-EOI',bytes:cutEntropy,accept:false},
    {name:'corrupt-entropy-all-zero',bytes:corrupt,accept:false},
    {name:'undefined-Huffman-table',bytes:wrongTable,accept:false},
    {name:'invalid-marker-length',bytes:edit(b=>{b[4]=255;b[5]=255;}),accept:false},
    {name:'forged-headers-no-pixels',bytes:forged,accept:false},
    {name:'EXIF-GPS',bytes:inject(base,0xe1,Buffer.from('Exif\0\0II*\0GPS synthetic')),accept:false},
    {name:'XMP',bytes:inject(base,0xe1,Buffer.from('http://ns.adobe.com/xap/1.0/\0synthetic')),accept:false},
    {name:'IPTC',bytes:inject(base,0xed,Buffer.from('Photoshop 3.0\0synthetic')),accept:false},
    {name:'embedded-comment',bytes:inject(base,0xfe,Buffer.from('synthetic private comment')),accept:true,stripped:true},
    {name:'APP2-ICC-stripped',bytes:inject(base,0xe2,Buffer.from('ICC_PROFILE\0synthetic')),accept:true,stripped:true},
    {name:'zero-dimensions',bytes:edit(b=>{b[frame.start+5]=0;b[frame.start+6]=0;}),accept:false},
    {name:'dimension-over-1024',bytes:edit(b=>{b[frame.start+7]=4;b[frame.start+8]=1;}),accept:false},
    {name:'excess-pixels',bytes:edit(b=>{b[frame.start+5]=8;b[frame.start+6]=0;b[frame.start+7]=8;b[frame.start+8]=0;}),accept:false},
    {name:'duplicate-frame',bytes:join(base.subarray(0,frame.end),base.subarray(frame.start,frame.end),base.subarray(frame.end)),accept:false},
    {name:'trailing-bytes',bytes:join(base,[1,2,3]),accept:false},
    {name:'PNG-as-JPEG',bytes:Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de','hex'),accept:false},
    {name:'wrong-MIME-valid-JPEG',bytes:base,mime:'image/png',accept:false},
  ];
}
