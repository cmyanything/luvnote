# Complete recipient experiences: independent review and defect ledger

Date: 2026-11-02. Scope: isolated Template Lab, twelve incumbent worlds and the new local Studio. No customer records, API deployment or customer-sale certification.

The first independent reviewer read all twelve paths and identified missing full messages in eleven worlds, unused story titles, fixed branching prose/object identities, incomplete endings and the inability to preview the exact edited story outside the iframe. The implementation at `fd0b748` keeps one content contract and twelve renderers; it adds actual fields, named keepsakes, editable endings, complete messages/memories, returns and local draft transfer.

## Reproducible functional findings

| Finding | Evidence / differential | Fix |
|---|---|---|
| Custom star cover intercepted target 5 when eight memories were supplied | Full-run timeouts at768/desktop; target5 was underneath the positioned cover; three-memory tests did not exercise that target | Move the cover into the header, outside the star map (`fbc4b85`) |
| Fast WebKit ribbon release did not open the next stage | Pointer instrumentation recorded100px movement and delivered pointerup, but stage remained0. Adding only200ms before release made it work, proving a render/state timing dependency | Derive release distance from pointerup.clientY minus the recorded pointerdown coordinate; drag state is visual only (`ee07390`) |
| A long WebKit editing scenario exceeded30 seconds | All editing, saved/new-tab/reload/delete actions were reached; the full flow subsequently completed in37.1s | Give this many-action test60s; do not increase assertions or gesture thresholds (`ee07390`) |
| Darker resting text still failed hovered contrast | Polaroid computed opacity changed toward0.82 under the incumbent shared hover rule. Axe measured3.95:1. Injecting only opacity1 cleared both Polaroid and Choose violations | Keep hovered text opaque, with subtle brightness feedback instead (`9991e80`) |

Initial dirty-build run:300 passed /10 failed. Intermediate `ee07390` run:304 passed /6 failed (hover contrast only). These are diagnostic runs, not current acceptance. Final source/results are recorded separately in `creative-experiences-verification.json`.

## Independent finish review

A fresh reviewer received the user request and confirmed direction, source paths, the craft floor and actual screenshots without inheriting the build conversation. No detector/context CLI ran because the research checkout lacks its launcher; no detector result is claimed.

The reviewer checked all48 manifest hashes and all twelve opening/end states. It found three additional local finish defects: Diary's nested image exceeded its fixed-height frame and collided with prose; Capsule's blanket relative-position rule displaced its recipient/hint; Studio's native file input expanded the mobile grid to430px. The Studio capture was also half-loaded, so the reviewer returned **recapture**, with provisional observations rather than a binding pass.

One batch at `9991e80` fixes those constraints: Diary frame height follows its viewer, only Capsule's stamp receives relative positioning, and Studio's grid/flex/file controls shrink within available width. The same batch includes the proven hover correction. Regression assertions now check settled shell width and Diary prose/image separation through all eight configured entries.

Replacement evidence uses the same48 recipient views, eight additional Diary layout captures, two Capsule captures with a longer synthetic Thai name and cover, and two Studio views. Studio capture waits for the iframe experience, fonts and actual image decode; mobile and desktop document widths are390 and1280 respectively. A fresh full review of replacements was requested, rather than scoring only the provisional fix table.

The full replacement review validated all48 new captures and resolved all four finish findings. It identified one further supported-input edge case: Studio creates uploaded memories with an optional empty date, but Diary's mobile date tabs hid the remaining title, leaving a blank unnamed button. This was independently reproduced as an empty accessible snapshot and empty visible text.

At `2f2c341`, undated entries show a record number and “ไม่ระบุวันที่”; their explicit accessible label includes the full memory title. The entry header says “ความทรงจำที่5”, without inventing a date. A regression uses an actual Studio upload, applies the draft, selects the named entry and checks the correct content across all five browser projects. Additional captures show the real upload→save→standalone recipient path at390 and1280.

Final independent disposition: **ship**, scoped to the isolated Lab's reviewed finish and resolution of the remaining finding. The reviewer scored the undated-entry issue **resolved** and left no item open on its fix list. The fresh full review had already resolved the earlier four render findings. This is not certification of customer sale, publishing, customer-link/media integration, physical devices or provider playback. The reviewer correctly kept the then-ongoing315-test run separate from its visual/source verdict; actual final counts are recorded in the verification file.

Browser actions and test counts are attributed to the executed Playwright suite. The finish review itself inspects rendered evidence and source, not physical devices or customer publishing.

## Linux CI follow-up: Scrapbook page-turn contrast

The first exact-head PR run at `4001917` failed four Chromium Scrapbook final-state audits (311 passed, 4 failed), despite the earlier local315 run passing. Evidence: [Creative Template Lab run41399327485](https://github.com/cmyanything/luvnote/actions/runs/41399327485). The artifact points to `.scrap-mask > .hand` and, at390px, `.scrap-sign`. This was investigated before merging, without retries or relaxed assertions.

A local runnable probe pauses the real page-turn animation at its start. At opacity0.75, Axe reports the mask at2.95:1 and the green note at2.58:1. Forcing only opacity1 while preserving the animation clears the mask/body findings but leaves the green note at3.63:1. Letting the animation finish produces the same green-note failure, disproving a timing-only explanation. Thus there are two defects: whole-page opacity weakens otherwise adequate text during the turn, and the odd-page note is too light even at rest. The local315 suite had not pinned transition times or audited that odd-page note; slower local execution could reach the already-opaque even page before the final audit.

At `62d68e5`, the page-turn retains its perspective rotation but removes opacity fading, and the odd-page note changes from`#697e66` to`#52654f`. A regression pauses two successive pages at0/190/380ms, checks full opacity and performs the complete WCAG Axe audit at every sample in all five browser projects. The original failed Scrapbook journey plus this regression passed10/10 locally. No audit exclusion, threshold change, retry or wait was introduced to conceal the rendering defect. Final full-suite and exact-head CI outcomes are recorded in the verification/report evidence.

The same independent finish reviewer inspected the four frozen-start captures at390/1280px, verified their manifest hashes and traced the two-line correction. Both findings scored **resolved**; disposition **ship**, scoped to these Scrapbook corrections. The green note now measures5.21:1 against its paper. The reviewer confirmed that the paper palette, asymmetric spread and perspective turn remain intact; it did not claim the then-running320 suite was already a pass. Captures: `creative-experiences-review/scrapbook-contrast-manifest.json`.
