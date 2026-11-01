// Fixed 3 MB scratch space; no imports, network, growth, codec or dynamic code.
// parseJpeg completes synchronously between copy and scan, so isolate requests
// cannot interleave writes to this instance. Never retain a finder across awaits.
export function createJpegMarkerSearchFactory(module) {
  const {memory,next} = new WebAssembly.Instance(module).exports;
  const scratch = new Uint8Array(memory.buffer);
  return bytes => {
    if (bytes.length > 3000000) throw new RangeError('JPEG scan bound');
    scratch.set(bytes);
    return offset => {
      if (!Number.isInteger(offset) || offset < 0 || offset > bytes.length) throw new RangeError('JPEG scan offset');
      return next(offset,bytes.length);
    };
  };
}
