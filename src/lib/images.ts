export async function jpeg(
  source: string,
  max: number,
  quality: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const scale = Math.min(1, max / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('canvas_unavailable');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => reject(new Error('image_unreadable'));
    image.src = source;
  });
}

// Reject very large phone originals before the browser decodes them into memory.
export const MAX_SOURCE_IMAGE_BYTES = 15 * 1024 * 1024;

export async function readPhoto(file: File, max = 1080): Promise<string> {
  if (file.size > MAX_SOURCE_IMAGE_BYTES) throw new Error('image_too_large');
  const url = URL.createObjectURL(file);
  try {
    return await jpeg(url, max, 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Safari on iPhone/iPad writes an Exif (APP1) block into canvas JPEGs, and the
// upload API rejects any APP1/APP13 segment (it can carry GPS or orientation).
// Canvas already applied orientation, so drop those segments before uploading.
export function stripJpegMetadata(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return bytes;
  const keep: Uint8Array[] = [bytes.subarray(0, 2)];
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return bytes;
    const marker = bytes[offset + 1];
    // Start of scan (or anything without a length): copy the rest unchanged.
    if (marker === 0xda || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0xff) break;
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2 || offset + 2 + length > bytes.length) return bytes;
    if (marker !== 0xe1 && marker !== 0xed) keep.push(bytes.subarray(offset, offset + 2 + length));
    offset += 2 + length;
  }
  if (keep.length === 1 && offset === 2) return bytes;
  keep.push(bytes.subarray(offset));
  const out = new Uint8Array(keep.reduce((n, part) => n + part.length, 0));
  let position = 0;
  for (const part of keep) { out.set(part, position); position += part.length; }
  return out;
}
