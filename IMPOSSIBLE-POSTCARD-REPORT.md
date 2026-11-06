# Impossible Postcard — experiment report

This is one hero-sequence prototype, not a replacement for the production card or the complete Flagship story. The live experiment opens with `?experiment=impossible`. It makes no production API calls, and edited names and messages exist only in memory in the current tab; the prototype does not create a shareable personalized card.

## Creative comparison

Pink Coquette was played through its envelope, gift, candle, photo, letter, scratch and ending scenes in a real Chromium browser. It is materially engaging because each response has a clear physical cause and the recipient is led through changing emotional beats. Its characters, birthday story and gestures were not reused.

The previous Flagship uses full-screen tasks with headings, progress, instructions and next buttons. Its portal and effects add movement around that sequence but do not fundamentally change the page-based rhythm. This prototype starts with a physical image split into paper leaves. Pulling controls the opening continuously, and reversing the gesture closes the opening. Releasing early rolls back; releasing far enough reveals a lighthouse world and a personal message. This is a new interaction grammar, not a claim that independent people found it more surprising.

The visual effect uses CSS 3D folded picture halves and a dynamically clipped existing lighthouse illustration. The world is a flat illustration with modest pointer-driven movement, not a depth-mapped 3D environment, material simulation or true cinematic camera. During the fold the image on the two leaves and the world underneath are at different scales, so duplicated lighthouse details can be visible. This is an honest limitation of the current illusion. The message reveal remains a paper overlay. The result has not yet demonstrated the owner's desired impossible-level quality in a blind evaluation.

## Browser validation on the deployed temporary Preview

Chromium headless, same host and published build, 6 November 2026. A synthetic frame observer covered the entire scripted interaction and five replays; figures include idle frames and are not device FPS benchmarks. Durations are requestAnimationFrame callback intervals, not GPU timings or compositor-presented frames.

| Scenario | p50 interval | p95 interval | intervals >33.34ms | long tasks |
|---|---:|---:|---:|---:|
| Mobile emulation 390×844 | 16.7 ms | 16.7 ms | 1 / 1337 | 0 |
| Desktop 1280×900 | 16.7 ms | 33.3 ms | 54 / 1219 | 1, maximum 58 ms |
| Mobile emulation, CPU ×4 | 16.7 ms | 16.7 ms | 10 / 1365 | 6, maximum 180 ms |
| 320×640, reduced motion | 16.7 ms | 16.7 ms | 2 / 724 | 0 |

Verified forward/reverse gesture, early-release rollback, message, escape, personalized long Thai text, five replays, horizontal/vertical viewport overflow and axe automated checks in each case. No page errors or axe violations were reported in these runs. These are automated checks, not comprehensive accessibility certification. GPU, compositor, shader, actual touch hardware, thermal throttling, device memory and field FPS were not measured. This CSS prototype has no WebGL shader or shader compilation.

No independent evaluators were available: blind comparison with three new people is **Not Tested**. Real iOS and Android devices: **Not Tested**. No causal frame-drop improvement versus VFX 2.0 is claimed because the two sequences and measurement windows differ. A silent side-by-side clip shows each version's normal opening, with different actions appropriate to each version; it is a visual comparison, not a controlled experiment. Full baseline footage of the previous experience was also recorded locally before changes.

## Next acceptance work

Conduct blind observations with three uninvolved people and record whether they discover the gesture and what transformation they describe. Test current iOS Safari and Android Chrome on real devices. Resolve the duplicate-image fold, explore a real depth-separated world with a coherent camera path if it materially improves the illusion, and retest frame delivery and accessibility. Integrate persistent sender data and sharing only as a separately authorized change. Do not present the present prototype as having passed the owner's emotional or real-device gate.
