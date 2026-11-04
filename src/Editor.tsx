import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { CardData, CreatedCard, EditorState, ThemeConfig } from './types';
import { CHAT_TEMPLATES } from './themes';
import {
  cardData,
  cleanChat,
  editTarget,
  invalidFields,
  stateFromCard,
  youtubeId,
  type InvalidField,
} from './lib/card';
import { createCard } from './lib/api';
import { R2_MEDIA_ENABLED, TURNSTILE_SITE_KEY, checkEditKey, editR2Card, loadCardForEdit } from './lib/media-v3';
import { UploadVerification } from './components/UploadVerification';
import { Hero } from './components/Hero';
import { Section } from './components/Section';
import { PhotoPicker } from './components/PhotoPicker';
import { MusicPicker } from './components/MusicPicker';
import { ChatEditor } from './components/ChatEditor';
import { PreviewDialog } from './components/PreviewDialog';
import { ShareDialog } from './components/ShareDialog';
import { dateLabel, daysTogether, today, validDate } from './lib/dates';

export function Editor({ theme }: { theme: ThemeConfig }) {
  const hasChat = theme.id === 'birthday-chat';
  const anniversary = theme.occasion === 'anniversary';
  const [state, setState] = useState<EditorState>(() => ({
    to: '',
    from: '',
    age: '',
    startDate: '',
    letter: '',
    secret: '',
    code: '',
    hint: '',
    youtube: '',
    musicStart: '',
    endMsg: '',
    lock: theme.defaultLock,
    effect: theme.effects[0].value,
    photos: [],
    cover: null,
    chat: hasChat ? structuredClone(CHAT_TEMPLATES[0]) : [],
  }));
  // Owner edit mode: `?edit=<card>#key=<secret>` loads the card and saves over it.
  // After a new card is created the editor switches to editing that card, so a second click on
  // "save" fixes the link already sent instead of creating a duplicate card.
  const linkTarget = useMemo(() => editTarget(window.location), []);
  const [editing, setEditing] = useState(linkTarget);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'ready' | 'error' | 'denied' | 'expired'>(
    linkTarget ? 'loading' : 'idle',
  );
  const [errors, setErrors] = useState<InvalidField[]>([]);
  const [musicAllowed, setMusicAllowed] = useState(false);
  const [photosBusy, setPhotosBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [verificationVersion, setVerificationVersion] = useState(0);
  const [preview, setPreview] = useState<Partial<CardData> | null>(null);
  const [created, setCreated] = useState<{
    result: CreatedCard;
    recipient: string;
    edited: boolean;
  } | null>(null);
  const [message, setMessage] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const request = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      clearTimeout(toastTimer.current);
      request.current?.abort();
    },
    [],
  );
  useEffect(() => {
    if (!linkTarget) return;
    if (!R2_MEDIA_ENABLED) {
      setLoadState('error');
      return;
    }
    const controller = new AbortController();
    checkEditKey(linkTarget.id, linkTarget.key, controller.signal)
      .then(async (access) => {
        if (access !== 'ok') return setLoadState(access);
        const card = await loadCardForEdit(linkTarget.id, controller.signal);
        if (card.theme !== theme.id) throw new Error('theme_mismatch');
        setState(stateFromCard(card.data, theme, hasChat ? structuredClone(CHAT_TEMPLATES[0]) : []));
        setLoadState('ready');
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setLoadState(error instanceof Error && error.message === 'expired' ? 'expired' : 'error');
      });
    return () => controller.abort();
  }, [linkTarget, theme, hasChat]);
  function toast(text: string) {
    setMessage(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setMessage(''), 2400);
  }
  function update<K extends keyof EditorState>(key: K, value: EditorState[K]) {
    setState((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => previous.filter((field) => field !== key));
  }
  const complete = {
    names:
      !!(state.to.trim() && state.from.trim()) &&
      (!anniversary ||
        (validDate(state.startDate) && state.startDate <= today())),
    photos: state.photos.length > 0,
    letter: !!state.letter.trim(),
    ...(theme.noSecret
      ? {}
      : {
          secret:
            !!state.secret.trim() &&
            (state.lock !== 'code' || /^\d{4}$/.test(state.code)),
        }),
    music: !!youtubeId(state.youtube),
    fx: true,
    end: !!state.endMsg.trim(),
    ...(hasChat
      ? { chat: cleanChat(state.chat).some((row) => row.w === 'f') }
      : {}),
  };
  const progress =
    (Object.values(complete).filter(Boolean).length /
      Object.values(complete).length) *
    100;
  function validate() {
    const bad = invalidFields(state, hasChat, anniversary, !!theme.noSecret);
    setErrors(bad);
    if (!bad.length) return true;
    const element =
      bad[0] === 'chat'
        ? document.getElementById('cl')
        : document.getElementById(bad[0]);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element?.focus({ preventScroll: true });
    toast(
      bad[0] === 'chat'
        ? 'ใส่ข้อความในแชทอย่างน้อย 1 ข้อความนะ'
        : 'ยังกรอกไม่ครบ ลองดูช่องสีแดงนะ',
    );
    return false;
  }
  function openPreview() {
    if (
      !state.to.trim() ||
      !state.from.trim() ||
      (anniversary && invalidFields(state, hasChat, true, !!theme.noSecret).includes('startDate'))
    ) {
      validate();
      return;
    }
    const data = cardData(state, theme, musicAllowed);
    setPreview({
      ...data,
      letter: data.letter || '(ยังไม่ได้เขียนจดหมาย)',
      secret: data.secret || '(ยังไม่ได้ใส่ข้อความลับ)',
      expires: new Date(Date.now() + 90 * 864e5).toISOString(),
    });
  }
  async function submit() {
    if (request.current || photosBusy || !validate()) return;
    if (editing && loadState !== 'ready') return;
    if (R2_MEDIA_ENABLED && !verificationToken) {
      // The invisible security check may still be loading or may have failed: retry it.
      setVerificationVersion((n) => n + 1);
      toast('กำลังตรวจสอบความปลอดภัย รอสักครู่แล้วกดอีกครั้งนะ');
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    const timer = setTimeout(() => controller.abort(), R2_MEDIA_ENABLED ? 120000 : 30000);
    try {
      const data = cardData(state, theme, musicAllowed);
      const wasEditing = !!editing;
      const result = editing
        ? await editR2Card(theme.id, editing.id, editing.key, data, verificationToken || '', controller.signal)
        : await createCard(theme.id, data, controller.signal, verificationToken || undefined);
      setCreated({ result, recipient: data.to, edited: wasEditing });
      if (!wasEditing && result.editKey) {
        setEditing({ id: result.id, key: result.editKey });
        setLoadState('ready');
        try {
          history.replaceState(null, '', `?edit=${result.id}#key=${result.editKey}`);
        } catch { /* the address bar is optional */ }
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : '';
      if (reason === 'edit_denied') setLoadState('denied');
      if (reason === 'expired') setLoadState('expired');
      toast(
        reason === 'too_large'
          ? 'รูปใหญ่เกินไป ลองลดจำนวนรูปนะ'
          : reason === 'quota_exceeded' || reason === 'rate_limited'
            ? 'ตอนนี้มีคนใช้งานเยอะ รอสักครู่แล้วลองใหม่นะ'
          : reason === 'edit_denied'
            ? 'ลิงก์แก้ไขนี้ใช้ไม่ได้แล้ว ทัก LINE ร้านเพื่อขอลิงก์ใหม่นะ'
          : reason === 'expired'
            ? 'การ์ดใบนี้หมดอายุแล้ว แก้ไขไม่ได้'
          : reason === 'verification_failed'
            ? 'ยืนยันความปลอดภัยไม่ผ่าน ลองกดอีกครั้งนะ'
          : editing
            ? 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้งนะ'
            : 'สร้างลิงก์ไม่สำเร็จ ลองใหม่อีกครั้งนะ',
      );
    } finally {
      clearTimeout(timer);
      if (R2_MEDIA_ENABLED) {
        setVerificationToken(null);
        setVerificationVersion((n) => n + 1);
      }
      request.current = null;
      setBusy(false);
    }
  }
  const fieldClass = (field: InvalidField) =>
    `f${errors.includes(field) ? ' err' : ''}`;
  const section = (
    name: keyof typeof complete,
    number: number,
    title: string,
    children: ReactNode,
    optional?: ReactNode,
  ) => (
    <Section
      name={name}
      number={number}
      title={title}
      complete={!!complete[name]}
      optional={optional}
    >
      {children}
    </Section>
  );
  const offset = hasChat ? 1 : 0;
  const after = offset - (theme.noSecret ? 1 : 0);
  return (
    <div
      className={anniversary ? 'anniversary-editor' : undefined}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
          event.preventDefault();
          event.target.blur();
        }
      }}
    >
      <header>
        <div className="hd">
          <a href="../../" aria-label="กลับ">
            ‹
          </a>
          <div className="logo">
            LuvNote <span>♡</span>
          </div>
        </div>
        <div
          className="prog"
          role="progressbar"
          aria-label="ความคืบหน้าการกรอกข้อมูล"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <i id="prog" style={{ width: `${progress}%` }} />
        </div>
      </header>
      <main className="wrap" aria-busy={busy || loadState === 'loading'}>
        {editing && (
          <p className="editbanner" role="status" id="editBanner">
            {loadState === 'loading' && 'กำลังโหลดการ์ดเดิม…'}
            {loadState === 'ready' &&
              '✏️ กำลังแก้ไขการ์ดเดิม กดบันทึกแล้วลิงก์เดิมจะแสดงข้อมูลใหม่ทันที'}
            {loadState === 'error' &&
              'เปิดการ์ดเพื่อแก้ไขไม่ได้ ลองรีเฟรชหน้านี้อีกครั้ง หรือเช็กว่าลิงก์ครบถ้วน'}
            {loadState === 'denied' &&
              'ลิงก์แก้ไขนี้ใช้ไม่ได้แล้ว (อาจมีการออกลิงก์ใหม่ให้) ทัก LINE ร้านเพื่อขอลิงก์ล่าสุดนะ'}
            {loadState === 'expired' &&
              'การ์ดใบนี้หมดอายุแล้ว จึงแก้ไขไม่ได้ ถ้าอยากต่ออายุ ทัก LINE ร้านได้เลย'}
          </p>
        )}
        <Hero theme={theme} onDemo={() => setPreview({})} />
        {section(
          'names',
          1,
          'ส่งถึงใคร จากใคร',
          <>
            <div className={fieldClass('to')} id="f-to">
              <label htmlFor="to">
                ชื่อผู้รับ <span className="req">*</span>
              </label>
              <input
                type="text"
                id="to"
                maxLength={30}
                placeholder={theme.toPlaceholder}
                value={state.to}
                aria-required="true"
                aria-invalid={errors.includes('to')}
                aria-describedby="to-error"
                onChange={(e) => update('to', e.target.value)}
              />
              <p className="emsg" id="to-error">
                ใส่ชื่อผู้รับด้วยนะ
              </p>
            </div>
            <div className="row">
              <div className={fieldClass('from')} id="f-from">
                <label htmlFor="from">
                  ชื่อผู้ส่ง <span className="req">*</span>
                </label>
                <input
                  type="text"
                  id="from"
                  maxLength={30}
                  placeholder={theme.fromPlaceholder}
                  value={state.from}
                  aria-required="true"
                  aria-invalid={errors.includes('from')}
                  aria-describedby="from-error"
                  onChange={(e) => update('from', e.target.value)}
                />
                <p className="emsg" id="from-error">
                  ใส่ชื่อผู้ส่งด้วยนะ
                </p>
              </div>
              {!anniversary && (
                <div style={{ flex: 0.55 }}>
                  <label htmlFor="age">ครบกี่ปี</label>
                  <input
                    type="number"
                    id="age"
                    inputMode="numeric"
                    min={1}
                    max={120}
                    placeholder="ไม่ใส่ก็ได้"
                    value={state.age}
                    onChange={(e) => update('age', e.target.value)}
                  />
                </div>
              )}
            </div>
            {anniversary && (
              <div className={fieldClass('startDate')} id="f-startDate">
                <label htmlFor="startDate">
                  วันที่เราเริ่มคบกัน <span className="req">*</span>
                </label>
                <input
                  id="startDate"
                  type="date"
                  min="1900-01-01"
                  max={today()}
                  value={state.startDate}
                  aria-required="true"
                  aria-invalid={errors.includes('startDate')}
                  aria-describedby="startDate-error"
                  onChange={(e) => update('startDate', e.target.value)}
                />
                <p className="emsg" id="startDate-error">
                  เลือกวันเริ่มคบที่ไม่เกินวันนี้นะ
                </p>
                {validDate(state.startDate) && state.startDate <= today() && (
                  <p className="together-hint">
                    ตั้งแต่ {dateLabel(state.startDate)} · มีกันมาแล้ว{' '}
                    <b>
                      {daysTogether(state.startDate).toLocaleString('th-TH')}
                    </b>{' '}
                    วัน ♡
                  </p>
                )}
              </div>
            )}
          </>,
        )}
        {hasChat &&
          section(
            'chat',
            2,
            'บทแชท',
            <ChatEditor
              rows={state.chat}
              photoCount={state.photos.length}
              onChange={(rows) => update('chat', rows)}
              toast={toast}
            />,
            <>
              <span className="en" id="cc">
                {state.chat.length}
              </span>
              /16
            </>,
          )}
        {section(
          'photos',
          2 + offset,
          theme.photoTitle,
          <PhotoPicker
            photos={state.photos}
            cover={state.cover}
            theme={theme}
            onPhotos={(fn) =>
              setState((previous) => ({
                ...previous,
                photos: fn(previous.photos),
              }))
            }
            onCover={(cover) => update('cover', cover)}
            toast={toast}
            onBusy={setPhotosBusy}
          />,
          <>
            <span className="en" id="pc">
              {state.photos.length}
            </span>
            /5 รูป
          </>,
        )}
        {section(
          'letter',
          3 + offset,
          theme.letterTitle,
          <>
            <div className="tpls" id="tpls">
              {(anniversary
                ? [
                    '♡ รักเรียบง่าย',
                    '✎ จากใจ',
                    '☺ ขำ ๆ ของเรา',
                    '∞ สัญญาด้วยกัน',
                  ]
                : ['💗 หวานๆ', '🥹 ซึ้งๆ', '😆 ขำๆ', '👫 ถึงเพื่อน']
              ).map((label, index) => (
                <button
                  type="button"
                  key={label}
                  onClick={() => update('letter', theme.templates[index])}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className={fieldClass('letter')} id="f-letter">
              <textarea
                id="letter"
                aria-labelledby="letter-title"
                aria-required="true"
                aria-invalid={errors.includes('letter')}
                aria-describedby="letter-error"
                rows={6}
                maxLength={600}
                placeholder="พิมพ์ข้อความที่อยากบอก หรือกดเลือกข้อความตัวอย่างด้านบน"
                value={state.letter}
                onChange={(e) => update('letter', e.target.value)}
              />
              <p className="emsg" id="letter-error">
                เขียนจดหมายสักหน่อยนะ
              </p>
            </div>
            <p className="cnt">
              <span id="lc">{state.letter.length}</span>/600
            </p>
          </>,
        )}
        {!theme.noSecret && section(
          'secret',
          4 + offset,
          theme.secretTitle,
          <>
            <div className={fieldClass('secret')} id="f-secret">
              <textarea
                id="secret"
                aria-labelledby="secret-title"
                aria-required="true"
                aria-invalid={errors.includes('secret')}
                aria-describedby="secret-error"
                rows={2}
                maxLength={120}
                placeholder={theme.secretPlaceholder}
                value={state.secret}
                onChange={(e) => update('secret', e.target.value)}
              />
              <p className="emsg" id="secret-error">
                ใส่ข้อความลับด้วยนะ
              </p>
            </div>
            <p className="cnt">
              <span id="sc">{state.secret.length}</span>/120
            </p>
            <label id="lock-label">วิธีปลดล็อก</label>
            <div
              className="seg"
              id="lockSeg"
              role="group"
              aria-labelledby="lock-label"
            >
              <button
                type="button"
                className={state.lock !== 'code' ? 'on' : ''}
                aria-pressed={state.lock !== 'code'}
                onClick={() => update('lock', theme.defaultLock)}
              >
                {theme.lockLabel}
              </button>
              <button
                type="button"
                className={state.lock === 'code' ? 'on' : ''}
                aria-pressed={state.lock === 'code'}
                onClick={() => update('lock', 'code')}
              >
                {theme.codeLabel}
              </button>
            </div>
            <div
              className={`codebox${state.lock === 'code' ? ' show' : ''}`}
              id="codebox"
            >
              <div className="row">
                <div className={fieldClass('code')} id="f-code">
                  <label htmlFor="code">รหัส 4 หลัก</label>
                  <input
                    type="tel"
                    id="code"
                    maxLength={4}
                    inputMode="numeric"
                    placeholder="เช่น 1402"
                    value={state.code}
                    aria-invalid={errors.includes('code')}
                    onChange={(e) =>
                      update(
                        'code',
                        e.target.value.replace(/\D/g, '').slice(0, 4),
                      )
                    }
                  />
                  <p className="emsg">ใส่ตัวเลข 4 หลัก</p>
                </div>
                <div style={{ flex: 1.4 }}>
                  <label htmlFor="hint">คำใบ้</label>
                  <input
                    type="text"
                    id="hint"
                    maxLength={40}
                    placeholder="เช่น วันครบรอบเรา"
                    value={state.hint}
                    onChange={(e) => update('hint', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </>,
        )}
        {section(
          'music',
          5 + after,
          'เพลงประกอบ',
          <MusicPicker
            value={state.youtube}
            start={state.musicStart}
            help={theme.musicHelp}
            onValue={(value) => update('youtube', value)}
            onStart={(value) => update('musicStart', value)}
            onAllowed={setMusicAllowed}
          />,
          'ไม่ใส่ก็ได้',
        )}
        {section(
          'fx',
          6 + after,
          'เอฟเฟกต์ลอยบนการ์ด',
          <div className="fxs" id="fxs">
            {theme.effects.map((effect) => (
              <button
                type="button"
                key={effect.value}
                className={`fx${state.effect === effect.value ? ' on' : ''}`}
                aria-pressed={state.effect === effect.value}
                onClick={() => update('effect', effect.value)}
              >
                <span className="ic">
                  {effect.icons.map((icon, index) => (
                    <span key={index}>{icon}</span>
                  ))}
                </span>
                <span className="fx-label">{effect.label}</span>
              </button>
            ))}
          </div>,
        )}
        {section(
          'end',
          7 + after,
          'คำปิดท้าย',
          <textarea
            id="endMsg"
            aria-labelledby="end-title"
            rows={2}
            maxLength={120}
            placeholder={theme.endPlaceholder}
            value={state.endMsg}
            onChange={(e) => update('endMsg', e.target.value)}
          />,
          'ไม่ใส่ก็ได้',
        )}
      </main>
      {R2_MEDIA_ENABLED && (
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          {TURNSTILE_SITE_KEY
            ? <UploadVerification key={verificationVersion} onToken={setVerificationToken} />
            : <p role="alert">ระบบอัปโหลดรูปยังไม่พร้อม กรุณาติดต่อผู้ดูแล</p>}
        </div>
      )}
      <div className="bar">
        <div className="in">
          <button
            type="button"
            className="btn sec2"
            id="pvBtn"
            disabled={photosBusy || busy}
            onClick={(event) => {
              event.currentTarget.focus({ preventScroll: true });
              openPreview();
            }}
          >
            👀 ดูตัวอย่าง
          </button>
          <button
            type="button"
            className="btn pri"
            id="mkBtn"
            disabled={busy || photosBusy || (!!editing && loadState !== 'ready')}
            onClick={() => void submit()}
          >
            {editing
              ? busy ? 'กำลังบันทึก…' : 'บันทึกการแก้ไข ♡'
              : busy ? 'กำลังสร้างลิงก์…' : 'สร้างลิงก์ ♡'}
          </button>
        </div>
      </div>
      {preview && (
        <PreviewDialog
          theme={theme}
          card={preview}
          onClose={() => setPreview(null)}
        />
      )}
      {created && (
        <ShareDialog
          theme={theme}
          result={created.result}
          recipient={created.recipient}
          edited={created.edited}
          onClose={() => setCreated(null)}
          toast={toast}
        />
      )}
      <div
        className={`toast${message ? ' show' : ''}`}
        id="toast"
        role="status"
        aria-live="polite"
      >
        {message}
      </div>
    </div>
  );
}
