import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

export function stagingTarget(endpoint) {
  const url=new URL(endpoint);
  if (url.protocol!=='https:' || !/^luvnote-api-staging\.[a-z0-9-]+\.workers\.dev$/.test(url.hostname) ||
      url.port || url.username || url.password || url.pathname!=='/' || url.search || url.hash)
    throw Error('Only the isolated luvnote-api-staging workers.dev origin is allowed');
  return url.origin;
}
export function stagingConfig(text) {
  const clean=text.replace(/#[^\n]*/g,'');
  for (const section of clean.matchAll(/^\s*\[+([^\]]+)\]+\s*$/gm))
    if (!['vars','d1_databases','r2_buckets','triggers','ratelimits','images'].includes(section[1])) throw Error('Unexpected staging section');
  for (const key of ['name','database_name','bucket_name','database_id','ENVIRONMENT']) {
    // Rate-limiter names are the only permitted additional `name` keys.
    if (key !== 'name' && [...clean.matchAll(new RegExp('^'+key+'\\s*=','gm'))].length !== 1)
      throw Error('Duplicate or missing staging '+key);
  }
  for (const [section,binding] of [['d1_databases','DB'],['r2_buckets','MEDIA']]) {
    const blocks=[...clean.matchAll(new RegExp('\\[\\['+section+'\\]\\]([\\s\\S]*?)(?=\\n\\s*\\[|$)','g'))];
    if (blocks.length!==1 || !new RegExp('^binding\\s*=\\s*"'+binding+'"\\s*$','m').test(blocks[0][1]))
      throw Error('Invalid staging binding '+section);
  }
  for (const [key,value] of Object.entries({name:'luvnote-api-staging',database_name:'luvnote-staging',bucket_name:'luvnote-media-staging',ENVIRONMENT:'staging'}))
    if (!new RegExp('^'+key+'\\s*=\\s*"'+value+'"\\s*$','m').test(clean)) throw Error('Invalid staging '+key);
  const imageBlocks=[...clean.matchAll(/\[images\]([\s\S]*?)(?=\n\s*\[|$)/g)];
  if (imageBlocks.length > 1 ||
      (imageBlocks.length === 1 && !/^binding\s*=\s*"IMAGES"\s*$/m.test(imageBlocks[0][1])))
    throw Error('Invalid staging Images binding');
  if (/^MEDIA_JPEG_VALIDATOR\s*=\s*"images"\s*$/m.test(clean) && imageBlocks.length !== 1)
    throw Error('Native JPEG validation requires isolated staging IMAGES binding');
  if (/^\s*(routes?|remote)\s*=/m.test(clean) || /\[env\./.test(clean)) throw Error('Staging routes/environments are forbidden');
  const match=/^database_id\s*=\s*"([0-9a-f-]{36})"\s*$/m.exec(clean);
  if (!match) throw Error('A real isolated staging D1 UUID is required');
  return match[1];
}
export function wrangler(args) {
  const res=spawnSync(process.execPath,[resolve('node_modules/wrangler/bin/wrangler.js'),...args],{
    encoding:'utf8',timeout:60000,env:{...process.env,WRANGLER_SEND_METRICS:'false'},
  });
  if (res.status!==0) throw Error('Wrangler staging verification failed: '+args.slice(0,3).join(' '));
  return res.stdout;
}
export function verifyStagingResources(config='wrangler.staging.toml') {
  const id=stagingConfig(readFileSync(config,'utf8'));
  const databases=JSON.parse(wrangler(['d1','list','--json','--config',config]));
  if (!databases.some(db=>db.name==='luvnote-staging' && db.uuid===id) || databases.some(db=>db.name!=='luvnote-staging' && db.uuid===id))
    throw Error('Configured D1 UUID does not match the isolated staging database');
  return {databaseId:id,config};
}
