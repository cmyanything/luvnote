# VFX 2.0 — performance ledger and motion direction

Baseline is the deployed transition-overhaul Preview, commit `fa6e3be59b9565d2b738f0018692281172523bfc`, recorded before changes on Chromium mobile and desktop. Automated Chrome DevTools Protocol traces and in-page probes are in `evidence/vfx2-before/`; the `still=1` differential is in `evidence/vfx2-before-still/`.

## Observed, not inferred

On a 390×844 viewport, Chromium SwiftShader and 4× CPU throttling, one playthrough spent 873 ms in five instrumented `texImage2D` calls: portal 130 ms, memory 299 ms, and three finale uploads totalling 445 ms. These coincide with 145 ms, 306 ms and 454 ms main-thread long tasks respectively. The five sources include 1200×1800 and 1200×800 photographs even though their on-screen GPU surfaces are much smaller. Instrumented synchronous shader compile/link calls total under 1 ms in this run; driver-side compilation and GPU execution are not measured by that number. A `still=1` run has no WebGL texture uploads, but changes other animation too, so it is a differential rather than an isolated proof of all costs.

The normal trace reports 1,617 style updates and 1,352 paints, with up to two stages mounted during intentional overlaps. It shows a 159 ms maximum Layout event. Trace lacks usable GPU task/raster timings in this environment, so no GPU bottleneck or actual device frame rate can be asserted. One app-owned RAF was pending at most in this journey; do not claim overlapping RAFs caused the observed spikes. The memory canvas was still rendered at 1×1 during its outgoing transition before disposal. Images and contexts are loaded/compiled anew at each mount. Finale allocates three textures in one callback. Retained JS heap samples and one pass do not establish a leak; replay testing is required.

## Before building

* Keep the lighthouse and existing story composition as the visual anchor, with the user controlling each major change.
* **World opens:** let the existing lens feel as if it is pulling the actual shore and light into depth, with motion linked to the user's pull. Retain an accessible button and a non-WebGL path.
* **Living memories:** the chosen photo is a tangible object; rotate or move it and let reflected light and water react. A held moment can be reversed and resumed without a random particle burst.
* **Finale:** a calm lantern receives prior photographs, which travel on deliberately converging paths into its warm core, then reveal the personal message. The same artwork remains sharp underneath the effects.
* Prep: decode and resize only GPU textures to their display needs while leaving the original background and photos untouched. Share cached decoded images; avoid a simultaneous upload of three large source images in a critical frame. Schedule active canvases centrally; stop work on hidden/offscreen/frozen scenes, cancel on dispose, and bound resolution with stable adaptive quality tiers.
* Budget: keep canvas resolution and visual detail bounded per tier, never hide the essential interaction in Lite. Use elapsed time rather than frame count. Fallback, context loss, replay and skipping must remain usable.

This is an experiment. Subjective impact must be judged by viewing the resulting recording and actual preview; synthetic timings cannot prove 60 FPS or physical-device quality.
