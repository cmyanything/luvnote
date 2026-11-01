import jpeg from 'jpeg-js';
import {readLimitedBody} from './guards.js';

// Reject out-of-bounds JPEG markers, dimensions and EXIF/IPTC metadata without decoding pixels.
// The client normalizes rotation before uploading. Native inspection is experimental, staging only.
export function parseJpeg(bytes, maxBytes = 1500000, createMarkerSearch) {
  if (bytes.length < 32 || bytes.length > maxBytes || bytes[0] !== 255 || bytes[1] !== 216 ||
      bytes[bytes.length-2] !== 255 || bytes[bytes.length-1] !== 217) return null;
  let offset = 2, frame = false, ended = false, scans = 0, frameDimensions = null;
  const parts = [bytes.subarray(0,2)];
  let findMarker;
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
        if (createMarkerSearch) {
          findMarker ??= createMarkerSearch(bytes);
          offset = findMarker(offset);
        } else {
          while (offset < bytes.length) {
            if (bytes[offset++] !== 255) continue;
            const prefix = offset - 1;
            while (bytes[offset] === 255) offset++;
            const next = bytes[offset++];
            if (next === 0 || (next >= 0xd0 && next <= 0xd7)) continue;
            offset = prefix; break;
          }
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
export function validateJpeg(bytes, maxBytes = 1500000) {
  const parsed = parseJpeg(bytes, maxBytes);
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
 * REJECTED for promotion: metadata inspection, opt-in on isolated staging only.
 * Cloudflare Images .info() runs outside the Worker JS JPEG decoder and is free.
 * Actual Cloudflare acceptance admitted truncated/corrupt/missing entropy bytes
 * that strict decoding rejects. Format/dimensions do not certify decodability.
 * Do not enable this implementation for customer uploads or production.
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

/** Staging experiment only: require full JPEG re-encoding, never store the input.
 * The caller enforces the staging environment and a bounded diagnostic budget.
 * Owner-approved policy allows canonical repair, provided only the newly encoded
 * complete image is stored. Input byte/pixel/metadata limits remain unchanged.
 */
export async function validateJpegTransformed(bytes, images, createMarkerSearch) {
  const parsed = parseJpeg(bytes, 1500000, createMarkerSearch);
  if (!parsed || typeof images?.input !== 'function') return null;
  console.log(JSON.stringify({event:'staging_images_transform',phase:'attempt'}));
  try {
    const result = await images.input(new Blob([parsed.bytes]).stream())
      .output({format:'image/jpeg',quality:95});
    const response = result.response();
    if (!response.ok || response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'image/jpeg') return null;
    // High-quality re-encoding can enlarge a valid noisy JPEG. This distinct bound
    // applies only to trusted service OUTPUT, never to the 1.5 MB upload contract.
    const output = await readLimitedBody(response, 3000000);
    if (!output) {
      console.log(JSON.stringify({event:'staging_images_transform',phase:'rejected',reason:'output_size'}));
      return null;
    }
    const clean = parseJpeg(output, 3000000, createMarkerSearch);
    if (!clean || clean.width !== parsed.width || clean.height !== parsed.height) return null;
    console.log(JSON.stringify({event:'staging_images_transform',phase:'complete',bytes:clean.bytes.length}));
    return clean.bytes;
  } catch (error) {
    // Record only a numeric provider code, never its message, URLs or request data.
    const code = /\b(9\d{3})\b/.exec(String(error?.message || ''))?.[1] || null;
    console.log(JSON.stringify({event:'staging_images_transform',phase:'error',code}));
    return null;
  }
}
