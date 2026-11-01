import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';

const nativeSearch = process.env.TEST_JPEG_SEARCH === 'native';
const bundle = await build({ entryPoints: [nativeSearch ? 'worker/staging-native.js' : 'worker/index.js'],
  bundle: true, write: false, format: 'esm', platform: 'browser', external: ['node:buffer'] });
export async function workerdFixture({ realTurnstile = false, jpegValidator = process.env.TEST_JPEG_VALIDATOR || 'legacy' } = {}) {
  if (!['legacy','images','images-transform'].includes(jpegValidator)) throw Error('Invalid test JPEG validator');
  const mf = new Miniflare(convertV4MiniflareOptions({
    workers: [{
      name: 'luvnote-test', modules: true, script: bundle.outputFiles[0].text,
      compatibilityDate: '2025-01-01',
      ...(nativeSearch ? {compatibilityFlags:['nodejs_compat']} : {}),
      d1Databases: ['DB'], r2Buckets: ['MEDIA'],
      ...(jpegValidator !== 'legacy' ? {images:{binding:'IMAGES'}} : {}),
      ratelimits: { WRITE_LIMITER: { namespace_id: '472099', simple: { limit: 60, period: 60 } } },
      bindings: { ENVIRONMENT: 'staging', MEDIA_V3_UPLOADS_ENABLED: 'true', MEDIA_CLEANUP_ENABLED: 'true', TURNSTILE_TEST_MODE: 'true',
        MEDIA_JPEG_VALIDATOR: jpegValidator,
        TURNSTILE_HOSTNAMES: 'localhost,127.0.0.1', TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA' },
      ...(realTurnstile ? {} : { outboundService: 'turnstile-double' }),
    }, ...realTurnstile ? [] : [{
      name: 'turnstile-double', modules: true,
      script: `export default { async fetch(req) {
        if (req.url !== 'https://challenges.cloudflare.com/turnstile/v0/siteverify') return new Response('unexpected outbound request',{status:500});
        const data=await req.formData();
        return Response.json({success:data.get('response')==='XXXX.DUMMY.TOKEN.XXXX',action:'test',hostname:'localhost'});
      }};`,
    }]],
  }));
  const db = await mf.getD1Database('DB');
  const schema = await readFile('worker/schema.sql','utf8');
  // Execute each complete statement, including multiline comments, using the actual D1 binding.
  try {
    for (const query of schema.replace(/--[^\n]*/g,'').split(';').map(s=>s.trim()).filter(Boolean))
      await db.prepare(query).run();
  } catch (error) { await mf.dispose(); throw error; }
  const bucket = await mf.getR2Bucket('MEDIA');
  const request = (path, init={}) => mf.dispatchFetch('http://localhost'+path,{
    ...init, headers: { 'CF-Connecting-IP': '192.0.2.50', ...init.headers },
  });
  const session = async () => {
    const res=await request('/v3/upload-sessions',{method:'POST',body:JSON.stringify({turnstileToken:'XXXX.DUMMY.TOKEN.XXXX'})});
    if (res.status!==201) throw Error('session returned '+res.status+': '+await res.text());
    return res.json();
  };
  return { mf, db, bucket, request, session };
}
