import {Buffer} from 'node:buffer';

// Staging-only accelerator, not an image decoder. Unlike TextDecoder('latin1'),
// Buffer's Latin-1 is byte-exact and stays a one-byte string. The view is zero-copy.
export function createJpegMarkerSearch(bytes) {
  const text = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('latin1');
  // Exclude stuffed FF00 and restart FFD0..FFD7. Lookbehind starts only at the
  // first FF in a fill run, preventing quadratic retries on FF...FF00 attacks.
  const marker = /(?<!\xff)\xff+[^\x00\xd0-\xd7\xff]/;
  return offset => {
    // Slice makes the scan boundary independent of a preceding FF in the header.
    const match = marker.exec(text.slice(offset));
    return match ? offset + match.index : bytes.length;
  };
}
