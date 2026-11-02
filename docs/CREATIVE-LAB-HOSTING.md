# Shared developer Template Lab

URL: **https://luvnote-template-lab.brsblack79.chatgpt.site/template-lab/**

At the Owner's explicit request on 2 November 2026, access is now **public**: anyone with the URL can view every prototype without a password or ChatGPT sign-in. The Lab remains separate from the customer website, with synthetic content only. Noindex and robots.txt request exclusion from search engines; they do not restrict access.

## Deployment identity

- Site: `appgprj_6ae80c04c160819193d20e0a1dad6852`
- Audience: `public`, access revision `2`, changed at `2026-11-02T04:16:26.998043+00:00`
- Saved version: `appgprj_6ae80c04c160819193d20e0a1dad6852~appgver_b9e05d74c1948191b124fff95d5db56c`
- Current deployment: `appgdep_6ae80ee1c4b8819183828af3b51011a5`, `succeeded` at `2026-11-02T04:17:55.585161+00:00`; redeployed the same saved version under its public audience
- Initial owner-only deployment: `appgdep_6ae80c84c7d88191acda3283e33bcd1b` (historical evidence retained)
- LuvNote source: `11571be49a7ad8e2b619a5e8a7bc63e4a9911170`, branch `lab/creative-templates`
- Separate Site source commit: `6dc6ba7c8474c5a0903bba78a521381fb8bf31c2`
- Local Site checkout: `C:\Users\User\Documents\Codex\luvnote-template-lab-site`

The Site checkout contains only the compiled Lab snapshot, `BUILD-PROVENANCE.json` with source identity and file hashes, README and `.openai/hosting.json`. The static output is 80 files / 3,284,786 bytes. No credentials, customer app, API, Worker bindings, database or customer data are included. The root redirects to `/template-lab/`. Its initial README/provenance describe the original private publication; the access policy and this document reflect the later Owner-authorized change.

## Updating or rolling back

1. Check the Lab branch and build the reviewed source with `npm run lab:build`. Do not use the customer `dist` build or the GitHub Pages workflow.
2. Open the **existing** Site using the Sites source workflow and its short-lived credential. Reuse the Site ID above; preserve `.openai/hosting.json` and its static `dist` setting. Do not create another Site or store credentials in files, arguments or Git.
3. Replace the isolated Site's `dist` with `dist-lab`, retaining the root redirect and robots file. Update `BUILD-PROVENANCE.json` with the exact LuvNote commit and asset hashes.
4. Use the Sites source workflow to commit, push and package the exact Site source. Publish with `save_site_version` then `deploy_site_version`, preserving the current public policy. No customer workflow, DNS or billing changes are needed.
5. Confirm the returned deployment state and repeat anonymous catalogue, player, iframe, assets and reset checks.

To roll back content, redeploy a previously saved Site version using the native deployment operation while preserving the current audience. There is no customer database migration or data rollback. Change the audience only at the Owner's request; access changes may require redeploying the existing saved version before they are reflected in anonymous requests.

## Acceptance evidence and limits

Current anonymous acceptance: [creative-lab-public-access.json](evidence/creative-lab-public-access.json). Initial owner-only checks and screenshots remain in [creative-lab-hosting.json](evidence/creative-lab-hosting.json) as historical evidence. Those older checks used platform service access and do not describe the current audience. No tokens, cookies, traces or HAR files are retained.

Sites canonicalizes `index.html` URLs with HTTP 307. Cloudflare also injects its JavaScript detection script before `</body>`. The asset check follows only the expected same-origin canonical redirect and verifies the application HTML is otherwise identical. All non-HTML assets are checked by SHA-256. Neither behavior required changing application code or disabling security protections.

The 170 local Lab tests and passing source CI remain separate from hosted acceptance. Physical phones, LINE WebViews and customer publishing integration are still unverified. This shared preview is suitable for developer review, not a launch of the twelve templates to customers.
