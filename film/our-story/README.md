# Our Story — HyperFrames film

A 66-second vertical (1080×1920, 30 fps) film version of the **Our Story** card,
built with [HyperFrames](https://github.com/heygen-com/hyperframes) (HTML + GSAP rendered to MP4).
It is not part of the website build; it lives here so the film can be previewed,
edited and rendered again.

## Scenes

| Time | Scene |
| --- | --- |
| 0–5 s | The book is on screen at the first frame, the cover opens, the camera falls into the first page |
| 5–9 s | "chapter 01 — the beginning", Thai line arrives phrase by phrase |
| 9–13.4 s | Names written left to right like a pen, start date |
| 13.4–18.4 s | Ring draws itself while the days-together counter climbs |
| 18.4–40.4 s | Five polaroids: each arrives a different way (drop, slide, flip, rise, zoom), the photo drifts inside (Ken Burns), the caption is typed |
| 40.4–46.4 s | Film strip of all photos |
| 46.4–55.6 s | The letter slides up and is written line by line |
| 55.6–61 s | Collage of all polaroids, camera pulls back |
| 61–66 s | End card with a heartbeat |

Throughout: dust drifting up, film grain, light leaks on the photo cuts, vignette,
and the same music-box melody as the live card (rendered offline to `assets/audio`).

## Card data → variables

Every customer field is a composition variable on `index.html`
(`her`, `him`, `since`, `days`, `photo1..5`, `cap1..5`, `date1..5`, `line1..4`, `wish`),
so a card's own data can be rendered with `render --variables` / `--batch`.

## Commands

```bash
cd film/our-story
npx hyperframes@0.8.229 check          # lint + runtime + layout + contrast
npx hyperframes@0.8.229 snapshot --at 1,10,20
npx hyperframes@0.8.229 preview        # browser studio
npx hyperframes@0.8.229 render --quality looks -o our-story.mp4
```

Needs Node 22+ and FFmpeg.

## Assets

- `assets/photos/*.jpg` — sample paintings drawn in code (no real people); real cards use the customer's photos.
- `assets/audio/music-box.m4a` — the card's own synthesized music box, rendered offline (original).
- `assets/fonts/` — Mali, Sarabun, Cormorant Garamond from Fontsource (SIL Open Font License, texts included).
- `assets/lib/gsap.min.js` — GSAP 3.15.0 (bundled so renders need no network).
- `assets/tex/grain.png` — seeded noise texture.

Customer photos must never be committed here: this repository is public.
