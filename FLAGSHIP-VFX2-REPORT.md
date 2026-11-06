# Flagship VFX 2.0 — experiment report

The baseline is deployed Preview commit `fa6e3be59b9565d2b738f0018692281172523bfc`. Source, motion storyboard and a complete baseline recording were inspected before editing. The new work is isolated to the Flagship Lab branch and does not alter the sales site or customer data.

## Diagnosis and measured changes

Chrome DevTools Protocol trace plus an instrumented WebGL/RAF probe was run at 390×844 with 4× CPU throttling and ANGLE SwiftShader. Each column below is one run; it is not a statistical study or physical-device benchmark. Long-frame counts are requestAnimationFrame callback intervals over 33.4 ms, not confirmed dropped display frames.

| Measurement | Baseline | Updated local build |
| --- | ---: | ---: |
| Five synchronous texture uploads, total | 873 ms | 42 ms |
| Portal: intervals over 33.4 ms | 8 / 162 | 4 / 155 |
| Portal: worst interval | 200 ms | 67 ms |
| Memory: intervals over 33.4 ms | 3 / 110 | 2 / 109 |
| Memory: worst interval | 317 ms | 100 ms |
| Finale: intervals over 33.4 ms | 4 / 276 | 4 / 279 |
| Finale: worst interval | 500 ms | 83 ms |

The baseline uploads 1200×1800, 1200×800 and 1024×1536 images during critical interactions. Their calls coincide with 145 ms, 306 ms and 454 ms main-thread long tasks. Browser traces also show two deliberately overlapping scene DOM trees during transitions, style/paint work and a 159 ms maximum initial layout; the trace does not provide a trustworthy GPU execution, compositing or GPU-memory breakdown. `compileShader` and `linkProgram` synchronous calls together measured under 1 ms in this run; this excludes deferred driver compilation. A reduced-motion differential removes texture uploads and animation together, so does not isolate each cost on its own. Main-thread instrumentation adds overhead.

The new path decodes and prepares bounded bitmaps ahead of use, retaining original full-resolution DOM artwork. Portal and finale compile and upload their own context resources before activation when possible; WebGL objects are not shared across contexts. A bounded image bitmap cache is reused across scenes, and a central scheduler multiplexes active WebGL animation callbacks and stops when no canvas needs frames or the tab is hidden. Memory rendering stops on exit or after freeze settles. Quality has Ultra, High, Balanced and Lite levels with sustained-window hysteresis; software renderers default to Balanced, while explicit `?quality=ultra|high|balanced|lite` is available for tests. Reduced Motion and unavailable WebGL retain controls and use an interactive CSS photo fallback.

## Visual and interaction changes

The pull on the opening light now also affects the surrounding world before the existing lens opens. A selected memory responds to drag and press-and-hold reverses its scene clock; releasing restores the previous flow, with buttons available. For the finale, photographs travel along deliberate curved light paths toward the lantern, followed by an ordered light formation and personal reveal. The new effects remain 2.5D and shader-based, not a full 3D world or a proven superiority in emotional impact. Existing transition story, artwork, editorial content, replay and skip remain in place.

## Limits and verification

The prototype was tested through real browser engines, but only in emulation on this host; no physical iOS or Android GPU, battery or thermal result is available. Chrome's trace in this environment did not expose meaningful GPU task timing, GPU allocation, overdraw or hardware GPU throttling, so none are represented as measured facts. JS heap and texture object counts over five replay cycles are useful leak checks but do not prove absence of all GPU/browser leaks. Shader effects have finite resolution, especially in Lite/software mode, while the main artwork remains full resolution. Accessibility automation does not replace a screen-reader review. Frame cadence remains imperfect in the software-rendered run; no 60 FPS claim is made.

Detailed recordings, `summary.json`, `probe.json`, and `chrome-trace.json` are retained under the local `evidence/vfx2-before/` and `evidence/vfx2-final2-local/` directories. Reproduce with `scripts/profile-vfx2.mjs`, setting `FLAGSHIP_URL` and `VFX_OUTPUT`. Actual public Preview recordings and a repeat trace are captured separately after deployment. The videos use the same sequence of user actions; the updated finale intentionally takes longer before revealing its message. Browser recordings contain no audio.
