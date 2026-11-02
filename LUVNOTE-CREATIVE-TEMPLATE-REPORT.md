# LuvNote Creative Template Lab

## Polaroid Memories — พัฒนาเจาะทีละแบบ

รอบล่าสุด `462ad67`: เพิ่มการเลือกความรู้สึกที่ยังจำได้ ฉากอ่านเรื่องวันเก่าจากข้อความจริงทีละช่วง และเซอร์ไพรส์ที่นำภาพกับคำตอบของผู้รับกลับมารวมกัน ย้ายการจัดรูปเป็นกิจกรรมเสริม รายงานและข้อจำกัดรอบนี้อยู่ต้น[รายงาน Polaroid](docs/POLAROID-MEMORIES-EXPERIENCE.md) หลักฐานด้านล่างเป็นรอบก่อนหน้า ไม่ใช่ผลทดสอบของ source ใหม่นี้

Owner ขอให้โฟกัส Polaroid และเพิ่มประสบการณ์เล่นประมาณ3–5นาที รอบนี้ทำเป็น4ช่วง: แกะห่อ → ลูบ/พลิก/ค้นโน้ตหลังรูป → เลือกและจัดรูปโปรดพร้อมเขียนคราวหน้าของเรา/ดาวน์โหลดPNG → อ่านจดหมายและดึงรูปเซอร์ไพรส์ แต่ละ gesture มีปุ่มใช้งานแทนได้ และใช้ข้อมูลจาก Studio เดิม

รายละเอียด เวลาเป้าหมาย ขอบเขต ผลทดสอบและข้อจำกัดอยู่ใน[รายงาน Polaroid](docs/POLAROID-MEMORIES-EXPERIENCE.md). เวลา3–5นาทีเป็นเป้าหมายสำหรับเดโม4รูป ยังไม่มีผู้ใช้จริงจับเวลา ไม่มีตัวจับเวลาบังคับรอหรือ dependency/service ใหม่ อีก11rendererและระบบลูกค้าเดิมคงเดิม

หลักฐานของรอบ12แบบด้านล่างเป็น snapshotก่อนการต่อยอด Polaroid นี้; latest preview/evidence ระบุ source ของตัวเอง

## รอบพัฒนาการ์ดเต็มเรื่อง — 2 พฤศจิกายน 2026

Branch: `feat/complete-template-experiences` · Final recipient source: **`62d68e52346c4ac6c732611d1990e4acabc03c83`**.

Implementation commits: `fd0b748` (12 full stories/Studio), `fbc4b85` (star-cover targets), `ee07390` (fast pointer release), `9991e80` (reading frames/mobile width/hover contrast), `2f2c341` (undated Diary navigation), `62d68e5` (Scrapbook contrast during page turns). `eaae611` preserves the prior main-domain Lab deployment record.

Owner ยืนยันให้คงบุคลิกทั้ง 12 แบบตามแนวเดิม และเพิ่มเนื้อหา/ประสบการณ์ให้ครบ งานรอบนี้จึงขยาย renderer เดิม ไม่สร้าง template engine, database, queue, marketplace หรือ dependency ใหม่ และไม่เปลี่ยนธีมลูกค้าเดิม

### สิ่งที่เปลี่ยนในทั้ง 12 แบบ

| Template | ประสบการณ์ฉบับเต็มที่เพิ่ม | การกลับมาอ่าน |
|---|---|---|
| Love Letter | ปกภาพบนโต๊ะ → เปิดซอง → จดหมายเต็มและภาพแนบทุกความทรงจำ → ป.ล. → คำสัญญา | เลือกภาพแนบ ขยายภาพ พับกลับเข้าซอง |
| Polaroid | รูปที่ปัด/พลิกได้ → บันทึกด้านหลังแต่ละใบ → contact sheet → รูปใบสุดท้ายพร้อมจดหมายลงชื่อ | เลือกภาพตรง ๆ, นับรูปที่อ่านหลังแล้ว, พับรูปสุดท้าย |
| Cinema | คำบรรยายครบตั้งแต่ฉากแรก → ฉากแต่ละความทรงจำ → ฟิล์มย้อนดู → เครดิตส่วนตัวและบันทึกหลังเลนส์ → ฉากต่อไป | เลือกฉาก, ขยายภาพจากฟิล์ม, active scene navigation |
| Stars | สำรวจความทรงจำพร้อมภาพ/วันที่/สถานที่ → นำทางไปดาวที่ยังไม่อ่าน → หอดูดาวพร้อมจดหมายและคำสัญญา | กลับท้องฟ้าโดยเก็บดาวที่ค้นพบไว้ |
| Garden | ดอกไม้แต่ละดอกเล่าเรื่อง → ช่อดอกไม้ → แท็กภาพ/บันทึกของทุกดอก → จดหมายที่ผูกไว้กับช่อ | เลือกแท็กหรือกลับสวนโดยดอกที่บานยังอยู่ |
| Capsule | เปิดกล่อง → ของที่ระลึกที่ผู้ส่งตั้งชื่อและเลือกชนิดเอง → ภาพ/เรื่อง/วันที่ → ช่องลับพร้อมจดหมายลงชื่อ | ไปชิ้นที่ยังไม่เปิด หรือกลับดูของโดยไม่เริ่มใหม่ |
| Scrapbook | สารบัญ → หน้าคู่ที่พลิก/ลอกเทปได้ → บันทึกส่วนตัวจริง → หน้าสุดท้ายและซองคำลับ | เลือกหน้าโดยตรง, ขยายภาพที่เปิดแล้ว, ย้อนหน้าก่อน |
| Little World | พาสปอร์ต/ปก → แผนที่ → รูปและเรื่องแต่ละสถานที่ → ประทับตราด้วยตัวเอง → จดหมายที่บ้าน | กลับแผนที่, การไปถึงสถานที่ไม่แอบนับเป็นเก็บตรา |
| Choose Our Story | คำถาม/ตัวเลือกแก้ได้ → เรื่องระหว่างทาง → 4 ตอนจบที่เขียนเอง → ภาพความทรงจำ/จดหมายของเส้นทาง | ย้อนคำตอบ/เลือกใหม่โดยไม่ต้อง reload |
| Diary | สารบัญวันที่ → บันทึกและ marginalia ส่วนตัวแต่ละวัน → โน้ตพับ → afterword และจดหมายเต็ม | ก่อน/ถัดไปหรือเลือกวันที่ตรง ๆ |
| Constellation | เส้นทางเวลา → ภาพ/เรื่อง/วันที่/สถานที่อ่านได้ทันที → จุดหมายพร้อมคำอุทิศ/จดหมาย | ถอยจุดเวลา, ขยายภาพ, ย้อนวันแรก |
| Grand Surprise | ปกของขวัญ → ริบบิ้น → คำใบ้จากความทรงจำ → เปิดม่าน → รูปทุกใบ/ชื่อโอกาสพิเศษ/จดหมาย/ข้อความลับ | ย้อนรูป เปิดจดหมาย หรือผูกริบบิ้นเริ่มใหม่ |

ทุก renderer รับข้อมูล `Story` ร่วมกัน แต่จัดวางเนื้อหาในวัสดุและลำดับของตัวเอง ไม่มีการต่อ Hero + Gallery + Message แบบเดียวกันท้ายทุกธีม Shared code เพิ่มเฉพาะ content/interaction primitives: `LetterCopy`, `ReadLetter`, `MemoryView`, `RecipientTools`.

### Studio ที่ใช้แต่งการ์ดได้จริง

- แก้ผู้รับ/ผู้ส่ง ชื่อโอกาส วันที่ ปก คำเกริ่น จดหมาย ข้อความลับ และคำปิดท้ายด้วยฟอร์มปกติ
- เพิ่มหลายรูป, เปลี่ยน, ลบ, เรียงลำดับ และใส่ title/date/place/story/aside/alt ของแต่ละรูป รองรับ 1–8 ความทรงจำ
- Capsule เลือกชนิดของที่ระลึก; Choose แก้สองคำถาม สี่ตัวเลือก และสี่ตอนจบได้
- เพลงกล่องดนตรีใช้ Web Audio helper เดิม; YouTube ฝังเมื่อผู้รับกดเปิดเท่านั้น ปิดเพลง/ออกจากหน้า/เริ่มใหม่แล้วหยุด playback
- อัปเดต iframe ผ่าน origin/source checked handshake เดิม; บันทึก/โหลด/ลบร่างใน localStorage และนำเข้า/ส่งออกไฟล์ JSON ได้
- เปิด **ข้อมูลที่แต่งจริง** ในแท็บใหม่และ reload ได้ในเบราว์เซอร์เดียวกัน ร่างหาย/เสียจะแจ้งตรง ๆ ไม่มีการแทนด้วย demo เงียบ ๆ
- JPEG/PNG/WebP ที่เลือกแปลงในเครื่องด้วย helper เดิม จำกัด original 15 MiB, ด้านยาว 1080 px, 750,000 ตัวอักษรต่อ data URL, รวมร่างไม่เกิน 4.5 ล้านตัวอักษร; ตรวจวันที่จริง, ids, URL schemes, choices และ music ก่อนใช้

