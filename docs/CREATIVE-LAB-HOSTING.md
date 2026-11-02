# Developer Template Lab on luvnote.fun

Primary URL: **https://luvnote.fun/mylab/** (`/mylab` is the directory URL without its trailing slash).

The Owner explicitly requested this path on the existing website and public access without a password or ChatGPT sign-in. Anyone can view all twelve prototypes. The page has noindex metadata and no link from customer navigation; these are discoverability choices, not access controls. All sample content is synthetic or licensed stock material.

## Deployment

The existing GitHub Pages frontend workflow publishes the Lab. No DNS change, second hosting service, database, Worker deployment, upload permission or billing change is required.

1. Build the normal customer frontend with the existing production variables and rollout guard.
2. Run `node scripts/check-template-lab-isolation.mjs` to confirm the normal build excludes Lab code.
3. Run `npm run lab:build` with `LAB_BASE_PATH=/mylab/`. Its code, sample photos, fonts, screenshots and configuration requests all use that base.
4. Run `node scripts/package-template-lab.mjs`. It copies only into `dist/mylab`, promotes the Lab entry to `dist/mylab/index.html` and verifies every pre-existing customer output hash is unchanged. It refuses to overwrite an existing destination.
5. Run `npx playwright test --config playwright.mylab.config.ts` against the combined static output, then publish through the existing Pages job and its `main` environment policy.

`npm run build` alone continues to exclude the Lab. `npm run lab:build` without the environment variable preserves the standalone/local `/template-lab/` entry. Local Lab tests remain available with `npm run test:lab`.

The Lab still has no customer API, database, upload or publishing connection. Customer theme renderers, editor code, URLs, backend and production configuration are unchanged. Do not interpret a prototype preview as a release of new customer card themes.

## Validation and rollback

- The existing interactive Lab suite verifies all twelve experiences and accessibility in five browser/viewport projects.
- The `/mylab/` suite verifies all twelve nested player routes, image/font loading without requests escaping `/mylab/`, catalogue previews, comparison, iframe interaction/reset and configuration at 360, 390, desktop and mobile WebKit sizes. These are emulated browsers, not physical devices.
- The pre-publication customer baseline is the Pages artifact from source `a8bc1f386c14f9e48f154573a010b17e07dc6901`, run `41367555706`. Local Windows HTML comparisons account only for CR characters before LF; eight non-HTML files match exact hashes. The packaging guard additionally checks the current build's pre-existing files byte-for-byte before/after adding the directory.
- After deployment, verify anonymous `/mylab`, `/mylab/`, all twelve players, iframe/reset, and existing root/editor/card HTML. Use synthetic content only.

To remove the Lab, remove the explicit packaging/build/test steps from the frontend workflow and let its checked deployment publish the normal customer build. A prior successful Pages artifact can also be redeployed while retained. Neither operation needs a database migration. Preserve unrelated subsequent changes when reverting.

## Earlier Sites snapshot (history)

The earlier preview remains at https://luvnote-template-lab.brsblack79.chatgpt.site/template-lab/. It is a separate static snapshot, not the source for the main-domain route. Its Site ID is `appgprj_6ae80c04c160819193d20e0a1dad6852`, saved version 1, public policy revision 2. Its source commit is `6dc6ba7c8474c5a0903bba78a521381fb8bf31c2`, from LuvNote source `11571be49a7ad8e2b619a5e8a7bc63e4a9911170`.

Historical evidence: [initial owner-only acceptance](evidence/creative-lab-hosting.json) and [subsequent anonymous public acceptance](evidence/creative-lab-public-access.json). Those documents describe the older Site URL and must not be presented as proof of the main-domain deployment. Physical phones, LINE WebViews and customer publishing integration remain unverified.
