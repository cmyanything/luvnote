# Independent review and defect ledger

Date: 2026-11-02. Scope: the new Lab only. Base: a8bc1f386c14f9e48f154573a010b17e07dc6901.

## Independent verifier

The builder and verifier were separate, following the read MengTo Scroll World guidance. The verifier inspected all twelve paths, configuration messages, reduced motion, native dialogs and build isolation; no files or services were mutated by that reviewer.

Initial verdict: fix-then-ship. Two P2 findings were independently reproduced at 390px:

1. `Photo.failed` remained true when selecting a different image. Fix: track the source that failed, so another source can render immediately. Regression: “changing memories recovers from an image error”.
2. A valid 1,000-character Polaroid note exceeded the fixed back and became inaccessible. Fix: bounded, labelled, focusable scroll region. Regression: “long Polaroid notes remain scrollable and keyboard accessible”.

The same verifier independently retested both fixes in Chromium and WebKit at 390px and confirmed closure. It also verified that changing reduced motion live removes the shader and its control. Final verdict for those reviewed fixes: ship.

## Builder's reproducible investigations

| Observation | Differential / evidence | Resolution |
|---|---|---|
| Initial desktop QA: 18 pass, 10 fail | Exact test titles/stats retained in `creative-lab-initial-tests.json`; axe failures retained in `creative-lab-initial-a11y.json` | Corrected measured text contrast and prohibited `aria-label` on unroled spans; full text now has one screen-reader-only copy |
| Configuration stayed on demo | Same validated message sent after mount was accepted; immediate iframe load message was lost | Child registers listener and signals ready; parent checks origin/source and sends configuration then; no timeout/retry loop |
| World test timed out | Pin navigation already collected that location; test searched for its previous button name | Use the stable button within each location and verify idempotent collection |
| WebKit skipped skip-link on Tab | With identical DOM except explicit `tabindex=0`, first Tab reached the skip-link | Explicit tab index on skip-link; native Enter navigation retained |
| GPU toggle survived live reduced-motion change | Motion 14.9 hook implementation snapshots the value; it does not resubscribe to preference changes | Small native media-query subscription via `useSyncExternalStore`; scoped animation cleanup still applies |
| Native Chromium touch did not turn scrapbook page | Unchanged source: `pointerdown → pointercancel`, page 1. Inject only `touch-action:pan-y`: `pointerdown → pointerup`, page 2 | Preserve vertical document scrolling while reserving horizontal swipe for the book. Button alternatives remain |

No assertion thresholds were relaxed to hide those defects. The final report records the final full run separately from exploratory failures and partial reruns.
