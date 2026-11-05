# Motion and interaction craft

Read when implementing or reviewing animation, gestures, page transitions, media or cinematic sequences.

## Build motion around the message

- Give each experience one **signature interaction**, then use smaller supporting effects.
- Define the interaction's promise, cue, action, feedback, reveal, and replay. The reveal must occur because of the user's action, not at a random timeout.
- Separate entry transition, interaction feedback, emotional reveal, and exit; reserve stillness to make motion meaningful.
- Choose an intentional timing language per theme: weighty/heirloom, lively/playful, dreamy/floating, cinematic/cut, etc. Avoid using the same animation preset in every experience.
- Use realistic spring or ease curves only where they support the material metaphor; don't “bounce” everything.

## Technology choices

- Prefer existing CSS transitions/keyframes for small states.
- Use installed Motion for React for component lifecycle, gesture states and simple orchestrated transitions where it fits the affected component.
- Use installed GSAP timelines where explicit sequencing/scroll staging is required, after checking existing implementation. No gratuitous dependencies or large effects added solely for novelty.
- Use Three.js, shaders or complex canvas effects only if the current request justifies them, the bundle/performance cost is measured, and a low-end fallback exists; don't presume these libraries are already installed.
- Lazy-load optional cinematic views. Scope and clean up every animation, observer, listener, timer and audio resource.

## Input / accessibility contract

For every primary action, document:

| State | Behavior |
| --- | --- |
| Discoverable | Clear affordance that works without hover |
| Touch | Comfortable target, no accidental scroll hijack |
| Keyboard | Focus visible; Enter/Space or a comparable action; no pointer-only gate |
| Assistive tech | Name, role, instructions and status where necessary |
| Interrupted | Can pause, skip or recover without breaking the narrative |
| Reduced motion | Crossfade or direct state change; full content remains readable |
| Audio unavailable | Narrative still works silently; audio starts only on explicit user action |
| Replay | Safe repeat with cleanup and no duplicate triggers |

For drag/swipe/scratch interactions, provide an accessible alternative control. If the experience requires a gesture, give a brief hint and a clear completion state. Never require precision dragging or device sensors to discover essential content.

## Performance guardrails

- Design for mainstream mobile phones and 360px-wide screens; profile before claiming smoothness.
- Prefer transform and opacity over properties causing repeated layout/paint. Use `will-change` narrowly; remove when no longer needed.
- Avoid unnecessary full-screen blur, large layered shadows, unbounded particles, synchronous audio decoding and scroll handlers doing heavy work.
- Pause loops when tab/document isn't active; respect battery and reduced-motion constraints.
- Avoid cumulative layout shift by reserving image space; handle fonts and media loading gracefully.
- Validate real rendered behavior using Playwright and, if available, physical devices. Screenshots cannot validate animation feel by themselves.

## Motion review questions

Does the first interaction feel clearly invited? Is the response immediate? Is the signature animation recognizably different from others? Can the story finish with reduced motion or no audio? Can it be replayed without accumulating listeners? Are the reveal and final frame emotionally effective with real user content?
