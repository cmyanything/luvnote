# The Impossible Postcard — creative treatment and storyboard

## Creative reset

VFX 2.0 is not literally scroll-driven: it is a sequence of full-screen tasks, each with a progress counter, heading, instruction, footer and next button. The art is beautiful but the receiver repeatedly leaves one composed page for another. Its portal is a separate canvas over a page change; the memory and finale are separate objects. More shader detail cannot change that basic grammar.

Pink Coquette was played end to end in a browser: a physical envelope, gift, candles, photographs, letter and scratch layer each respond immediately and carry an affectionate rhythm. The lesson is material causality and emotional pacing, not its pink style, birthday narrative, or specific gestures. The new hero is one continuous event rather than another sequence of separate activities.

## Treatment: a place too large for its paper

The receiver finds a single small postcard on a dark, quiet surface. Its little picture is the existing lighthouse illustration. A warm pull tab invites the hand without a paragraph of instructions. As it is pulled, the paper visibly parts and folds: the little picture is not printed on a card but is a window into the same place. The sea and sky extend beyond the edges of the paper until the viewer is inside the world. The torn/folded paper remains at the edges briefly, then settles away. The lighthouse is now touchable: exploring the sea shifts the point of view and touching its light reveals a personal message from the sender. The receiver can close the world back into the postcard and replay it.

## Storyboard and interaction timeline

| Beat | Visual keyframe | User causality and duration |
| --- | --- | --- |
| 1. Found | Small framed lighthouse on an ivory postcard; seal/tab protrudes from the paper. | A single visible instruction: pull the tab. Name/message editing stays secondary. |
| 2. Resistance | Tab moves under the finger; paper begins to bend and separate around the image. | Drag controls the deformation continuously in both directions, not a pre-recorded animation. |
| 3. The impossible interior | The opening follows the pull. Left and right folds peel back at different angles and the sea continues beyond the postcard. | The opening is spatially tied to the same picture; releasing early closes it, releasing past the threshold completes the opening with a short spring-like settle. A button supports tap/keyboard. |
| 4. A place to enter | A full-viewport lighthouse world replaces the tabletop; folded paper has become its frame. | User can drag gently to explore depth and tap the lighthouse beacon. No page-based next navigation. |
| 5. Something left for you | The beacon illuminates a personal message suspended within the scene. | Sender/receiver/message are editable in the prototype, stay in this browser and never call production APIs. Close returns to the same postcard. |

## Motion and production constraints

Use the existing lighthouse and lantern art. A layered CSS 3D paper mechanism and viewport mask are a good fit for a single textured object, direct continuous touch control and a non-WebGL fallback; use WebGL only if it materially improves the result. Use no extra library for a pre-set effect. All deformation must be driven by the user's progress before release. Render a rough animatic before production implementation. Reduce or eliminate depth travel under Reduced Motion while preserving the postcard-to-world reveal and interaction. Cap movement, clean up animation frames/listeners, and keep long Thai messages readable. Sound is opt-in.

## Honest acceptance limits

No independent testers or physical iOS/Android devices are available by default. Blind comparison and real-device performance must be marked **Not Tested** unless real people/devices are actually available; never invent results. A browser emulation and a video can establish visible behaviour, but cannot certify that the illusion surprises new users or is smooth on their phones.
