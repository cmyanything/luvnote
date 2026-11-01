// Verify the real 24-hour orphan grace. This deliberately leaves one synthetic fixture.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync,unlinkSync} from 'node:fs';
import jpeg from 'jpeg-js';
import {stagingTarget,verifyStagingResources,wrangler} from './staging-safety.mjs';
if(process.env.ALLOW_STAGING_WRITE!=='1')throw Error('ALLOW_STAGING_WRITE=1 required');
const endpoint=stagingTarget(process.env.STAGING_API_URL||'');
const {config}=verifyStagingResources();
const db=sql=>JSON.parse(wrangler(['d1','execute','luvnote-staging','--remote','--config',config,'--json','--command',sql])).at(-1).results;
const card=db("SELECT id FROM theme_cards WHERE json_extract(data,'$.letter')='No customer data' ORDER BY created_at DESC LIMIT 1")[0];assert.ok(card);
assert.equal((await fetch('http://127.0.0.1:8788/v2/cards/'+card.id)).status,200,'Remote preview must see actual staging D1');
const key='v3/staging-orphan-'+crypto.randomUUID()+'.jpg';
const image=jpeg.encode({width:16,height:12,data:new Uint8Array(16*12*4).fill(160)},80).data;
mkdirSync('.wrangler/acceptance',{recursive:true});
const source='.wrangler/acceptance/orphan-source.jpg',download='.wrangler/acceptance/orphan-read.jpg';
writeFileSync(source,image);
const before=new Date().toISOString();
try{
 wrangler(['r2','object','put','luvnote-media-staging/'+key,'--remote','--file',source,'--content-type','image/jpeg','--config',config]);
 const after=new Date().toISOString();
 assert.equal(db("SELECT count(*) n FROM media_assets WHERE object_key='"+key+"'")[0].n,0);
 assert.equal((await fetch('http://127.0.0.1:8788/__scheduled')).status,200);
 wrangler(['r2','object','get','luvnote-media-staging/'+key,'--remote','--file',download,'--config',config]);
 assert.deepEqual(readFileSync(download),Buffer.from(image));
 const result={environment:'real Cloudflare staging',freshOrphanRetention:'PASS',objectKey:key,uploadedBetween:[before,after],safeDeletionVerificationAfter:new Date(Date.parse(after)+86400001).toISOString(),agedOrphanDeletion:'NOT_VERIFIED until age cutoff; no test clock or grace override used',fixtureLeftForAgeVerification:true};
 writeFileSync('.wrangler/acceptance/orphan.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{for(const file of [source,download])try{unlinkSync(file);}catch{}}
