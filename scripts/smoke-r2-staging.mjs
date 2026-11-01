#!/usr/bin/env node
// Writes one tiny synthetic image to a NON-PRODUCTION staging bucket.
// Never pass private images or real customer data to this test.
import assert from 'node:assert/strict';

const endpoint = (process.env.STAGING_API_URL || '').replace(/\/$/, '');
const target = endpoint ? new URL(endpoint) : null;
if (process.env.ALLOW_STAGING_WRITE !== '1' || !target ||
    target.protocol !== 'https:' || !target.hostname.startsWith('luvnote-api-staging.') ||
    !target.hostname.endsWith('.workers.dev')) {
  throw new Error('Set STAGING_API_URL=https://luvnote-api-staging.<subdomain>.workers.dev AND ALLOW_STAGING_WRITE=1');
}
const photo = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAcFBQYFBAcGBgYIBwcICxILCwoKCxYPEA0SGhYbGhkWGRgcICgiHB4mHhgZIzAkJiorLS4tGyIyNTEsNSgsLSz/2wBDAQcICAsJCxULCxUsHRkdLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCz/wAARCAAIAAgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDz2iiisD9fP//Z', 'base64');
const jsonRequest = async (path, init = {}) => {
  const res = await fetch(endpoint + path, init);
  const data = await res.json();
  if (!res.ok) throw Error(path + ' returned ' + res.status + ': ' + JSON.stringify(data));
  return data;
};
const health = await jsonRequest('/health');
assert.equal(health.ok, true);
const session = await jsonRequest('/v3/upload-sessions', {
  method: 'POST', headers: {'Content-Type':'application/json'},
  body: JSON.stringify({turnstileToken:'XXXX.DUMMY.TOKEN.XXXX'}),
});
assert.match(session.sessionId,/^[0-9a-f-]{36}$/);
assert.match(session.uploadToken,/^[0-9a-f]{64}$/);
const auth = { Authorization: 'Bearer ' + session.uploadToken };
const uploaded = await jsonRequest('/v3/upload-sessions/' + session.sessionId + '/media?kind=photo', {
  method:'POST', headers:{...auth,'Content-Type':'image/jpeg'}, body:photo,
});
assert.match(uploaded.id,/^[0-9a-f-]{36}$/);
const card = await jsonRequest('/v3/cards', {
  method:'POST', headers:{...auth,'Content-Type':'application/json'},
  body:JSON.stringify({theme:'pink-coquette',sessionId:session.sessionId,data:{
    to:'Staging Test',from:'LuvNote',letter:'Synthetic image test',photos:[{id:uploaded.id,cap:'synthetic'}]
  }}),
});
assert.match(card.id,/^[a-z0-9]{7}$/);
const returned = await jsonRequest('/v2/cards/' + card.id);
assert.equal(returned.theme,'pink-coquette');
assert.equal(returned.data.photos[0].cap,'synthetic');
const media = returned.data.photos[0].src;
assert.equal(new URL(media).origin,endpoint);
const imageResponse = await fetch(media);
assert.equal(imageResponse.status,200);
assert.equal(imageResponse.headers.get('content-type'),'image/jpeg');
const bytes = Buffer.from(await imageResponse.arrayBuffer());
assert.deepEqual(bytes,photo);
const wrong = await fetch(endpoint + '/v3/cards/zzzzzzz/media/' + uploaded.id);
assert.equal(wrong.status,404);
const reuse = await fetch(endpoint + '/v3/cards',{method:'POST',headers:{...auth,'Content-Type':'application/json'},body:JSON.stringify({theme:'pink-coquette',sessionId:session.sessionId,data:{to:'A',from:'B',letter:'C',photos:[]}})});
assert.equal(reuse.status,403);
console.log(JSON.stringify({ok:true,environment:'staging',cardId:card.id,mediaBytes:photo.byteLength,cardExpires:card.expires,checked:['upload','publish','compat_read','image_read','cross_card_denied','session_reuse_denied']},null,2));
