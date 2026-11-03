import { useEffect, useRef, useState } from 'react';
import { defaultChoices, type Story, type StoryChoices } from './data';
import { validateStory, draftKey } from './validation';
import { Button, Icon } from './shared';
import { readPhoto, jpeg } from '../lib/images';
import { youtubeId, seconds } from '../lib/card';
import { labHome } from './paths';
import type { TemplateId } from './registry';

export default function Studio({
  id,
  initial,
  onApply,
}: {
  id: TemplateId;
  initial: Story;
  onApply: (story: Story) => void;
}) {
  const [draft, setDraft] = useState<Story>(() => structuredClone(initial));
  const [json, setJson] = useState(JSON.stringify(initial, null, 2));
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState(
    initial.music?.type === 'youtube'
      ? `https://www.youtube.com/watch?v=${initial.music.id}`
      : '',
  );
  const [musicStart, setMusicStart] = useState(
    initial.music?.type === 'youtube'
      ? `${Math.floor(initial.music.start / 60)}:${String(initial.music.start % 60).padStart(2, '0')}`
      : '0:00',
  );
  const [stored, setStored] = useState(() => {
    try {
      return !!localStorage.getItem(draftKey(id));
    } catch {
      return false;
    }
  });
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => setJson(JSON.stringify(draft, null, 2)), [draft]);
  function replaceDraft(story: Story) {
    setDraft(story);
    setYoutubeUrl(
      story.music?.type === 'youtube'
        ? `https://www.youtube.com/watch?v=${story.music.id}`
        : '',
    );
    setMusicStart(
      story.music?.type === 'youtube'
        ? `${Math.floor(story.music.start / 60)}:${String(story.music.start % 60).padStart(2, '0')}`
        : '0:00',
    );
  }
  function update<K extends keyof Story>(key: K, value: Story[K]) {
    setDraft((s) => ({ ...s, [key]: value }));
    setError('');
    setNotice('แก้ข้อมูลแล้ว กดอัปเดตตัวอย่างเพื่อดูผล');
  }
  function moment(index: number, key: string, value: string) {
    setDraft((s) => ({
      ...s,
      moments: s.moments.map((m, i) =>
        i === index ? { ...m, [key]: value } : m,
      ),
    }));
    setNotice('แก้ข้อมูลแล้ว กดอัปเดตตัวอย่างเพื่อดูผล');
  }
  function move(index: number, direction: number) {
    const items = [...draft.moments];
    const next = index + direction;
    if (next < 0 || next >= items.length) return;
    [items[index], items[next]] = [items[next], items[index]];
    update('moments', items);
  }
  async function photo(file: File) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
      throw Error(
        'เลือกรูป JPEG, PNG หรือ WebP สำหรับ HEIC ให้แปลงเป็น JPEG ก่อน',
      );
    let image = await readPhoto(file, 1080);
    if (image.length > 750_000) image = await jpeg(image, 900, 0.72);
    if (image.length > 750_000)
      throw Error('รูปนี้ยังใหญ่เกินไป ลองเลือกรูปขนาดเล็กลง');
    return image;
  }
  async function choosePhotos(files: File[], target?: number | 'cover') {
    if (!files.length) return;
    if (target === undefined && draft.moments.length + files.length > 8) {
      setError('ใส่ได้สูงสุด 8 ความทรงจำ ลบรูปเดิมก่อนเพิ่มได้');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (target === 'cover') {
        const src = await photo(files[0]);
        if (alive.current) update('cover', src);
      } else if (typeof target === 'number') {
        const src = await photo(files[0]);
        if (alive.current) moment(target, 'image', src);
      } else {
        const added = [];
        for (const file of files) {
          const src = await photo(file);
          if (!alive.current) return;
          added.push({
            id: crypto.randomUUID(),
            date: '',
            title: file.name.replace(/\.[^.]+$/, ''),
            note: '',
            image: src,
            alt: file.name.replace(/\.[^.]+$/, ''),
            place: '',
          });
        }
        if (alive.current) update('moments', [...draft.moments, ...added]);
      }
    } catch (e) {
      if (alive.current)
        setError(
          e instanceof Error ? e.message : 'อ่านรูปไม่ได้ ลองเลือกรูปอีกครั้ง',
        );
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  function apply(story = draft) {
    if (!validateStory(story)) {
      setError(
        'ตรวจชื่อผู้ส่ง ผู้รับ วันที่ และข้อมูลรูปอีกครั้ง รองรับ 1–8 รูป ชื่อไม่เกิน 120 ตัวอักษร และข้อมูลรวมไม่เกิน 4.5 MB',
      );
      return false;
    }
    onApply(structuredClone(story));
    setError('');
    setNotice('อัปเดตตัวอย่างด้วยข้อมูลของคุณแล้ว');
    return true;
  }
  function save() {
    if (!validateStory(draft)) {
      setError('กรอกชื่อผู้ส่ง ผู้รับ และวันที่ให้ครบก่อนบันทึก');
      return false;
    }
    try {
      localStorage.setItem(
        draftKey(id),
        JSON.stringify({ version: 1, template: id, story: draft }),
      );
      setStored(true);
      setError('');
      setNotice('บันทึกฉบับร่างในเบราว์เซอร์นี้แล้ว');
      return true;
    } catch {
      setError(
        'เบราว์เซอร์เก็บร่างนี้ไม่ได้ ลองลดจำนวนรูป หรือดาวน์โหลดไฟล์ร่างแทน',
      );
      return false;
    }
  }
  function preview() {
    if (!save()) return;
    const opened = window.open(
      `${labHome}?play=${id}&draft=1`,
      '_blank',
      'noopener',
    );
    // noopener may return null even when a tab opened; provide a normal link as well.
    void opened;
    setNotice(
      'เปิดการ์ดจากร่างในเครื่องนี้แล้ว หากแท็บไม่เปิด ใช้ลิงก์เปิดร่างด้านล่าง',
    );
  }
  function download() {
    if (!validateStory(draft)) {
      setError('ตรวจข้อมูลให้ครบก่อนดาวน์โหลด');
      return;
    }
    const url = URL.createObjectURL(
      new Blob(
        [JSON.stringify({ version: 1, template: id, story: draft }, null, 2)],
        { type: 'application/json' },
      ),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `luvnote-${id}-draft.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 4_800_000) throw Error();
      const value = JSON.parse(await file.text());
      if (
        value.version !== 1 ||
        value.template !== id ||
        !validateStory(value.story)
      )
        throw Error();
      replaceDraft(value.story);
      onApply(value.story);
      setError('');
      setNotice('นำเข้าร่างและอัปเดตตัวอย่างแล้ว');
    } catch {
      setError('ไฟล์ร่างไม่ถูกต้อง หรือเป็นร่างของเทมเพลตอื่น');
    }
  }
  function choices(value: StoryChoices) {
    update('choices', value);
  }
  const branch = draft.choices || defaultChoices;
  const field = (
    key:
      | 'to'
      | 'from'
      | 'title'
      | 'headline'
      | 'intro'
      | 'letter'
      | 'secret'
      | 'closing',
    label: string,
    multiline = false,
  ) => (
    <label className="studio-field" key={key}>
      <span>{label}</span>
      {multiline ? (
        <textarea
          value={draft[key] || ''}
          rows={key === 'letter' ? 7 : 3}
          maxLength={key === 'intro' ? 1200 : 8000}
          onChange={(e) => update(key, e.target.value)}
        />
      ) : (
        <input
          value={draft[key] || ''}
          maxLength={['to', 'from'].includes(key) ? 120 : 240}
          onChange={(e) => update(key, e.target.value)}
        />
      )}
    </label>
  );
  return (
    <details className="config-editor studio" id="studio" open>
      <summary>ปรับแต่งการ์ดนี้</summary>
      <p className="studio-intro">
        ลองด้วยรูปและคำของคุณเอง ข้อมูลไม่ถูกส่งไปเซิร์ฟเวอร์
        การบันทึกและแท็บร่างใช้เฉพาะเบราว์เซอร์นี้
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          apply();
        }}
      >
        <fieldset disabled={busy}>
          <legend>ถึงใคร จากใคร</legend>
          <div className="studio-two">
            {field('to', 'ชื่อผู้รับ')}
            {field('from', 'ชื่อผู้ส่ง')}
          </div>
          <div className="studio-two">
            {field('title', 'ชื่อเรื่อง / โอกาสพิเศษ')}
            <label className="studio-field">
              <span>วันที่เรื่องราวเริ่ม</span>
              <input
                type="date"
                value={draft.date}
                onChange={(e) => update('date', e.target.value)}
              />
            </label>
          </div>
          {field('headline', 'ข้อความบนปก (เว้นว่างเพื่อใช้สำนวนของธีม)')}
          {field('intro', 'คำเกริ่นถึงผู้รับ', true)}
          <div className="studio-cover">
            <img
              src={draft.cover || draft.moments[0].image}
              alt="รูปปกที่เลือก"
            />
            <div>
              <label className="studio-upload">
                เลือกรูปปก
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const f = Array.from(e.target.files || []);
                    e.target.value = '';
                    void choosePhotos(f, 'cover');
                  }}
                />
              </label>
              {draft.cover && (
                <button
                  type="button"
                  onClick={() => update('cover', undefined)}
                >
                  ใช้รูปแรกเป็นปก
                </button>
              )}
            </div>
          </div>
        </fieldset>
        <fieldset disabled={busy}>
          <legend>ความทรงจำ {draft.moments.length} / 8</legend>
          <p>รูปแต่ละรูปมีเรื่องเล่าของตัวเอง ลองใส่สิ่งที่อยากให้คนรับจำได้</p>
          {draft.moments.map((m, i) => (
            <section className="studio-memory" key={m.id}>
              <div className="studio-memory-photo">
                <img src={m.image} alt={m.alt} />
                <label className="studio-upload">
                  เปลี่ยนรูปที่ {i + 1}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const f = Array.from(e.target.files || []);
                      e.target.value = '';
                      void choosePhotos(f, i);
                    }}
                  />
                </label>
              </div>
              <div className="studio-memory-fields">
                <label className="studio-field">
                  <span>ชื่อความทรงจำ {i + 1}</span>
                  <input
                    value={m.title}
                    maxLength={300}
                    onChange={(e) => moment(i, 'title', e.target.value)}
                  />
                </label>
                <div className="studio-two">
                  <label className="studio-field">
                    <span>วันที่รูป {i + 1}</span>
                    <input
                      type="date"
                      value={m.date}
                      onChange={(e) => moment(i, 'date', e.target.value)}
                    />
                  </label>
                  <label className="studio-field">
                    <span>สถานที่รูป {i + 1}</span>
                    <input
                      value={m.place}
                      maxLength={300}
                      onChange={(e) => moment(i, 'place', e.target.value)}
                    />
                  </label>
                </div>
                <label className="studio-field">
                  <span>เรื่องเล่ารูป {i + 1}</span>
                  <textarea
                    rows={3}
                    value={m.note}
                    maxLength={8000}
                    onChange={(e) => moment(i, 'note', e.target.value)}
                  />
                </label>
                <label className="studio-field">
                  <span>โน้ตเล็ก ๆ ของรูป {i + 1}</span>
                  <textarea
                    rows={2}
                    value={m.aside || ''}
                    maxLength={4000}
                    onChange={(e) => moment(i, 'aside', e.target.value)}
                  />
                </label>
                {(id === 'capsule' || id === 'polaroid') && (
                  <div className="studio-two">
                    <label className="studio-field">
                      <span>ชื่อของที่ระลึก {i + 1}</span>
                      <input
                        value={m.keepsake || ''}
                        maxLength={240}
                        onChange={(e) => moment(i, 'keepsake', e.target.value)}
                      />
                    </label>
                    <label className="studio-field">
                      <span>ชนิดของที่ระลึก {i + 1}</span>
                      <select
                        value={m.keepsakeType || 'photo'}
                        onChange={(e) =>
                          moment(i, 'keepsakeType', e.target.value)
                        }
                      >
                        <option value="photo">รูปถ่าย</option>
                        <option value="ticket">ตั๋ว</option>
                        <option value="key">กุญแจ</option>
                        <option value="letter">จดหมาย</option>
                      </select>
                    </label>
                  </div>
                )}
                <label className="studio-field">
                  <span>คำอธิบายภาพสำหรับโปรแกรมอ่านหน้าจอ {i + 1}</span>
                  <input
                    value={m.alt}
                    maxLength={1000}
                    onChange={(e) => moment(i, 'alt', e.target.value)}
                  />
                </label>
                <div className="studio-order">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label={`เลื่อนรูป ${i + 1} ขึ้น`}
                  >
                    เลื่อนขึ้น
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === draft.moments.length - 1}
                    aria-label={`เลื่อนรูป ${i + 1} ลง`}
                  >
                    เลื่อนลง
                  </button>
                  <button
                    type="button"
                    disabled={draft.moments.length === 1}
                    onClick={() =>
                      update(
                        'moments',
                        draft.moments.filter((_, n) => n !== i),
                      )
                    }
                    aria-label={`ลบรูป ${i + 1}`}
                  >
                    ลบรูป
                  </button>
                </div>
              </div>
            </section>
          ))}
          <label className="studio-upload">
            เพิ่มรูปความทรงจำ
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              disabled={draft.moments.length >= 8}
              onChange={(e) => {
                const f = Array.from(e.target.files || []);
                e.target.value = '';
                void choosePhotos(f);
              }}
            />
          </label>
        </fieldset>
        <fieldset disabled={busy}>
          <legend>คำที่อยากบอก</legend>
          {field('letter', 'จดหมายฉบับเต็ม', true)}
          {field('secret', 'ข้อความเซอร์ไพรส์', true)}
          {field('closing', 'คำสัญญา / ข้อความปิดท้าย', true)}
        </fieldset>
        {id === 'choose' && (
          <fieldset disabled={busy}>
            <legend>เส้นเรื่องและตอนจบ</legend>
            {branch.questions.map((q, i) => (
              <div className="studio-branch" key={i}>
                <label className="studio-field">
                  <span>คำถามที่ {i + 1}</span>
                  <input
                    value={q}
                    maxLength={500}
                    onChange={(e) => {
                      const c = structuredClone(branch);
                      c.questions[i] = e.target.value;
                      choices(c);
                    }}
                  />
                </label>
                <div className="studio-two">
                  {branch.options[i].map((v, j) => (
                    <label className="studio-field" key={j}>
                      <span>
                        ตัวเลือก {i + 1}.{j + 1}
                      </span>
                      <input
                        value={v}
                        maxLength={120}
                        onChange={(e) => {
                          const c = structuredClone(branch);
                          c.options[i][j] = e.target.value;
                          choices(c);
                        }}
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
            {branch.endings.map((v, i) => (
              <div className="studio-branch" key={i}>
                <label className="studio-field">
                  <span>ชื่อตอนจบ {i + 1}</span>
                  <input
                    value={v.title}
                    maxLength={300}
                    onChange={(e) => {
                      const c = structuredClone(branch);
                      c.endings[i].title = e.target.value;
                      choices(c);
                    }}
                  />
                </label>
                <label className="studio-field">
                  <span>เรื่องราวตอนจบ {i + 1}</span>
                  <textarea
                    value={v.text}
                    maxLength={4000}
                    onChange={(e) => {
                      const c = structuredClone(branch);
                      c.endings[i].text = e.target.value;
                      choices(c);
                    }}
                  />
                </label>
              </div>
            ))}
          </fieldset>
        )}
        <fieldset disabled={busy}>
          <legend>เพลงประกอบ</legend>
          <label className="studio-field">
            <span>เพลงที่ผู้รับเลือกเปิดฟังได้</span>
            <select
              value={draft.music?.type || 'none'}
              onChange={(e) =>
                update(
                  'music',
                  e.target.value === 'youtube'
                    ? { type: 'youtube', id: '', start: 0 }
                    : { type: e.target.value as 'none' | 'demo' },
                )
              }
            >
              <option value="none">ไม่มีเพลง</option>
              <option value="demo">ดนตรีกล่องเพลง</option>
              <option value="youtube">เพลงจาก YouTube</option>
            </select>
          </label>
          {draft.music?.type === 'youtube' && (
            <>
              <label className="studio-field">
                <span>ลิงก์ YouTube</span>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => {
                    setYoutubeUrl(e.target.value);
                    update('music', {
                      type: 'youtube',
                      id: youtubeId(e.target.value) || '',
                      start:
                        draft.music?.type === 'youtube' ? draft.music.start : 0,
                    });
                  }}
                />
              </label>
              <label className="studio-field">
                <span>เวลาเริ่มเพลง (นาที:วินาที)</span>
                <input
                  placeholder="0:00"
                  value={musicStart}
                  onChange={(e) => {
                    setMusicStart(e.target.value);
                    update('music', {
                      type: 'youtube',
                      id: draft.music?.type === 'youtube' ? draft.music.id : '',
                      start: seconds(e.target.value),
                    });
                  }}
                />
              </label>
              <p>
                บางเพลงไม่อนุญาตให้เล่นบนเว็บอื่น การ์ดยังอ่านได้เมื่อปิดเพลง
              </p>
            </>
          )}
        </fieldset>
        <p className="studio-error" role="alert">
          {error}
        </p>
        <p className="studio-notice" role="status">
          {busy ? 'กำลังเตรียมรูปในเครื่อง…' : notice}
        </p>
        <div className="studio-actions">
          <Button type="submit" disabled={busy}>
            อัปเดตตัวอย่าง <Icon name="check" size={18} />
          </Button>
          <Button variant="quiet" onClick={save} disabled={busy}>
            บันทึกร่างในเครื่อง
          </Button>
          <Button variant="quiet" onClick={preview} disabled={busy}>
            ดูการ์ดที่แก้ไขในแท็บใหม่
          </Button>
        </div>
        {stored && (
          <div className="studio-saved">
            <a
              href={`${labHome}?play=${id}&draft=1`}
              target="_blank"
              rel="noreferrer"
            >
              เปิดร่างในแท็บใหม่
            </a>
            <button
              type="button"
              onClick={() => {
                try {
                  const s = JSON.parse(
                    localStorage.getItem(draftKey(id)) || 'null',
                  );
                  if (
                    s?.version !== 1 ||
                    s.template !== id ||
                    !validateStory(s.story)
                  )
                    throw Error();
                  replaceDraft(s.story);
                  onApply(s.story);
                  setError('');
                  setNotice('โหลดร่างในเครื่องแล้ว');
                } catch {
                  setError(
                    'อ่านร่างนี้ไม่ได้ ลองนำเข้าไฟล์ร่างที่ดาวน์โหลดไว้',
                  );
                }
              }}
            >
              โหลดร่างในเครื่อง
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.removeItem(draftKey(id));
                  setStored(false);
                  setNotice('ลบร่างที่บันทึกแล้ว ข้อมูลในฟอร์มยังอยู่');
                } catch {
                  setError('ลบร่างไม่ได้ ตรวจสิทธิ์เบราว์เซอร์');
                }
              }}
            >
              ลบร่างที่บันทึก
            </button>
          </div>
        )}
        <p className="studio-privacy">
          แท็บร่างเปิดได้จากเบราว์เซอร์ที่บันทึกเท่านั้น
          ยังไม่ใช่ลิงก์ส่งให้ลูกค้า การสร้างลิงก์จริงต้องผ่านระบบเผยแพร่และ R2
          เดิม
        </p>
        <div className="studio-transfer">
          <button type="button" onClick={download}>
            ดาวน์โหลดไฟล์ร่าง
          </button>
          <label>
            นำเข้าไฟล์ร่าง
            <input
              type="file"
              accept="application/json,.json"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                void importFile(f);
              }}
            />
          </label>
        </div>
      </form>
      <details className="studio-json">
        <summary>แก้ไข JSON สำหรับผู้พัฒนา</summary>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            try {
              const value = JSON.parse(json);
              if (!apply(value)) return;
              replaceDraft(value);
            } catch {
              setError(
                'JSON ไม่ถูกต้อง ตรวจชื่อ ข้อความ วันที่ และรูปอีกครั้ง',
              );
            }
          }}
        >
          <label htmlFor="story-json">Story configuration (JSON)</label>
          <textarea
            id="story-json"
            value={json}
            onChange={(e) => setJson(e.target.value)}
            spellCheck={false}
            rows={10}
          />
          <Button type="submit">ใช้ข้อมูลนี้กับต้นแบบ</Button>
        </form>
      </details>
    </details>
  );
}
