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
