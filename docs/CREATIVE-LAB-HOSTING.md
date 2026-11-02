# Private developer Template Lab

URL: **https://luvnote-template-lab.brsblack79.chatgpt.site/template-lab/**

Sign in with the owner's ChatGPT account. Access is currently owner-only, enforced by Sites on all requests, including images, fonts and JavaScript. There are no additional developer grants, groups or external visitors. Sharing the URL alone does not grant access. If the team expands, add only explicitly approved developers through the Site's sharing controls; keep its audience restricted.

## Deployment identity

- Site: `appgprj_6ae80c04c160819193d20e0a1dad6852`
- Audience: `custom`, owner only, access revision `1`
- Saved version: `appgprj_6ae80c04c160819193d20e0a1dad6852~appgver_b9e05d74c1948191b124fff95d5db56c`
- Deployment: `appgdep_6ae80c84c7d88191acda3283e33bcd1b`, `succeeded` at `2026-11-02T04:07:52.732970+00:00`
- LuvNote source: `11571be49a7ad8e2b619a5e8a7bc63e4a9911170`, branch `lab/creative-templates`
- Separate Site source commit: `6dc6ba7c8474c5a0903bba78a521381fb8bf31c2`
- Local Site checkout: `C:\Users\User\Documents\Codex\luvnote-template-lab-site`

The Site checkout contains only the compiled Lab snapshot, `BUILD-PROVENANCE.json` with source identity and file hashes, README and `.openai/hosting.json`. The static output is 80 files / 3,284,786 bytes. No credentials, customer app, API, Worker bindings, database or customer data are included. The root redirects to `/template-lab/`. `robots.txt` and noindex are supplementary; the platform access policy provides the protection.

## Updating or rolling back

1. Check the Lab branch and build the reviewed source with `npm run lab:build`. Do not use the customer `dist` build or the GitHub Pages workflow.
2. Open the **existing** Site using the Sites source workflow and its short-lived credential. Reuse the Site ID above; preserve `.openai/hosting.json` and its static `dist` setting. Do not create another Site or store credentials in files, arguments or Git.
3. Replace the isolated Site's `dist` with `dist-lab`, retaining the root redirect and robots file. Update `BUILD-PROVENANCE.json` with the exact LuvNote commit and asset hashes.
4. Use the Sites source workflow to commit, push and package the exact Site source. Publish with the native owner-private operation, preserving access policy. No customer workflow, DNS or billing changes are needed.
5. Confirm the returned deployment state and repeat anonymous access checks plus authorized catalogue, player, iframe and reset checks. Do not weaken access to make QA work.

To roll back, redeploy a previously saved Site version using the native private deployment operation. There is no customer database migration or data rollback. To withdraw access, use Site hosting controls; retain the restricted audience and source for recovery.

## Acceptance evidence and limits

See [creative-lab-hosting.json](evidence/creative-lab-hosting.json) for actual hosted checks and screenshots. Authorized automation uses the platform service-access header scoped to this exact origin, held in process memory and supplied via hidden stdin. It is not an interactive owner-login test. No tokens, cookies, traces or HAR files are retained.

Sites canonicalizes `index.html` URLs with HTTP 307. Cloudflare also injects its JavaScript detection script before `</body>`. The asset check follows only the expected same-origin canonical redirect and verifies the application HTML is otherwise identical. All non-HTML assets are checked by SHA-256. Neither behavior required changing application code or disabling security protections.

The 170 local Lab tests and passing source CI remain separate from hosted acceptance. Physical phones, LINE WebViews and customer publishing integration are still unverified. This private preview is suitable for developer review, not a launch of the twelve templates to customers.
