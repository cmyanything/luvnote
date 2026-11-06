# Flagship transition storyboard — before implementation

Baseline: public Lab deployment `a56d633b-8890-45b7-b9db-7cd69bc7e6e5`, commit `340e1f9425a95de69fb49f176be23485c3fa535e`. The same complete mobile and desktop journeys are recorded in `evidence/transition-before/` before changing the implementation.

## Diagnosis

Except for the opening portal, the old `next()` uses the same 700 ms scene swap followed by 650 ms of settling. It removes the keyed outgoing stage at the swap, changes only the colour/object of the same full-screen shade, ring, ray and dust, and plays the same camera bridge. The next stage uses the same entrance animation. This explains both the repeated rhythm and the visual discontinuity: the object in the centre is an unrelated overlay, not a continuation from the old scene into the new one. Reduced motion and low-power modes switch directly; the portal shader is an independent entrance, so the hypothesis predicts it should look different from the five following handoffs.

## Motion thesis and sequence

The lighthouse, its warm light, and the recipient's chosen image are the persistent language. Keep the artwork stationary enough to act as a shared world. Preserve the actual old and new stages in overlapping layers during each handoff; the outgoing stage is inert and hidden from assistive technology. A temporary object travels between measured on-screen object positions, so handoff coordinates adapt to the viewport. Each object and reveal has its own timing and geometry rather than a shared full-screen wipe. Under reduced motion or low power, use an immediate clear state change; controls remain usable.

| From → to | Role and narrative bridge | Choreography and settling |
| --- | --- | --- |
| Opening → lantern | Major: existing liquid portal carries the original lighthouse world inward. | Keep its refraction; overlap the incoming lantern stage while the old stage recedes behind the portal, then let it settle. |
| Lantern → compass | Narrative: the lantern the recipient awakened becomes the compass's warm centre. | Carry the lantern from its actual position toward the compass, gently changing orientation and size; the compass ring opens behind it. No full-screen dark veil. |
| Compass → memories | Major: the found direction draws a luminous route; its compass ring unfolds into the memory frame. | Rotate an elliptical ring around the same centre, then stretch it into a rectangular frame as the memory world opens beneath it. Allow a longer deceleration and subtle residual swing. |
| Memory → window | Narrative: the selected photograph becomes a reflection in the misted glass. | Carry the selected photo to the window's actual position, changing its perspective and rounding into the glass; keep both stages visible during the exchange. |
| Window → letter | Narrative: the clean pane catches a fold of paper and becomes an envelope. | A warm paper fold pivots from the pane to the envelope; the surrounding world stays calm, with a shorter, intimate cadence. |
| Letter → finale | Finale handoff: the opened paper returns its words to the lantern before the later interactive finale. | Paper folds toward the lantern, followed by a restrained layered light bloom, then the lantern settles in place. The separate send-light interaction remains under the user's control. |
| Finale → opening (replay) | Return: a quiet release back to the same shore. | Small, short overlapping return with no repeated bloom or spectacle; reset story interaction states once. |

## Safety and verification

One transition may own the stage at a time. Repeated presses cannot advance twice; skip resolves the current destination and cancels pending work; unmount and preference changes cancel timers and transient objects. Check each transition on mobile and desktop, rapid presses, skip, replay, reduced motion and WebGL fallback. Compare full-journey recordings using the same actions; sample intermediate frames for accidental black/white frames or discontinuities. Browser emulation cannot establish physical-phone performance or subjective emotional impact.

## Implementation and evaluation

The outgoing and incoming DOM stages overlap, while a temporary, non-interactive shared object moves between their measured positions. The original liquid opening shader is reused; all other handoffs use bounded DOM/CSS and the Web Animations API. Compass-to-memory changes a ring toward a frame; memory-to-window carries the selected photo; window-to-letter folds a reflection; letter-to-finale folds paper into the lantern with a bounded warm bloom. These are composited visual approximations, not physical 3D simulation. The unchanged, separate send-light finale still follows user interaction. A back control was added under options. During a handoff the stages are inert; skip resolves it and removes the transient object. On replay, state resets after the return completes.

The pre-change recording confirms that the opening had its own shader, while subsequent handoffs repeated a dark shade and ring. The new recording should be evaluated side by side rather than claiming a numerical improvement in emotional impact. The design still shares one lighthouse backdrop and the opening portal is largely unchanged. Intermediate overlap can reveal portions of both scenes; it is intentional, but final taste and timing require owner evaluation.

Automated Playwright runs cover Chromium mobile and desktop, small WebKit, the full story and editor, reduced motion and WebGL fallback. Separate stress runs cover rapid repeated input, skip during the portal, going back and replay in Chromium and WebKit. An axe scan found no automatically detectable violations in the tested scenes. A 390×844 Chromium run with SwiftShader and 4× CPU throttling sampled requestAnimationFrame intervals around each transition: median ~16.7 ms; 95th percentile ~16.7–16.8 ms except the existing portal ~33.3 ms. This is a synthetic software-renderer probe, not physical-phone FPS, battery, thermal, touch or screen-reader validation.
