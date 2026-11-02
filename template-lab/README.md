# LuvNote Creative Template Lab

Local team preview of twelve independent interactive card prototypes. No card API, database, upload or customer-account connection.

## Shared developer preview

Primary URL: **https://luvnote.fun/mylab/**. At the Owner's request, anyone with the URL can view every prototype without a password or ChatGPT sign-in. This preview is public; noindex and the absence of customer links do not restrict access.

GitHub Pages adds the separately built Lab under `/mylab/` only; it does not connect to the card API or storage. The earlier [Sites snapshot](https://luvnote-template-lab.brsblack79.chatgpt.site/template-lab/) remains a separate preview. See [hosting operations](../docs/CREATIVE-LAB-HOSTING.md).

```sh
npm ci
npm run lab:dev
```

Open **http://127.0.0.1:4317/template-lab/**. The terminal's `/` URL is the repository root; use the full Lab path above.

- Catalogue: `/template-lab/`
- Preview controls: `/template-lab/?template=polaroid`
- Player without Lab chrome: `/template-lab/?play=polaroid`
- Comparison: `/template-lab/?compare=love-letter,polaroid`
- Alternative data: add `&dataset=alternate`
- Still mode: add `&still=1`; OS reduced motion also applies, including live changes.

The controls simulate real iframe viewport widths (390, 768, 1280); the surrounding shell scales them to fit. Tests also exercise 360px. Open the player for unscaled touch testing.

Use **แก้ไขข้อมูลตัวอย่าง** in a preview to edit the Story JSON. Data stays in that page's memory and is delivered to its preview frames only. It is not saved or published. Reloading loses edits. Custom-data full-screen export is intentionally not offered; preset players open in a new tab.

`src/template-lab/data.ts` defines Story/Moment and provides two samples plus `fromCardData(CardData)`. Configuration accepts 1–8 uniquely identified moments, plain text, local paths, HTTPS image URLs and bounded JPEG/PNG/WebP data URLs. Empty legacy photo sets get a fallback. No HTML input is evaluated.

## Build, check and capture

```sh
npm run build
node scripts/check-template-lab-isolation.mjs
npm run lab:build
npm run test:lab
```

For fresh screenshots, keep `lab:dev` running in one terminal and run `npm run lab:capture` in another. It captures the actual players at mobile and desktop sizes, including five opened states, into `template-lab/public/previews/`. No generated mockups are used.

`npm run lab:preview` serves the separate `dist-lab` output on **http://127.0.0.1:4318/template-lab/**. `node scripts/measure-template-lab.mjs` measures diagnostic browser performance against that local built preview.

## Boundaries

- The existing `vite.config.ts`, themes, editors and Worker are unchanged.
- Normal `npm run build` emits `dist`; the Lab emits `dist-lab` with its own public assets.
- Existing deployment workflows upload `dist` only. The new Lab workflow runs checks and uploads test evidence; it has no deployment job or credentials.
- The frontend Pages workflow explicitly builds with `LAB_BASE_PATH=/mylab/`, then runs `node scripts/package-template-lab.mjs` and `npx playwright test --config playwright.mylab.config.ts` before uploading `dist`. Packaging adds only `dist/mylab` and verifies that every existing customer file remains byte-for-byte unchanged. A normal `npm run build` still excludes the Lab.
- Both local servers bind to loopback. Hosted access is public by the Owner's explicit request; `noindex` is advisory, not authentication. The Owner approved `/mylab/` on the main domain; customer navigation and existing card routes are unchanged.
- Nothing here creates a Marketplace, a database or a shared-template service. Hosting uses a single isolated static Site.

See [the complete report](../LUVNOTE-CREATIVE-TEMPLATE-REPORT.md), [source coverage](../docs/evidence/creative-lab-sources.json) and [material notices](public/licenses/NOTICE.md).
