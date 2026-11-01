import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stagingTarget, stagingConfig } from '../scripts/staging-safety.mjs';

test('staging smoke rejects production, deceptive hosts, paths and credentials',()=>{
  for (const url of ['https://api.luvnote.fun','http://luvnote-api-staging.demo.workers.dev','https://luvnote-api-staging.evil.test','https://luvnote-api-staging.demo.workers.dev/path','https://user@luvnote-api-staging.demo.workers.dev'])
    assert.throws(()=>stagingTarget(url));
  assert.equal(stagingTarget('https://luvnote-api-staging.demo.workers.dev'),'https://luvnote-api-staging.demo.workers.dev');
});
test('staging config requires isolated resource names and prohibits routes',()=>{
  const text=readFileSync('wrangler.staging.example.toml','utf8').replace('REPLACE_WITH_STAGING_D1_UUID','11111111-1111-4111-8111-111111111111');
  assert.match(stagingConfig(text),/1111/);
  // Native mode cannot silently run against the wrong or missing image service.
  assert.throws(()=>stagingConfig(text.replace(/\[images\][\s\S]*?(?=\n\s*\[|$)/,'[images]\nbinding = "WRONG"\n')));
  assert.throws(()=>stagingConfig(text.replace(/\[images\][\s\S]*?(?=\n\s*\[|$)/,'')));

  for (const bad of [text.replace('luvnote-staging','luvnote'),text.replace('luvnote-media-staging','luvnote-media'),text+'\nroutes = []',text+'\n[env.production]',text+'\n[[r2_buckets]]\nbinding="PROD"\nbucket_name="luvnote-media"'])
    assert.throws(()=>stagingConfig(bad));
});
