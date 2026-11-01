import jpeg from 'jpeg-js';

// Reject out-of-bounds JPEG markers, dimensions and EXIF/IPTC metadata without decoding pixels.
// The client normalizes rotation before uploading. Native decoding is optional and staging-gated.
function parseJpeg(bytes) {
  if (bytes.length < 32 || bytes.length > 1500000 || bytes[0] !== 255 || bytes[1] !== 216 ||
      bytes[bytes.length-2] !== 255 || bytes[bytes.length-1] !== 217) return null;
  let offset = 2, frame = false, ended = false, scans = 0, frameDimensions = null;
  const parts = [bytes.subarray(0,2)];
  try {
    while (offset < bytes.length) {
      const start = offset;
      if (bytes[offset++] !== 255) return null;
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 0xd9) {
        if (offset !== bytes.length) return null;
        parts.push(bytes.subarray(start)); ended = true; break;
      }
      const length = (bytes[offset] << 8) | bytes[offset+1];
      if (length < 2 || offset + length > bytes.length - 2) return null;
      if (marker === 0xda) {
        if (!frame || ++scans > 20) return null;
        offset += length;
        while (offset < bytes.length) {
          if (bytes[offset++] !== 255) continue;
          const prefix = offset - 1;
          while (bytes[offset] === 255) offset++;
          const next = bytes[offset++];
          if (next === 0 || (next >= 0xd0 && next <= 0xd7)) continue;
          offset = prefix; break;
        }
        parts.push(bytes.subarray(start,offset)); continue;
      }
      if (marker === 0xe1 || marker === 0xed) return null; // EXIF/XMP/IPTC, at any offset.
      if (marker === 0xc0 || marker === 0xc2) {
        const height = (bytes[offset+3] << 8) | bytes[offset+4];
        const width = (bytes[offset+5] << 8) | bytes[offset+6];
        if (length < 8 || bytes[offset+2] !== 8 || ![1,3].includes(bytes[offset+7]) ||
            frame || !width || !height || width > 1024 || height > 1024 || width*height > 1048576) return null;
        frame = true; frameDimensions = { width, height };
      } else if (![0xc4,0xdb,0xdd,0xfe].includes(marker) && !(marker >= 0xe0 && marker <= 0xef)) return null;
      if (!(marker >= 0xe0 && marker <= 0xef) && marker !== 0xfe)
        parts.push(bytes.subarray(start, offset+length));
      offset += length;
    }
    if (!frame || !scans || !ended) return null;
    const clean = new Uint8Array(parts.reduce((n,p) => n+p.length,0));
    let position = 0;
    for (const part of parts) { clean.set(part,position); position += part.length; }
    return { bytes: clean, ...frameDimensions };
  } catch { return null; }
}

/** Legacy strict validation: retains the existing decoder until remote native acceptance passes. */
export function validateJpeg(bytes) {
  const parsed = parseJpeg(bytes);
  if (!parsed) return null;
  try {
    const decoded = jpeg.decode(parsed.bytes, {
      useTArray: true, formatAsRGBA: false, tolerantDecoding: false,
      maxResolutionInMP: 1.05, maxMemoryUsageInMB: 32,
    });
    return decoded.width === parsed.width && decoded.height === parsed.height ? parsed.bytes : null;
  } catch { return null; }
}

/**
 * Experimental native validation, opt-in on isolated staging only.
 * Cloudflare Images .info() runs outside the Worker JS JPEG decoder and is free.
 * A structural check + native format/dimension check is NOT proven equivalent to
 * a full pixel decode for all corrupt entropy streams. Adversarial remote tests
 * are required before enabling this mode on production.
 * Missing/failing binding is fail-closed, never a silent fallback to CPU-heavy JS.
 */
export async function validateJpegNative(bytes, images) {
  const parsed = parseJpeg(bytes);
  if (!parsed || typeof images?.info !== 'function') return null;
  try {
    const stream = new Response(parsed.bytes).body;
    if (!stream) return null;
    const info = await images.info(stream);
    return info?.format === 'image/jpeg' &&
      info.width === parsed.width && info.height === parsed.height
      ? parsed.bytes : null;
  } catch { return null; }
}
