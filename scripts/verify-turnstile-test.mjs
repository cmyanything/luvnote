// Uses only Cloudflare public dummy keys. Local D1/R2; real Siteverify network call.
import { workerdFixture } from '../tests/helpers/workerd-env.mjs';
const f = await workerdFixture({ realTurnstile: true });
try {
  const session = await f.session();
  console.log(JSON.stringify({ runtime: 'local workerd', siteverify: 'real Cloudflare, dummy keys only', sessionCreated: !!session.sessionId, remoteR2: false }));
} finally { await f.mf.dispose(); }
