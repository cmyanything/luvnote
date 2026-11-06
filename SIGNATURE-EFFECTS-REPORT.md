# LuvNote Signature Effects Lab — experiment report

## Scope and equipment
A separate experimental route, `?experiment=signature`, adds three Canvas 2D prototypes to the existing Lab. It does not call the card, account, payment or customer APIs. Edited names, messages, selected image, and gesture history remain in browser memory and are not uploaded or persisted. Image object URLs are revoked when replaced or when the Lab unmounts. Default lighthouse artwork is the existing ImageGen asset created for the earlier Flagship experiment; no customer images or new third-party assets were included.

On this Windows 11 i7-7700 / 32 GB machine, before testing: 8 logical processors, 18% sampled CPU load, 19.4 GB available memory and 83 GB free C: storage. After local tests the point-in-time readings were 1% CPU and 19.2 GB available. These point samples do not prove there was no interference with other workloads. One headless Chromium browser and one test page were used sequentially; no WebGL or forced software rendering was requested, no cloud GPU was used, and no other service was stopped or restarted.

## Mechanisms and candid creative assessment

| Prototype | Mechanism | What it establishes | Remaining creative limitation |
| --- | --- | --- | --- |
| Living Typography | The browser shapes complete lines before their raster is smoothly displaced by the hand. A longer pull reveals the personal message and a seal constructed from whole, shaped repetitions of the name. | Direct continuous input, Unicode-aware grapheme wrapping, user-selected photo subtly colors the ink, keyboard slider. | The result is still an elastic text and rosette treatment; a general audience has not confirmed it is surprising or distinctive enough. It is not a fluid simulation or a guarantee of perfect shaping for every script/font. |
| Impossible Physics | Two windows sample a single periodic image field in opposite directions, bend that sampling by horizontal bands, and show a sliver of the photo through a connecting seam. A swipe carries damped inertia. | The opposite directions were measured with a custom striped image: +21 px on the left and −21 px on the right for the same input in the test viewport. The user's photo changes the material, and their recipient name and message appear within the composition. | This is a mirrored/toroidal 2D coordinate illusion, not physical cloth, 3D space or proof against copying. Its visual surprise can still read as two mirrored windows. |
| Memory Echo | Ordered, bounded points from the receiver's gestures interpolate into samples of a browser-shaped name; then the intact name and personal message appear against the selected photograph. | Different gestures produced different retained paths and transition starting positions; reset restores the original canvas. Keyboard users can deliberately add a named curved stroke. | The final name is intentionally the same for the same sender input; the *journey* differs, not an AI interpretation. With very short or repeated strokes, the reveal can look like ordinary point animation. |

No claim that these mechanisms cannot be copied is made: a distinctive experience requires future design and integration, not secrecy of client-side code. Originality, surprise and emotional impact are subjective. My visual review considers Memory Echo the strongest of the three; A and B need further concept and motion refinement before claiming the requested WOW gate. No independent user study was conducted.

## Functional and accessibility checks
Headless Chromium, mobile viewport 390×844 and small viewport 320×640. Real browser checks covered Thai combining marks and emoji in input, full-message access, slider or keyboard alternatives, local photo selection, changed canvas pixels from gestures, differing recorded paths, reveal, reset, Reduced Motion, no horizontal overflow at 320px, and axe automated checks for each prototype. No JavaScript page errors, HTTP errors, or axe violations were reported in the run. These checks do not certify screen-reader usability, every Thai font, mobile browser compatibility, or emotional quality. A reset regression where Canvas text baseline persisted between frames was reproduced three times, fixed by isolating each draw's context state, and verified three times plus in the full test.

## Short local timing sample (not device FPS)
One headless Chromium page at 390×844, DPR 1. An rAF observer collected browser callback intervals while scripted pointer input and settling ran, including some idle time; it did not measure compositor presentation, GPU time, thermal behaviour or device-level FPS. No explicit software-rendering flag was set.

| Experiment | Samples | Callback interval p50 | p95 | intervals >33.34ms | Long tasks |
| --- | ---: | ---: | ---: | ---: | ---: |
| Living Typography | 193 | 16.7 ms | 16.7 ms | 0 | 0 |
| Impossible Physics | 185 | 16.7 ms | 16.8 ms | 0 | 0 |
| Memory Echo | 250 | 16.7 ms | 16.8 ms | 0 | 0 |

Do not infer 60 FPS on users' devices from these numbers. Actual iOS and Android hardware, GPU/compositor frame presentation, long-duration memory trends, low-memory images and user blind evaluation remain **Not Tested**. This is a Lab prototype: it cannot create or share a real personalized LuvNote card, and personalization is lost on page reload. Before integration, test real touch and accessibility devices and revisit A/B's creative direction.