**ขอบเขตที่ต้องบอกตรง ๆ:** ร่างในเครื่องและไฟล์ร่างเป็นเครื่องมือทดลองสำหรับผู้พัฒนา ยังไม่ใช่ customer share link. ชุดใหม่ยังไม่ได้เพิ่มเข้า allowlist การ publish/R2/แก้การ์ดของ Worker และไม่ได้ตั้งราคา/เปิดชำระเงิน จึงยังไม่รับรองว่า “ขายและส่งลิงก์ลูกค้าได้ทันที”. งาน integration ต้องใช้ระบบเดิมและทดสอบการเผยแพร่/เปิด/แก้/หมดอายุครบ ก่อนเปิดให้ลูกค้าเลือก

### การตรวจและหลักฐานรอบนี้

| คำสั่ง / การตรวจ | ผลที่รันจริง |
|---|---|
| `npm run typecheck` | PASS |
| `npm run build` | PASS; normal customer build ไม่มี Lab |
| `node scripts/check-template-lab-isolation.mjs` | PASS,25ไฟล์ |
| `npm run lab:build` | PASS |
| `npm run test:lab` | **320 passed,0failed,0skipped,0flaky**;64 checks ×5projects,503.7วินาที |
| `LAB_URL=http://127.0.0.1:4318 npm run lab:capture` |48ภาพจริง,0page/HTTPerrors |
| `LAB_BASE_PATH=/mylab/ npm run lab:build` + `node scripts/package-template-lab.mjs` | PASS;เพิ่มเฉพาะ`/mylab` และ25ไฟล์ลูกค้าเดิมไม่เปลี่ยน |
| `npx playwright test --config playwright.mylab.config.ts` | **56 passed,0failed,0skipped,0flaky**,45.3วินาที |
| Independent finish review | ship เฉพาะขอบเขตที่ตรวจ; finding สุดท้าย resolved |

Source/test snapshot SHA-256: **`2b4e644fc1dcc1035b029d4167cb6684f25ec771219fc4e4bdff6b2332c866f5`**. ชุด320รวมการเปิดอ่านทุกความทรงจำและจดหมายส่วนตัวทั้ง12แบบ,1/8รูป,ข้อความไทยยาว,ตอนจบ/ย้อนอ่าน/Reset,upload/replace/remove/reorder/cover,local save/load/import/export/new-tab/reload,4editable endings,invalid data,undated Diary upload,keyboard/touch/modal,hover contrast/axe และ reduced motion. การทดสอบ provider ตรวจ opt-in และการถอด iframe ไม่ได้ทดสอบเพลงจาก YouTube ว่าเล่นจบจริง

