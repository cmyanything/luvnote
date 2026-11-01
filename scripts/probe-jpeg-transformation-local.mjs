// Offline research probe only. No staging deployment, D1, R2 or remote Images calls.
// Miniflare uses Sharp, not Cloudflare's production Images decoder. Its output
// cannot establish remote security, CPU, quota or quality acceptance (in particular,
// this pinned emulator ignores the binding's output quality option).
import {Miniflare, convertV4MiniflareOptions} from 'miniflare';
import {createHash} from 'node:crypto';
import {mkdirSync, writeFileSync} from 'node:fs';
import {jpegCorpus} from '../tests/helpers/jpeg-corpus.mjs';
import {validateJpeg} from '../worker/jpeg.js';

const selected = new Set(['valid-baseline', 'valid-progressive',
  'truncated-entropy-with-EOI', 'corrupt-entropy-all-zero',
  'forged-headers-no-pixels', 'truncated-no-EOI', 'PNG-as-JPEG']);
const mf = new Miniflare(convertV4MiniflareOptions({
  name:'jpeg-transform-local-probe', modules:true, compatibilityDate:'2025-01-01',
  images:{binding:'IMAGES'},
  outboundService:async()=>{throw Error('External fetch is forbidden in this offline probe');},
  script:String.raw`export default { async fetch(req, env) {
    try {
      return (await env.IMAGES.input(req.body).output({format:'image/jpeg',quality:95})).response();
    } catch (error) {
      return Response.json({error:'local_transformation_failed',
        diagnostic:String(error?.message || error).split(/\r?\n/)[0].slice(0,300)}, {status:422});
    }
  }};`,
}));
const rows=[];
try {
  for (const c of jpegCorpus().filter(c=>selected.has(c.name))) {
    const res=await mf.dispatchFetch('http://localhost/probe', {method:'POST', body:c.bytes});
    const output=new Uint8Array(await res.arrayBuffer());
    const row={name:c.name, inputSha256:createHash('sha256').update(c.bytes).digest('hex'),
      legacyAccepts:!!validateJpeg(c.bytes), expectedPolicy:c.accept?'accept':'reject',
      localTransformationStatus:res.status,
      ...(res.ok?{outputBytes:output.length, outputStrictlyDecodable:!!validateJpeg(output),
        outputSha256:createHash('sha256').update(output).digest('hex')}
        :{localFailure:JSON.parse(new TextDecoder().decode(output))}),
    };
    rows.push(row); console.log(JSON.stringify(row));
  }
} finally {await mf.dispose();}
const result={recordedAt:new Date().toISOString(),realCloudflare:false,quotaConsumed:0,
  implementation:'Miniflare 5.20261023.3-beta / Sharp 0.35.5 local emulator',
  warning:'Raw transformation probe, without application pre-parser. Not remote security/CPU/quality acceptance.',rows};
mkdirSync('.wrangler/acceptance',{recursive:true});
writeFileSync('.wrangler/acceptance/full-transformation-local.json',JSON.stringify(result,null,2));
