# invalid_jpeg investigation — 2026-11-05

## Evidence and experiment ledger

1. Owner's iPhone screenshot shows `invalid_jpeg` on the production Coquette Dream editor. This is an upload rejection, before card publication. No customer photo bytes have been obtained.
2. Source path: PhotoPicker -> readPhoto -> jpeg (canvas encoding) -> uploadJpeg (already-JPEG bytes reused) -> POST media -> validateJpeg -> HTTP 400 invalid_jpeg. The client does not explicitly remove metadata after canvas encoding. The server rejects APP1/APP13, dimensions over 1024, invalid markers and other structural violations.
3. Windows Chromium and Windows WebKit: a 900x675 synthetic canvas JPEG uploads successfully (201) through the actual handler with isolated SQLite and in-memory R2.
4. Production client encoder contract test on Windows: both engines pass, for 900px photos and 700px covers from a 1200x800 synthetic JPEG. This does not exercise Apple's native image encoder.
5. macOS run 41983593630: Chromium passes both sizes. WebKit's 900px JPEG (9,581 bytes) returns **400 invalid_jpeg**. This reproduces the failure with the production client encoder and server handler, without customer data. Runtime code is still unchanged.

Candidates, ranked after reproduction: (1) Apple-generated APP1/APP13 metadata rejected by the server; (2) unsupported frame/scan marker from Apple's JPEG encoder; (3) excessive dimensions/size; (4) broken/truncated entropy. Strict jpeg-js decoding succeeds and width is 900, making (3)/(4) less likely. Next: capture the rejected synthetic bytes, trace the exact rejection, and vary only the rejected segment to falsify the candidate.

No production code or data has been changed during this investigation. The prior text-only production smoke card is not evidence for photo upload compatibility.