ผล final, source hashes และ browser matrix อยู่ใน [verification](docs/evidence/creative-experiences-verification.json); [48 screenshots พร้อม hash ของรอบนี้](https://github.com/cmyanything/luvnote/blob/b9e6e8ea79364cdc2c03f9255d0369f0ec7cc68c/template-lab/public/previews/screenshots.json) มาจาก source commit ด้านบนจริง มีทั้งภาพเปิดและภาพตอนจบเต็มของทุกแบบที่390/1280px ไม่มี page/HTTP error ในการ capture. [Independent review และ defect ledger](docs/evidence/creative-experiences-review.md) บันทึกการตรวจแยก การแก้ไข และ verdict **ship เฉพาะ finish ของ Lab ที่ตรวจ** โดยไม่มี finding ค้างใน fix list

CI บน Linux รอบแรกที่`4001917` พบ311ผ่าน/4ไม่ผ่าน แม้ local315ผ่านก่อนหน้านั้น: แอนิเมชัน Scrapbook ลด opacity ทั้งหน้า และบันทึกสีเขียวบางหน้ามี contrast ไม่พอแม้หยุดเคลื่อนไหว แก้ที่`62d68e5`โดยคงการหมุนหน้า ตัดการจางทั้งแผ่น และเพิ่มความเข้มสีเขียว พร้อม regression ตรวจ0/190/380msทั้งสองรูปแบบหน้าในทุก browser project ไม่เพิ่ม retry/เวลารอหรือยกเว้น Axe ผู้ตรวจแยกให้**ship เฉพาะการแก้สองจุดนี้**;รูปหลักฐานเพิ่ม4ภาพพร้อม[manifest](docs/evidence/creative-experiences-review/scrapbook-contrast-manifest.json). ผลชุดเต็มด้านบนเป็นรอบหลังแก้;ผล CI ของ head ที่เผยแพร่ตรวจได้ที่[PR15](https://github.com/cmyanything/luvnote/pull/15).

ทดสอบ browser emulation ที่360,390,768,1280 และ WebKit/iPhone emulation; ไม่ใช่หลักฐานเครื่อง iPhone/Android จริง การตรวจปุ่มเพลง/iframe ไม่รับรองว่าเพลง YouTube ทุกเพลงเปิดให้ฝังได้ ภาพตัวอย่างเดิมมี license/origin ตาม baseline และไม่ได้เพิ่ม asset/library ที่มีข้อจำกัดการขายใหม่

[Performance diagnostic รอบปัจจุบัน](docs/evidence/creative-experiences-performance.json): Chromium390px,4×CPU throttle,ตัวอย่างสั้นประมาณ900msต่อแบบหลัง full suite จบ; CLSอยู่ที่0–0.0002 และ frame interval p95สูงสุด16.8msในตัวอย่างนี้ มี interaction long tasks บางครั้งตามไฟล์หลักฐาน จึงไม่อ้างว่าเครื่องจริงทุกเครื่องหรือทุกความยาวเนื้อหาจะคง60fpsตลอด ไม่มี dependency เพิ่ม; entry129.45kB gzip, CSS16.06kB gzip, renderer แต่ละแบบ lazy-load และ shader ยังคง opt-in

**GO: เผยแพร่ฉบับเต็มใน developer Lab `/mylab/` ตามที่ขอ**. **ยังไม่เปิด12ธีมใหม่นี้ใน customer publish flow**; ขอบเขต integration ที่เหลือระบุด้านล่าง Rollback ของ Lab ใช้ revert PR/frontend artifact เดิม ไม่ต้องแตะข้อมูลการ์ดหรือ Worker

ตรวจ isolation ของ build ปกติ25ไฟล์ผ่าน และสร้างจาก Git archive แบบLFด้วย frontend vars ของ repository แล้วเทียบSHA-256กับเว็บปัจจุบัน: **ไฟล์ลูกค้าที่เปิดสาธารณะ24/24เหมือนกันทุกไบต์** (`.nojekyll` เป็น Pages marker ไม่ใช่ public route). [หลักฐาน](docs/evidence/creative-experiences-customer-baseline.json). ไม่มีการเปลี่ยน customer editor/theme/Worker/D1/R2/auth/payment/DNS/dependency หรือ API deployment workflow งานเผยแพร่รอบนี้จำกัด `/mylab/` ผ่าน Pages workflow เดิม

**ข้อจำกัดก่อนขายจริง:** ต้องต่อ theme allowlist/payload/editor/publish/read/edit/expiry เข้าระบบเดิมและ R2, ทดสอบ LINE sharing กับลิงก์ลูกค้าจริง และตรวจ physical devices. เริ่ม integration ด้วย Letter/Polaroid ได้ก่อนเพราะลำดับอ่านตรงไปตรงมา แต่ไม่ตัดอีก10แบบออกจากงานที่ส่งมอบ รอบนี้ทั้ง12แบบมี full-story experience และ Studio ครบใน Lab แล้ว

อ่านรายละเอียด baseline ที่ศึกษา Skills/Licenses และ audit ระบบเดิมด้านล่าง โดย **จำนวน 170 tests และสถานะ Working prototype ด้านล่างเป็นผลรอบก่อน ไม่ใช่ final acceptance ของรอบพัฒนานี้**.

---

## Prototype baseline และการศึกษาแหล่งที่มา (ประวัติ)

วันที่ตรวจ baseline: 2 พฤศจิกายน 2026 · Branch: `lab/creative-templates`

## ผลส่งมอบและวิธีเปิด

สร้างต้นแบบ Interactive 12 แบบในพื้นที่ทดลองแยก พร้อม Catalogue, เปรียบเทียบสองแบบ, Mobile / Tablet / Desktop, Reset, ข้อมูลตัวอย่างสองชุด, JSON configuration, ข้อมูลที่มาของ Skills และภาพหน้าจอจากหน้าเว็บจริง

```sh
npm ci
npm run lab:dev
```

เปิด **http://127.0.0.1:4317/template-lab/**

เว็บทดลองสำหรับผู้พัฒนาตาม URL ที่ Owner ขอ: **https://luvnote.fun/mylab/** — ผู้มีลิงก์ดูได้ทุกแบบโดยไม่ต้องใส่รหัสหรือลงชื่อเข้าใช้ ยังคง noindex แต่ไม่ได้จำกัดสิทธิ์ผู้ชม. รายละเอียดการเผยแพร่ผ่าน GitHub Pages เดิมใน [hosting operations](docs/CREATIVE-LAB-HOSTING.md). [Sites snapshot เดิม](https://luvnote-template-lab.brsblack79.chatgpt.site/template-lab/) และหลักฐาน anonymous access ของ snapshot นั้นเก็บเป็นประวัติแยก

คู่มือ: [template-lab/README.md](template-lab/README.md) · โค้ด: [src/template-lab](src/template-lab) · ภาพ: [template-lab/public/previews](template-lab/public/previews)

**สถานะ:** Working prototypes สำหรับเลือก Creative Direction และพัฒนาต่อ Owner ขอเผยแพร่หน้า Lab เพิ่มที่ `/mylab/` บนเว็บหลักโดยตรงผ่าน frontend deployment เดิม ยังไม่ได้เชื่อมเผยแพร่การ์ดหรือเปิดเป็นธีมให้ลูกค้า และไม่ได้เปลี่ยน backend production ของ LuvNote

**LAB_PROTOTYPE_ACCEPTANCE = PASS** — `npm run test:lab`: **170 passed, 0 failed, 0 skipped, 0 flaky** (34 checks x 5 projects, 216.6 วินาที). TypeScript, production build และ Lab build ผ่าน; production isolation ตรวจ 25 output files ผ่าน.

Implementation commit: **`c555b7f6e9ecb7521526a5a1a596372e07b0c9f6`**

Source/test snapshot SHA-256: `044e2ca99cf41e4e13642d225f72a41bb7c210ada80ec820a94d548877e033c4`

หลักฐาน: [ผล final แยกตาม project และ file hash](docs/evidence/creative-lab-verification.json) · [34 screenshots พร้อม hash](template-lab/public/previews/screenshots.json) · [independent review/defect ledger](docs/evidence/creative-lab-review.md). ตรวจเทียบ source/test hashes กับ implementation commit แล้ว

**GO สำหรับหน้า Lab เพื่อเลือกต้นแบบ / NO-GO สำหรับใช้ต้นแบบสร้างการ์ดลูกค้าจริงตอนนี้**: ต้องทำ integration และ physical-device acceptance ของแบบที่เลือกก่อน; exploratory system audit เดิมยังมี WebKit failure ที่ไม่ได้อ้างว่าปิดแล้ว

## 1. Repository audit

- ก่อนเริ่ม: branch `perf/r2-native-jpeg-validation`, commit `bfe6bfde407fa763998d352b8ef60507196804c5`, working tree สะอาด ทำ `git fetch origin` แล้วสร้าง branch ทดลองจาก `origin/main` ที่ **`a8bc1f386c14f9e48f154573a010b17e07dc6901`** ไม่ย้อนกลับไปพัฒนาจาก R2 branch เก่า
- ระบบจริง: React 19 + TypeScript + Vite 8; CSS ปกติ ไม่มี Tailwind หรือ React Router; หน้า HTML หลาย entry และ URL/hash สำหรับลิงก์เดิม
- ปัจจุบันมี **6 ธีม**: Pink Coquette, Coquette Dream, Little Memories, Birthday Chat, Velvet Gift และ Anniversary Journey/Our Story ซึ่งมี Journal กับ Movie ที่ใช้ GSAP 3.15 อยู่แล้ว
- `src/themes.ts` กำหนด editor/config, `src/types.ts` มี `CardData`, `Photo`, `EditorState`; `src/lib/card.ts` สร้าง payload/ลิงก์; `src/lib/api.ts` และ `media-v3.ts` ติดต่อ API ส่วน card runtime เดิมส่วนใหญ่ยังเป็น standalone HTML; Anniversary ใช้ React
- การจัดเก็บเดิมเป็น Worker/D1/R2 ตามเส้นทาง API ที่มีอยู่ การทำ Lab ไม่เปลี่ยนวิธีสร้าง เก็บ แก้ไข หรือตรวจสิทธิ์การ์ดเหล่านั้น
- พบฉาก `.scene`/`inUp` และลำดับเปิดของขวัญ → อัลบั้ม → จดหมาย/ความลับคล้ายกันในธีมเดิมหลายแบบ จึงแยก interaction model ของต้นแบบใหม่ตั้งแต่ระดับ state และ composition
- ไม่มีไฟล์เดิมใน `worker/`, `themes/`, `src/Editor.tsx`, `src/components/`, `src/lib/`, `src/anniversary/`, `wrangler.toml` หรือ `vite.config.ts` ถูกแก้จาก base ดังกล่าว

## 2. โครงสร้างที่เลือก

`vite.lab.config.ts` มี entry และ public directory ของตัวเอง → `dist-lab/`; build ปกติยังออก `dist/` และไม่มี Lab. ตามคำขอ Owner ล่าสุด frontend workflow จึง build Lab แยกด้วย base `/mylab/` แล้วเพิ่มเฉพาะ `dist/mylab` ก่อน deploy โดยตรวจ hash ว่าไฟล์ลูกค้าเดิมไม่เปลี่ยน ไม่มีการเพิ่มปุ่ม Lab ในหน้าเว็บลูกค้า

แต่ละเทมเพลตเป็น React component แยกไฟล์ รับ `Story` เดียวกันผ่าน props ไม่อ่านข้อมูลลูกค้าหรือเรียก API. `fromCardData()` เป็น adapter ขนาดเล็กสำหรับทดลองนำข้อมูลจากระบบจริงมาใช้ในอนาคตโดยไม่ต้องเขียน renderer ใหม่ รองรับไม่มีรูปและกรอง scheme ของ URL ภาพ

Shared code: `Button`, `Icon`, `Photo` พร้อม fallback, native `Modal`, `AnimatedGroup`, `Words`, `Flower`, live reduced-motion subscription และ `useScrollParallax` ที่ cleanup ด้วย GSAP context ไม่มี plugin engine, template database, queue หรือ Marketplace

ข้อมูลตัวอย่างเก็บเฉพาะในหน่วยความจำของหน้า Lab: เปลี่ยนผู้ส่ง ผู้รับ ข้อความ วันที่ และ moments 1–8 รายการได้; ตรวจ JSON, id ไม่ซ้ำ และ URL ภาพก่อนส่งให้ iframe. Preview แจ้งพร้อมรับข้อมูลแล้วจึงรับ configuration โดยตรวจ origin และ source. ไม่มี persistence หรือ export ลิงก์ข้อมูลแก้ไขข้ามหน้าต่าง

Dependencies ใหม่เป็น dev dependencies: `motion@14.9.0`, `@paper-design/shaders-react@0.0.82`, `@axe-core/playwright@4.14.0` ไม่ถูก import จาก entry ของเว็บจริง ติดตั้งด้วย `--ignore-scripts`; ไม่รัน installation hooks จาก repository ภายนอก

## 3. Sources verification และ Skills Coverage Matrix

ตรวจครบ 14 repositories ผ่าน GitHub, README/แนวติดตั้ง, SKILL ที่เกี่ยวข้อง และ License. ทุก repository มีอยู่จริงและไม่ archived ณ เวลาตรวจ; ไม่ได้หมายความว่าทุก CLI หรือทุก component ถูกติดตั้ง/ทดสอบ

บันทึก commit เต็ม, SHA-256 ของไฟล์คำแนะนำที่ตรวจ, ขอบเขตการนำมาใช้ และข้อยกเว้นใน [creative-lab-sources.json](docs/evidence/creative-lab-sources.json). อ่าน Markdown โดยตรงใน Codex ได้ ไม่ต้องติดตั้ง Claude marketplace

| Source | ประเภท / License ที่ตรวจ | ทดลองใช้จริงใน | ขอบเขต / ข้อจำกัด |
|---|---|---|---|
| [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Agent Skill · MIT | 02, 07, 11; review ทั้งชุด | ใช้ priority/defaults เรื่อง touch, focus, contrast, responsive. **ไม่รัน search CLI หรืออ้างผลจาก design-system database** |
| [Impeccable](https://github.com/pbakaus/impeccable) | Agent Skill · Apache-2.0 | 01, 02, 06, 10; review ทั้งชุด | อ่าน core, craft floor, new-work และ audit. ไม่รัน context launcher/binary; ใช้บริบทโค้ดจริงและ browser QA ตามที่แจ้งไว้ ไม่อ้างว่า detector ผ่าน |
| [Anthropic Frontend Design](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | Agent Skill · Apache-2.0 เฉพาะ skill นี้ | 01, 05, 07, 12 | วางวัสดุ องค์ประกอบและ typography ตามเรื่อง แทนการเปลี่ยนสีบน layout เดียวกัน |
| [Vercel Agent Skills](https://github.com/vercel-labs/agent-skills) | Agent Skills · React skill ระบุ MIT; root ไม่มี LICENSE | 03, 09; review ทั้งชุด | อ่าน Web Guidelines และ React Practices, โหลด guidelines สด; lazy chunks, semantics, focus, forms. ไม่คัดลอก framework/server code |
| [Emil Kowalski](https://github.com/emilkowalski/skills) | Agent Skills · MIT | 01, 02, 06, 10, 12 | Animate / Prototype / Design Engineering: motion ที่ตอบการกระทำ, transform/opacity, springs สำหรับ drag, มีทางเลือก keyboard/tap. Brief ของผู้ใช้กำหนด Lab 12 แบบแทน default picker/scope |
| [MengTo](https://github.com/MengTo/Skills) | Agent Skills · MIT | 03 cinematic, 07 masked reveal, 08 scroll world, 10 word reveal | เลือก HTML/SVG และ native scrolling; ไม่มี Lenis/Three.js. ใช้ผู้ตรวจแยกจากผู้พัฒนา |
| [GSAP ScrollTrigger Skill](https://github.com/freshtechbro/claudedesignskills) | Agent Skill · MIT | 03, 08 | ทดลอง scoped parallax/scrub ด้วย GSAP ที่มีอยู่แล้ว; cleanup เมื่อ unmount/ลด motion |
| [Diffusion Studio Lottie](https://github.com/diffusionstudio/lottie) | Agent Skill + player · MIT | **อ่านแล้ว ยังไม่ได้ทดลอง runtime** | Skill กำหนดให้ตรวจด้วย official Skottie player. รอบนี้ไม่ได้สร้าง Lottie/ติดตั้ง player จึงไม่อ้างการใช้หรือผลผ่าน; SVG/CSS เพียงพอกับ interaction ที่เลือก |
| [SvaraNova Web Motion](https://github.com/SvaraNova/skills/tree/main/frontend/web-motion) | Agent Skill · MIT | 03, 04, 11 | CSS ก่อน, ไม่บังคับ scroll, readable static fallback, live preference, diagnostic performance sample |
| [Motion Design Agent](https://github.com/soilmass/motion-design-agent) | Agent Skill · MIT | 04, 05, 06, 08, 09, 11, 12 | ประยุกต์ cause/effect, anticipation/reveal, emotional arc และ reduced-motion override. **ไม่ได้ติดตั้งทั้ง token-resolution/export engine** |
| [React Bits](https://github.com/DavidHDev/react-bits) | Component library · MIT + Commons Clause | **ศึกษาแล้ว ไม่รวม source/runtime trial** | Source อนุญาต end product แต่จำกัดการขาย/แจก component และ template pack จึงไม่คัดลอกเข้าชุดที่อาจพัฒนาเป็น Catalog/Marketplace |
| [Motion Primitives](https://github.com/ibelick/motion-primitives) | Component source · MIT | 01, 06, 09, 10 | ดัดแปลง AnimatedGroup จริงใน `shared.tsx`: wrapper คงที่, stagger มีเพดาน, reduced motion. TextEffect อ่านแต่ไม่ได้คัดลอก; ไม่ติดตั้ง Tailwind/ทั้ง kit |
| [Paper Shaders](https://github.com/paper-design/shaders) | Runtime library · Apache-2.0 | 04 | ทดลอง MeshGradient จริงแบบ opt-in, `speed=0`; static SVG/CSS เป็นค่าเริ่มต้น ทดสอบ mount/unmount และ live reduced motion |
| [shadcn/ui](https://github.com/shadcn-ui/ui) | Component source · MIT | 09 และ shared Button | ปรับ composable Button API ให้เป็น native CSS button จริง; **ไม่ได้ติดตั้ง shadcn CLI, Radix, CVA หรือ Tailwind** |

สิ่งที่นำมาใช้มีทั้งการประยุกต์คำแนะนำและการดัดแปลง source ตามตาราง ไม่อ้างว่าเรียกคำสั่งหรือผ่าน workflow เต็มของทุก Skill. ไม่ใช้ Lottie/React Bits เป็นเพียงชื่อประดับเทมเพลต

## 4. Template matrix

| Template | Design Skills | Motion Skills | Libraries / components ที่ใช้จริง | Signature Interaction | Status |
|---|---|---|---|---|---|
| 01 The Love Letter | Frontend Design, Impeccable | Emil Animate | CSS/SVG, adapted AnimatedGroup | เปิดตราประทับ → จดหมายเลื่อนออก → ป.ล. | Working prototype |
| 02 Polaroid Memories | UI UX defaults, Impeccable | Emil Prototype/Animate | Motion, native dialog | ลาก/ปัดกองภาพ พลิกหลังรูป ขยายภาพ | Working prototype |
| 03 Our Cinematic Journey | MengTo Cinematic, Vercel | GSAP Skill, SvaraNova | GSAP/ScrollTrigger | scroll เชื่อมฉากภาพและบทบรรยาย | Working prototype |
| 04 Written in the Stars | Motion Design | SvaraNova | SVG/CSS, optional Paper Shaders | แตะดาวอิสระ เชื่อมกลุ่มดาว ปลดล็อกคำลับ | Working prototype |
| 05 The Secret Garden | Frontend Design | Motion Design | SVG/CSS | ดอกตูมบานและรวมเป็นช่อเมื่อเก็บครบ | Working prototype |
| 06 The Time Capsule | Impeccable | Motion Design, Emil | CSS 3D, adapted AnimatedGroup | เปิดฝา หยิบสิ่งของ ช่องลับใต้กล่อง | Working prototype |
| 07 Our Scrapbook | Frontend Design, UI UX defaults | MengTo Masked Reveal | CSS, Pointer Events, Words | พลิกหน้าคู่และลอกเทปเผยภาพ | Working prototype |
| 08 Our Little World | MengTo Scroll World | GSAP Skill, Motion Design | SVG, GSAP/ScrollTrigger | แผนที่ สถานที่ และการเก็บตราความทรงจำ | Working prototype |
| 09 Choose Our Story | Vercel React | Motion Design | native Button adaptation, adapted AnimatedGroup | สองคำถาม สี่ตอนจบ ย้อนคำตอบได้ | Working prototype |
| 10 A Diary of Us | Impeccable, Emil Design Engineering | MengTo Staggered Word Reveal | Words, adapted AnimatedGroup | สารบัญวันที่และโน้ตพับในหน้าบันทึกต่างรูปแบบ | Working prototype |
| 11 Constellation of Moments | UI UX defaults | SvaraNova, Motion Design | SVG/CSS, native range | ควบคุมเส้นทางเวลาด้วย slider/keyboard | Working prototype |
| 12 The Grand Surprise | Frontend Design | Emil, Motion Design | CSS/SVG, Pointer Events | ดึงริบบิ้น เปิดม่าน และจังหวะเฉลย | Working prototype |

## 5. ความแตกต่างของประสบการณ์

| Template | Composition / navigation | Typography / hierarchy | Animation language | Emotional journey |
|---|---|---|---|---|
| Letter | โต๊ะกับวัตถุเดียว; เปิดตามลำดับ | italic letter heading + ลายมืออ่านยาว | flap hinge / paper translation | รอ → ใกล้ชิด → ข้อความส่วนตัว |
| Polaroid | กองภาพซ้อน; วนหน้า/ย้อนภาพได้ | heading ลายมือ + caption ใต้รูป | drag spring / rotateY | เล่น → คิดถึง → อ่านสิ่งที่ซ่อนไว้ |
| Cinema | ฉากภาพเต็มจอใน document flow | display ใหญ่ + caption เงียบ | parallax ที่ผูก native scroll | เปิดเรื่อง → เดินทาง → ช่วงพัก → คำสัญญา |
| Stars | แผนที่ดาวอิสระ; ไม่มีลำดับบังคับ | แสงชื่อเรื่อง + readout ด้านล่าง | line connection / selected star | สงสัย → สำรวจ → เห็นภาพรวม |
| Garden | สนามดอกไม้; เก็บได้อิสระ | botanical serif + ป้ายดอกไม้ | bloom scale / bouquet assembly | ดูแล → สะสม → มอบให้ |
| Capsule | กล่องสามมิติและสิ่งของต่างชนิด | box stamp + tag ผู้รับ | lid rotation / object reveal | เปิดของเก่า → จดจำ → พบของลับ |
| Scrapbook | desktop สองหน้า, mobile หน้าตั้ง | ลายมือไม่สมมาตร + เลขหน้า | page turn / mask peel | จับต้อง → เปิดดู → เก็บรูป |
| World | แผนที่ geographic + สถานที่ต่อกัน | sans ชัด + ป้ายสถานที่ | scroll glide / stamp state | ออกเดิน → สำรวจ → กลับบ้าน |
| Choose | คำถามใหญ่และทางเลือก; แตกแขนง | sans หนัก + คำกริยาขนาดใหญ่ | responsive state transition | ตัดสินใจ → มีส่วนร่วม → ตอนจบของตัวเอง |
| Diary | date index + บันทึกคนละ composition | date serif + หัวข้อลายมือ | word mask / folded note | อ่านช้า ๆ → ย้อนวัน → พบความในใจ |
| Constellation | เส้นทางอิสระ + time control | sans + ตัวเลขเวลาเด่น | stroke progression / time scrub | ย้อนมอง → เชื่อมเหตุการณ์ → รู้สึกเป็นเรา |
| Surprise | ห่อของขวัญ → ฉากเฉลย | display มากขึ้นตามจังหวะ | ribbon drag / curtains / finite confetti | สงบ → คาดหวัง → ประทับใจ |

## 6. บันทึกแต่ละเทมเพลต

### 01 — The Love Letter

- **แนวคิด / ความต่าง:** จดหมายเป็นวัตถุหลักบนโต๊ะ ไม่มี gallery; จังหวะสำคัญคือการเปิดพื้นที่ส่วนตัวให้ผู้รับ
- **Skills / เทคนิคจริง:** Frontend Design ใช้วัสดุกระดาษกับลายมือ; Emil ใช้ transform-origin บนฝาซองและ motion ที่ตอบการแตะ; Impeccable ใช้ลำดับการอ่านและความสงบ
- **Runtime / interaction:** CSS flap + SVG seal, AnimatedGroup ที่ดัดแปลง; เปิดซอง อ่านข้อความหลายบรรทัด และเปิด ป.ล. ได้จริง
- **ปัญหา / mobile:** ข้อมูล custom เคยส่งก่อน iframe พร้อม แก้ ready handshake; เพิ่มขนาดข้อความจดหมายและตรวจการเลื่อนบนมือถือ
- **License / ต่อระบบ:** ต้นแบบเขียนเอง + MIT adaptation; เหมาะเป็นตัวแรกที่นำเข้าระบบด้วย CardData adapter หลังเพิ่มขั้นตอนเผยแพร่/เพลงจากระบบเดิม

### 02 — Polaroid Memories

- **แนวคิด / ความต่าง:** โต๊ะกับกองภาพ วนสำรวจได้โดยไม่บังคับลำดับ เปิดอ่านข้อความหลังรูปเป็นอีกมิติของเรื่อง
- **Skills / เทคนิคจริง:** UI UX defaults ให้ปุ่มแทน gesture; Emil ให้ spring และ feedback; Impeccable ใช้ material hierarchy. ไม่คัดลอก React Bits
- **Runtime / interaction:** Motion drag, CSS flip และ native dialog; ปัด/ลูกศร พลิกกลับ ขยายภาพ Escape ปิด และคืน focus
- **ปัญหา / mobile:** contrast ของคำแนะนำต่ำ แก้แล้ว; note ยาวเคยถูกตัด แก้เป็น scroll region ที่ focus/End ได้ ผู้ตรวจแยกยืนยันทั้ง Chromium และ WebKit
- **License / ต่อระบบ:** Motion MIT ไม่มี Commons Clause code; พร้อมคัดเลือกพัฒนาต่อ ควรลองแรงปัดบนเครื่องจริงก่อนเปิดขาย

### 03 — Our Cinematic Journey

- **แนวคิด / ความต่าง:** ฉากภาพเต็มจอและบทบรรยายที่สลับจังหวะ ไม่ใช้ลำดับการ์ดกริด
- **Skills / เทคนิคจริง:** MengTo ใช้ scene beats และช่วงพัก; GSAP Skill ใช้ scrub/context cleanup; SvaraNova/Vercel รักษา native scroll และ static-readable content
- **Runtime / interaction:** GSAP/ScrollTrigger โหลดเมื่อจำเป็น; เลื่อนเดินหน้า/ย้อนฉาก ใช้ chapter anchors และเปิดฉากสุดท้ายได้
- **ปัญหา / mobile:** word wrapper เคยใช้ ARIA ไม่ตรง role แก้เป็นข้อความอ่านสำหรับ screen reader; ลด motion แล้วไม่มี parallax เนื้อหายังครบ
- **License / ต่อระบบ:** ใช้ GSAP ที่มีอยู่แล้วภายใต้ license ของ package; ต้องเลือกภาพ cover/crop และลอง scroll บนอุปกรณ์จริงก่อนนำออกให้ลูกค้า

### 04 — Written in the Stars

- **แนวคิด / ความต่าง:** ท้องฟ้าแบบค้นหาอิสระ แตกต่างจาก Constellation ซึ่งขับเคลื่อนด้วยเวลา
- **Skills / เทคนิคจริง:** Motion Design ใช้การตอบสนองจากการค้นพบ; SvaraNova ให้ fallback และเลี่ยง loop ไม่จำเป็น
- **Runtime / interaction:** SVG เชื่อมดาวที่แตะ, readout รูป/ข้อความ, เก็บครบเปิดความลับ; Paper MeshGradient เป็น opt-in/static render
- **ปัญหา / mobile:** ภาพเสียเคยทำให้ภาพถัดไปเสียตาม แก้ failedSource; Motion hook เดิมไม่อัปเดต OS preference สด แก้ native subscription แล้ว; controls ใช้ได้โดยไม่เปิด GPU
- **License / ต่อระบบ:** Paper Apache-2.0 พร้อม NOTICE; ไม่ใช้ React Bits. ควรนำเข้าโดยปิด GPU เป็นค่าเริ่มต้นและตรวจ hardware จริงก่อนเปิดตัวเลือกนี้

### 05 — The Secret Garden

- **แนวคิด / ความต่าง:** การผลิบานคือความคืบหน้า ตอนจบเปลี่ยนสนามดอกไม้เป็นช่อที่มอบให้ผู้รับ
- **Skills / เทคนิคจริง:** Frontend Design ใช้ระบบ botanical; Motion Design แยก anticipation, bloom และ reward โดยไม่เล่น animation ตลอดเวลา
- **Runtime / interaction:** SVG ดอกไม้เปลี่ยน state ด้วย CSS, แตะอ่านความทรงจำ เก็บครบแล้วผูกเป็นช่อ
- **ปัญหา / mobile:** เพิ่ม contrast ป้ายดอกไม้; ปรับตำแหน่งเมื่อมี 5–8 ความทรงจำ ทดสอบครบ 8 ดอกและเปิดตอนจบจริง
- **License / ต่อระบบ:** SVG เขียนเอง; Lottie ศึกษาแต่ไม่ได้ใช้หรืออ้าง Skottie verification. เหมาะพัฒนาต่อสำหรับวันครบรอบ/ขอบคุณหลังลอง touch targets บนเครื่องจริง

### 06 — The Time Capsule

- **แนวคิด / ความต่าง:** เรื่องผ่านสิ่งของต่างชนิดในกล่อง เลือกหยิบตามใจแทนการไล่รูป
- **Skills / เทคนิคจริง:** Motion Design ใช้ curiosity/reveal; Emil ใช้ origin ของฝา; Impeccable แยก tag, วัตถุ, readout เป็นลำดับชัดเจน
- **Runtime / interaction:** CSS 3D lid, SVG keepsakes, adapted AnimatedGroup; เก็บสิ่งของและเปิดช่องลับใต้กล่อง
- **ปัญหา / mobile:** แก้ contrast บนสีน้ำตาลและขยายกล่องเมื่อมี 8 ชิ้น; ตรวจการหยิบครบจริง ไม่ใช้ปุ่มลวง
- **License / ต่อระบบ:** native code + MIT AnimatedGroup; ต้องให้ editor ระบุชนิด/ชื่อ keepsake ได้ละเอียดขึ้นก่อนเป็นสินค้าจริง

### 07 — Our Scrapbook

- **แนวคิด / ความต่าง:** หน้าสมุดที่วางรูปกับข้อความไม่สมมาตร มีจุดปิดทับให้ลอกเทป แทนการเปิดอัลบั้มลำดับเดิม
- **Skills / เทคนิคจริง:** MengTo ใช้ mask reveal, Frontend Design ใช้วัตถุทำมือ, UI UX defaults ให้ปุ่มแทนการปัด
- **Runtime / interaction:** CSS mask, Pointer Events, word reveal; ปัด/ปุ่มพลิกหน้า ลอกเทป อ่านหน้าสุดท้ายและย้อนกลับ
- **ปัญหา / mobile:** native Chromium เคยส่ง pointercancel ให้ horizontal swipe; ตรวจแบบเปลี่ยน CSS ค่าเดียวแล้วแก้ `touch-action:pan-y` โดยยังเลื่อนแนวตั้งได้; แก้ contrast บนเทป
- **License / ต่อระบบ:** เขียนเอง/แนวทาง MIT ไม่มี React Bits; พร้อมคัดเลือก ต้องพิจารณาความต่างจาก Little Memories ใน catalog จริงก่อนวางขาย

### 08 — Our Little World

- **แนวคิด / ความต่าง:** สถานที่เป็นตัวนำเรื่องในแผนที่เดียว ผู้ชมกระโดดไปจุดหมายหรือเดินผ่านด้วย scroll
- **Skills / เทคนิคจริง:** MengTo เลือก HTML/SVG mode, GSAP ให้ cloud parallax แบบเล็ก, Motion Design ใช้ stamp เป็นผลตอบรับ
- **Runtime / interaction:** authored SVG map, native scroll, IntersectionObserver; แตะ pin ไปยังสถานที่และเก็บตราครบเพื่อพบข้อความท้ายเรื่อง
- **ปัญหา / mobile:** test เดิมค้นชื่อปุ่มก่อนเปลี่ยน state แม้ pin เก็บสถานที่นั้นแล้ว แก้ locator ให้ทดสอบ idempotency; แก้ contrast ของข้อความกลับบ้าน
- **License / ต่อระบบ:** ไม่มี Three.js หรือบริการแผนที่; ต้องเพิ่ม editor สำหรับชื่อสถานที่/ตำแหน่งและตรวจภาพรวม 8 จุดบนมือถือจริงก่อน promote

### 09 — Choose Our Story

- **แนวคิด / ความต่าง:** ผู้ชมมีผลกับตอนจบ ไม่ใช่เพียงเลื่อนเปิดเนื้อหาที่กำหนดไว้
- **Skills / เทคนิคจริง:** Motion Design ให้ทางเลือกมีผลตอบรับทันที; Vercel ให้ state เฉพาะ interaction และ lazy component
- **Runtime / interaction:** adapted native Button/AnimatedGroup; สองคำถามสร้างสี่ตอนจบที่ทดสอบครบ ย้อนคำตอบและเริ่มใหม่ได้
- **ปัญหา / mobile:** final progress group เคยมี label บน generic div แก้ role ที่ถูกต้อง; แก้ contrast คำแนะนำท้ายหน้า
- **License / ต่อระบบ:** MIT API/source adaptations พร้อม notice ไม่ติดตั้งชุด shadcn เต็ม; ต้องทำ authoring schema สำหรับคำถาม/ผลลัพธ์ก่อนให้ลูกค้าปรับเส้นเรื่องเอง ปัจจุบัน branch copy เป็น narrative ของต้นแบบ

### 10 — A Diary of Us

- **แนวคิด / ความต่าง:** date index สำหรับกลับมาอ่านซ้ำ หน้าภาพ/ข้อความเปลี่ยน composition ตามบันทึก ไม่ใช้ timeline ของการ์ดหน้าตาเดียวกัน
- **Skills / เทคนิคจริง:** MengTo staggered words ผ่าน mask; Emil ให้ motion เล็กและ readable; Impeccable ใช้ hierarchy ของวันที่กับเนื้อหา
- **Runtime / interaction:** Words ใช้ `Intl.Segmenter('th')`, IntersectionObserver และ CSS; เลือกวัน เปิด/พับโน้ต และย้อนอ่าน
- **ปัญหา / mobile:** แก้ contrast วันที่และ ARIA ของข้อความแยกคำ; mobile เปลี่ยน index เป็นแถบเลื่อนแนวนอนที่กดได้
- **License / ต่อระบบ:** own Words + MIT AnimatedGroup; พร้อมคัดเลือกและใช้ข้อมูล photo.date ของระบบเดิมได้ ต้องเพิ่ม fallback หากจะรองรับ WebView เก่าที่ไม่มี Intl.Segmenter

### 11 — Constellation of Moments

- **แนวคิด / ความต่าง:** แผนภาพเส้นทางของเวลา ไม่ใช่ท้องฟ้าค้นหาอิสระแบบ 04; แกนหลักเป็นช่วงเวลาที่ควบคุมได้
- **Skills / เทคนิคจริง:** UI UX defaults ให้ range/keyboard และปุ่มแทนการลาก; SvaraNova/Motion Design ใช้เส้นทางเชื่อมเหตุและผล
- **Runtime / interaction:** SVG stroke, native range, dialog; Home/End/Arrow/ปุ่มช่วงถัดไป เปลี่ยนข้อความ เปิดรายละเอียด และถึงบทสรุป
- **ปัญหา / mobile:** เก็บข้อความไว้ใน DOM และใช้ label/value text ให้ slider; ไม่มี canvas loop หรือการปรับมุมมองที่แย่งการเลื่อนหน้า
- **License / ต่อระบบ:** native code; ไม่อ้าง Paper/GSAP เพราะไม่ได้ใช้ในเทมเพลตนี้ ต้องให้ลูกค้าจัดลำดับ/วันที่และตรวจจุดที่อยู่ใกล้กันก่อน promote

### 12 — The Grand Surprise

- **แนวคิด / ความต่าง:** สามจังหวะสงบ → คาดหวัง → เปิดเผย ผ่านห่อของขวัญแทนการใช้ confetti ทุกหน้า
- **Skills / เทคนิคจริง:** Frontend Design ให้ข้อความโตตาม climax; Emil ใช้ pointer capture และ motion ที่ตอบ gesture; Motion Design ให้ anticipation/reward
- **Runtime / interaction:** Pointer Events, CSS curtain และ confetti รอบเดียว; ลากริบบิ้นหรือใช้ปุ่ม เปิดเฉลย และเล่นใหม่ได้
- **ปัญหา / mobile:** ป้องกัน pointer ตัวที่สองแทรกระหว่างลาก; still/reduced motion ไม่มี confetti/ม่านเคลื่อนแต่ยังพบข้อความและเล่นซ้ำได้
- **License / ต่อระบบ:** authored SVG/CSS ไม่อ้างการใช้ Lottie; เหมาะเป็นตัวลำดับต้นสำหรับวันเกิด โดยใช้เพลง/การแชร์ของระบบจริงในขั้น integration แยก

## 7. QA และหลักฐาน

Test source: `tests/lab/interactions.lab.ts`, `tests/lab/edge-cases.lab.ts` · Config: `playwright.lab.config.ts`

ทดสอบ UI จริง ไม่ใช่เฉพาะ mount: การเปิด/เก็บ/เลือก/ย้อนกลับ/รีเซ็ต, สี่ branch endings, dialog Escape, slider keyboard, custom data, invalid JSON, ภาพเสียแล้วเปลี่ยนภาพ, note ยาว, 8 memories, drag/swipe/ribbon และ shader opt-in/unmount/live preference

โปรเจกต์ browser:

| Project | Viewport | สิ่งที่ยืนยันได้ |
|---|---|---|
| 360 | 360×800 Chromium | narrow layout และ interaction |
| 390 | 390×844 Pixel 7 emulation | layout, touch tap และ CDP touch gesture |
| 768 | 768×1024 Chromium | tablet-sized viewport; ไม่ใช่ tablet จริง |
| desktop | 1280×900 Chromium | mouse/keyboard และ desktop composition |
| webkit | 390×844 iPhone emulation | WebKit + tap, button fallback; drag ใช้ mouse automation ไม่ใช่นิ้วบน iPhone จริง |

ทุกแบบตรวจ axe WCAG A/AA tags ใน interaction state ปลายทางและ alternate/reduced-motion state; ไม่ใช่ใบรับรอง accessibility หรือผล screen-reader testing จริง. ตรวจไม่มี horizontal overflow และไม่อนุญาต outbound requests ในชุดหลัก. รูป/ฟอนต์ sample self-hosted

ประวัติปัญหาและการยืนยันจากผู้ตรวจแยก: [creative-lab-review.md](docs/evidence/creative-lab-review.md). เก็บ exploratory failures แยกจาก final acceptance ไม่รวม rerun เป็นจำนวน test cases ใหม่

### คำสั่งและผลที่รันจริง

| Command / mode | ผล |
|---|---|
| `npm run typecheck` | PASS |
| `npm run build` | PASS, ใช้ config เว็บจริง |
| `npm run test:api` | **61 passed**, local unit/workerd ไม่มี Cloudflare production proof |
| `npm test` / default build | **84 passed, 66 skipped** ตาม opt-in gates ของ suite เดิม |
| V3 test-only build แล้ว `npx playwright test tests/media-v3.spec.ts tests/r2-acceptance.spec.ts` | **39 passed** ในรอบเต็มล่าสุด; ก่อนหน้านั้นมี WebKit Little Memories publish timeout หนึ่งครั้งและ isolated rerun ผ่าน |
| `AUDIT=1 VITE_R2_MEDIA_ENABLED=true npx playwright test tests/system-audit.spec.ts` | **18 passed, 1 failed, 8 did not run**; WebKit Pink Coquette ไม่ได้ share sheet หลัง publish, มี `media_v3_error`. เป็น exploratory suite ของ source เดิมที่ไม่ถูกแก้ ยังไม่ถือว่าปิดปัญหา |
| `npm run lab:build` | PASS, แยก output และ chunks |
| `npm run test:lab` | **170 passed, 0 failed, 0 skipped, 0 flaky** |
| `npm run lab:capture` | ภาพจริง mobile/desktop และ opened states; รายการ/แฮชใน `previews/screenshots.json` |
| `node scripts/check-template-lab-isolation.mjs` | **PASS: 25 files**, production output ไม่มี Lab |

การทดสอบ V3 ใช้ genuine local workerd bindings และ mocked browser routes ตาม suite เดิม ไม่ใช่การเปิด Cloudflare staging/production. ไม่มีการแก้ code/backend เพื่อกลบผล exploratory audit และไม่เรียกรวม regression ทั้งหมดว่า PASS. หลังทดสอบ restore build ปกติ ไม่ใช้ test Turnstile key ใน artifact ที่ตั้งใจส่งต่อ

### Performance และ loading

`scripts/measure-template-lab.mjs` บันทึก [creative-lab-performance.json](docs/evidence/creative-lab-performance.json): local built preview, Chromium Pixel 7 emulation 390×844, 4× CPU throttle, หน้าต่อเนื่อง/cache อุ่นหลังหน้าแรก, frame window ประมาณ 900ms ต่อแบบ. เป็น diagnostic sample ไม่ใช่การรับรอง 60fps, mobile hardware, battery หรือ network capacity

ผล diagnostic รอบสุดท้าย: **CLS = 0.0000 ทั้ง 12 แบบ**, frame-interval p95 **16.7–16.8 ms** ในช่วงตัวอย่าง 50–55 frames/แบบ. ไม่มี infinite running animation ในค่าเริ่มต้น แต่พบ interaction long task **92 ms (Letter), 52 ms (Polaroid), 51 ms (Capsule)** ภายใต้ CPU throttle 4x; อีก 9 แบบไม่พบ interaction long task >50 ms ใน window นี้. ตัวอย่างสั้นเหล่านี้ไม่ใช่หลักฐานว่าไม่มี jank ในอนาคต ต้อง profile บนอุปกรณ์จริงก่อนเปิดขาย ไม่ได้ลด assertion เพื่อประกาศว่า performance สมบูรณ์

Lab main JS ประมาณ **122.5 kB gzip** รวม React/Motion; CSS ทุกเทมเพลตประมาณ **12 kB gzip**. Template chunks ราว 0.9–2 kB gzip ต่อแบบ; GSAP + ScrollTrigger ราว 45 kB gzip โหลดเฉพาะ cinematic/world เมื่อมี motion; Paper chunk ราว 8.3 kB gzip โหลดหลัง opt-in เท่านั้น. ตัวเลขจาก Vite build รอบนี้ ไม่ใช่ขนาดเพิ่มของเว็บ production ซึ่งไม่ได้ import Lab

รูปประกอบสี่ภาพรวมประมาณ 1.26 MB ที่ 1200px, โหลดตามหน้า/ใช้ lazy loading เมื่อเหมาะสม; ฟอนต์เฉพาะ Latin/Thai รวมประมาณ 141 kB self-hosted. กำหนดมิติภาพและขนาดพื้นที่ล่วงหน้า, จำกัด confetti, ไม่มี infinite animation loop ในค่าเริ่มต้น, fallback เมื่อภาพโหลดไม่สำเร็จ/GPU ไม่พร้อม และ cleanup listeners/observers/tweens

## 8. License และขอบเขตการนำไปใช้

เก็บ MIT notices สำหรับ source adaptations, Paper Apache License/NOTICE และ OFL fonts ใน [public/licenses](template-lab/public/licenses). ภาพประกอบอยู่ภายใต้ [Unsplash License](https://unsplash.com/license) พร้อม source URL/hash ใน [asset-sources.json](template-lab/public/asset-sources.json) ใช้เป็นภาพทดลอง ไม่มีการอ้างว่าคือภาพคู่รัก/ลูกค้าจริง ห้ามนำภาพ stock ไปขายเป็น asset pack โดยลำพัง

ไม่มี React Bits component/export ที่เสี่ยงต่อ template redistribution; ไม่มีการซื้อ Pro, ใช้ generation credits, เปลี่ยน billing หรือเปิดบริการ paid. เพิ่มเพียง static Site แยกตามคำขอ ไม่มี backend ใหม่ ปัจจุบันเปิดให้ผู้มีลิงก์เข้าชมโดยไม่ต้องล็อกอินตามคำขอ Owner ล่าสุด

## 9. สิ่งที่ยังไม่ได้ยืนยัน / ก่อน Production

1. ยังไม่ได้ทดสอบเครื่อง iPhone/Android จริง, VoiceOver/TalkBack, LINE in-app browser หรือ user study; ต้องทดลองแรงปัด การอ่านข้อความ และอุปกรณ์สมรรถนะต่ำกับข้อมูลจริงที่ได้รับอนุญาตก่อน promote
2. ตัว Lab ไม่สร้างระบบ auth เอง: เริ่มเผยแพร่แบบ owner-only ก่อน แล้ว Owner ขอเปิด public โดยไม่ต้องล็อกอินอย่างชัดเจน จึงเปลี่ยน policy เป็น public revision 2 และทดสอบ anonymous access ใหม่. Local server ยังเป็น loopback; `noindex` ไม่ใช่การป้องกันสิทธิ์. หลักฐาน private acceptance ด้านล่างเป็นประวัติก่อนเปลี่ยนสิทธิ์
3. Skills บางส่วนใช้ด้วยการอ่าน/ปรับคำแนะนำ ไม่ใช่ CLI ทั้ง workflow; Lottie และ React Bits ไม่ได้ runtime trial ตามเหตุผลใน matrix
4. JSON config ยังเป็นเครื่องมือทีมภายใน; Choose มีเส้นเรื่องต้นแบบ, World มีตำแหน่ง/รูปทรงแผนที่กำหนดไว้ ไม่ใช่ authoring tool ที่ให้ลูกค้าแต่งได้ทุกจุด
5. `Intl.Segmenter` ต้องมี fallback หากจะรองรับ WebView เก่ากว่ากลุ่ม browser ที่ทดสอบ
6. เพลง การแชร์ LINE การบันทึก/แก้ไข/หมดอายุ และ V3 uploads ของ **ต้นแบบใหม่** ยังไม่ได้เชื่อมระบบจริง; ไม่อ้าง production acceptance จากการทดสอบ prototype. ระบบเดิมไม่ได้ถูกเปลี่ยน
7. Exploratory system audit เดิมบน WebKit ยังมี publish failure ตามตาราง ไม่ซ่อนหรือถือว่าเป็นผลผ่าน; แยก triage ในงานระบบเดิมก่อน rollout ที่เกี่ยวข้อง
8. CI ใหม่ตรวจ Lab และ upload evidence เท่านั้น ไม่มี automatic deploy job. ตรวจยืนยัน GitHub Actions ของ exact commit `11571be49a7ad8e2b619a5e8a7bc63e4a9911170` ว่า completed/success แล้วทั้ง [Lab](https://github.com/cmyanything/luvnote/actions/runs/41385810510) และ [Frontend](https://github.com/cmyanything/luvnote/actions/runs/41385810514). Private Site ใช้ native private publish แยกจาก GitHub Pages

## 10. แนะนำลำดับพัฒนาต่อ

**The Love Letter → Polaroid Memories → The Grand Surprise**: interaction เข้าใจง่ายเหมาะกับ touch, ข้อมูลใกล้ CardData เดิม และไม่ต้องพึ่ง GPU/scroll orchestration. Garden เหมาะเป็นตัวเลือกเพิ่มสำหรับวันครบรอบ ส่วน Cinema/World/Stars ควรผ่านการทดสอบอุปกรณ์จริงเพิ่มก่อน

ขั้นต่อไปคือให้ทีมลองเล่นและเลือกแบบที่จะนำเข้า editor จากนั้นทำ integration เฉพาะแบบที่เลือก รวมเพลง/preview/share/retention tests และ review ก่อนเผยแพร่. ไม่จำเป็นต้องสร้าง Marketplace หรือรื้อระบบเทมเพลตตอนนี้

## Commits / review

- `c555b7f6e9ecb7521526a5a1a596372e07b0c9f6` — implementation, test sources, assets, screenshots และ notices
- รายงานและ final acceptance evidence บันทึกใน documentation commits ถัดจาก implementation; ไม่แก้ runtime หลังรอบ final
- ก่อนคำขอ main-domain ล่าสุดยังไม่มี merge หรือ customer frontend deploy; การเผยแพร่ `/mylab/` เพิ่มใช้ PR #14 และ frontend workflow เดิม โดยไม่เปลี่ยน backend หรือเปิดธีมใหม่ใน editor ลูกค้า

## Private hosted acceptance — ประวัติก่อน Owner ขอเปิด public

Native private publish สำเร็จสำหรับ [Developer Lab](https://luvnote-template-lab.brsblack79.chatgpt.site/template-lab/), deployment `appgdep_6ae80c84c7d88191acda3283e33bcd1b`, version 1. ใช้ Lab source `11571be49a7ad8e2b619a5e8a7bc63e4a9911170`; static Site snapshot commit `6dc6ba7c8474c5a0903bba78a521381fb8bf31c2`. ไม่มีการเปลี่ยน runtime ของต้นแบบจาก source ที่ CI ผ่าน

- Anonymous checks **7/7 ผ่าน**: root, catalogue, player, JavaScript, ภาพ, preview และ font ได้ HTTP 401
- Authorized file checks **80/80 ผ่าน**: 78 assets ตรง SHA-256; HTML 2 ไฟล์ตรงกับ application output โดยมีเฉพาะ Cloudflare detection script ที่โฮสต์เติม และ canonical index redirect ตามที่ตรวจไว้
- Hosted interaction checks **13/13 ผ่าน**: interaction หลักของ 12 เทมเพลตที่ 390px และ catalogue/embedded letter/reset ที่ 1280px. Browser runtime errors **0**. เก็บ screenshot ของ catalogue จริงทั้ง mobile และ desktop แล้ว
- ตรวจ policy หลัง QA: `custom`, revision 1, owner 1 ราย, กลุ่ม 0, external visitors 0. ไม่มีการขยายสิทธิ์ระหว่างทดสอบ
- Browser QA ใช้ platform service credential เฉพาะ origin นี้ผ่าน hidden stdin; ไม่เก็บ token/cookie/trace/HAR และไม่ได้อ้างว่าทดสอบ interactive owner login หรือเครื่องจริง

**HOSTED_DEVELOPER_PREVIEW = PASS** สำหรับขอบเขตข้างต้น. หลักฐานและ SHA ของ screenshots: [creative-lab-hosting.json](docs/evidence/creative-lab-hosting.json). วิธี update/rollback แยกจากเว็บลูกค้า: [CREATIVE-LAB-HOSTING.md](docs/CREATIVE-LAB-HOSTING.md)

## Public developer preview — สถานะล่าสุดตามคำขอ Owner

Owner ขอให้ผู้พัฒนาคนอื่นดูได้ทั้งหมดโดยไม่ต้องใส่รหัส จึงเปลี่ยน audience เป็น `public`, policy revision 2 และ redeploy **saved version 1 เดิม** โดยไม่เปลี่ยนโค้ดหรือสร้าง Site ใหม่. Deployment `appgdep_6ae80ee1c4b8819183828af3b51011a5` สำเร็จเมื่อ `2026-11-02T04:17:55.585161+00:00`.

ตรวจแบบไม่มี token, cookie หรือ sign-in: **7/7 HTTP checks ได้ 200**, catalogue มี 12 รายการ และ player **12/12 เปิดได้**, iframe เปิดจดหมายและ Reset ผ่าน, browser runtime errors 0. รอบนี้ไม่ได้ทดสอบ interaction ทุกแบบซ้ำ; ผล interaction ครบ 12 แบบอยู่ใน private acceptance ก่อนหน้า ซึ่งใช้ runtime version เดียวกัน. `robots.txt` และ noindex ยังอยู่ แต่ไม่ได้จำกัดสิทธิ์เข้าชม.

หลักฐานปัจจุบัน: [creative-lab-public-access.json](docs/evidence/creative-lab-public-access.json). เปลี่ยนเฉพาะเว็บ Lab แยก ไม่ได้แก้เว็บลูกค้า ฐานข้อมูล หรือ backend ของ LuvNote.

## Main-domain publication — คำขอ Owner ล่าสุด

Owner ระบุให้เผยแพร่ที่ `luvnote.fun/mylab` โดยตรง จึงเพิ่มขั้น build/package/test ของ Lab ใน frontend workflow เดิม ซึ่งยังใช้ environment policy ที่อนุญาตเฉพาะ `main`. ไม่แก้ DNS, billing, environment protections, database หรือ Worker. โค้ดหน้าเว็บและธีมลูกค้าเดิมไม่ถูกแก้จาก base `a8bc1f386c14f9e48f154573a010b17e07dc6901`.

การแก้ไขเฉพาะทาง: ใช้ Vite base สำหรับ assets และลิงก์กลับ, URL ฟอนต์แบบ relative และตัว package ที่เพิ่มเฉพาะ `dist/mylab` พร้อมตรวจ hash ของไฟล์เดิมทุกไฟล์. Root/standalone Lab ยังคงเปิดด้วย `/template-lab/` และชุดทดสอบเดิม.

ตรวจ customer build กับ artifact ที่เผยแพร่อยู่จาก run `41367555706`: 24 ไฟล์เนื้อหาเหมือนเดิม — 8 non-HTML ตรง hash ทุก byte, 16 HTML ต่างเฉพาะ CR ก่อน LF จาก Windows/Vite เมื่อเทียบกับ Linux. ตัว package ตรวจเพิ่มว่าไฟล์ customer build ปัจจุบันทั้ง 25 ไฟล์ไม่เปลี่ยนแม้แต่ byte เดียวหลังเพิ่ม `/mylab`.

ใช้ `npm run test:lab` สำหรับ interaction/accessibility เดิม และ `npx playwright test --config playwright.mylab.config.ts` สำหรับ path deployment จริงใน static output (12 players, รูป/ฟอนต์, catalogue, comparison, iframe/reset/config และไม่มี request หลุดออกจาก `/mylab/`). ผลรอบนี้เก็บใน [creative-lab-mylab-local.json](docs/evidence/creative-lab-mylab-local.json); หลักฐาน live publication แยกจากผล local และ Sites snapshot เก่า.

### ผลเผยแพร่และตรวจเว็บจริง

**LIVE_MAIN_DOMAIN_PREVIEW = PASS** — [https://luvnote.fun/mylab/](https://luvnote.fun/mylab/) เปิดได้โดยไม่ต้องลงชื่อเข้าใช้. `/mylab` ตอบ 301 ไป `/mylab/` และปลายทางตอบ 200. PR #14 merge เป็น `189ed52fa4269aaaea70e1f674637676a4829185`; tree ตรงกับ source `c3567746b9657b055a702ac392fe7bcd71b8745f` ที่ตรวจผ่านทุกไฟล์.

[Frontend CI ของ PR](https://github.com/cmyanything/luvnote/actions/runs/41388885823) และ Lab CI สองรอบผ่าน. [Main frontend deployment](https://github.com/cmyanything/luvnote/actions/runs/41389732278) completed/success; GitHub Pages deployment ID `7484493494`. ใช้ policy `main` เดิม ไม่มีการข้าม protection หรือ deploy API.

ผล local หลังแก้ path: **170/170 Lab tests** และ **56/56 subdirectory tests** ผ่าน. ตรวจ release artifact ที่ build บน Linux และตรวจ HTTP จากเว็บจริง: ไฟล์เว็บลูกค้าเดิม **24/24 ตรง SHA-256 ทุก byte** กับ release ก่อนหน้า โดยไม่ต้อง normalize HTML.

Live browser acceptance: interaction หลัก **12/12** ที่ 390px และ iframe/reset ที่ 1280px ผ่าน รวม **13 checks**, browser runtime errors **0**, ภาพ catalogue และฟอนต์โหลดใต้ `/mylab/`. มี screenshot ของเว็บจริง mobile/desktop. ใช้เฉพาะข้อมูลสังเคราะห์และ static HTML/assets ไม่อ่านการ์ดหรือรูปของลูกค้า ไม่อ้างว่าเป็น physical-device หรือ LINE testing.

หลักฐานทั้งหมด: [creative-lab-mylab-live.json](docs/evidence/creative-lab-mylab-live.json).
