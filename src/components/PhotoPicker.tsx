import { useRef, useState } from 'react';
import type { Photo, ThemeConfig } from '../types';
import { readPhoto } from '../lib/images';

export function PhotoPicker({
  photos,
  cover,
  theme,
  onPhotos,
  onCover,
  toast,
  onBusy,
}: {
  photos: Photo[];
  cover: string | null;
  theme: ThemeConfig;
  onPhotos: (update: (previous: Photo[]) => Photo[]) => void;
  onCover: (cover: string | null) => void;
  toast: (message: string) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  async function add(files: File[]) {
    if (pending.current) return;
    const selected = files.slice(0, 5 - photos.length);
    if (!selected.length) {
      toast('ใส่ได้สูงสุด 5 รูปนะ');
      return;
    }
    pending.current = true;
    setBusy(true);
    onBusy(true);
    try {
      const added: Photo[] = [];
      for (const file of selected) {
        try {
          added.push({ src: await readPhoto(file), cap: '' });
        } catch {
          toast('อ่านรูปนี้ไม่ได้ ลองรูปอื่นนะ');
        }
      }
      onPhotos((previous) => [...previous, ...added].slice(0, 5));
    } finally {
      pending.current = false;
      setBusy(false);
      onBusy(false);
    }
  }
  async function selectCover(file: File | undefined) {
    if (!file || pending.current) return;
    pending.current = true;
    setBusy(true);
    onBusy(true);
    try {
      onCover(await readPhoto(file, 700));
    } catch {
      toast('อ่านรูปนี้ไม่ได้ ลองรูปอื่นนะ');
    } finally {
      pending.current = false;
      setBusy(false);
      onBusy(false);
    }
  }
  return (
    <>
      <div className="photos" id="photos">
        {photos.map((photo, index) => (
          <div className="ph" key={photo.src + index}>
            <div className="th">
              <img src={photo.src} alt={`รูปที่ ${index + 1}`} />
              <span className="no en">{index + 1}</span>
            </div>
            <input
              type="text"
              maxLength={30}
              enterKeyHint="done"
              aria-label={`คำบรรยายรูปที่ ${index + 1}`}
              placeholder="พิมพ์คำบรรยายรูป…"
              value={photo.cap}
              onChange={(event) =>
                onPhotos((previous) =>
                  previous.map((p, i) =>
                    i === index ? { ...p, cap: event.target.value } : p,
                  ),
                )
              }
            />
            <button
              type="button"
              className="x"
              aria-label={`ลบรูปที่ ${index + 1}`}
              onClick={() =>
                onPhotos((previous) => previous.filter((_, i) => i !== index))
              }
            >
              ✕
            </button>
          </div>
        ))}
        <label
          className={`add${busy ? ' busy' : ''}`}
          id="addBtn"
          style={{ display: photos.length >= 5 ? 'none' : undefined }}
        >
          <b>+</b>
          {busy ? 'กำลังอ่านรูป…' : 'เพิ่มรูป'}{' '}
          <span className="en" style={{ opacity: 0.6, fontSize: 13 }}>
            (สูงสุด 5)
          </span>
          <input
            type="file"
            id="file"
            accept="image/*"
            multiple
            hidden
            disabled={busy}
            aria-label="เพิ่มรูปความทรงจำ"
            onChange={(event) => {
              const files = Array.from(event.target.files || []);
              event.target.value = '';
              if (files.length) void add(files);
            }}
          />
        </label>
      </div>
      {theme.coverLabel && (
        <>
          <label htmlFor="covFile" style={{ marginTop: 14 }}>
            {theme.coverLabel}
          </label>
          <div className={`cov${cover ? ' has' : ''}`} id="cov">
            <label className="cvb" id="covBtn">
              {cover && <img id="covImg" src={cover} alt="รูปที่เลือก" />}
              <span id="covTxt">
                {cover ? 'เปลี่ยนรูป' : '📷 แตะเพื่อเลือกรูป'}
              </span>
              <input
                type="file"
                id="covFile"
                accept="image/*"
                hidden
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  void selectCover(file);
                }}
              />
            </label>
            {cover && (
              <button
                type="button"
                className="x"
                id="covX"
                aria-label="ลบรูปโปรไฟล์"
                onClick={() => onCover(null)}
              >
                ✕
              </button>
            )}
          </div>
          <p className="help">{theme.coverHelp}</p>
        </>
      )}
      {theme.photoHelp.map((help) => (
        <p className="help" key={help}>
          {help}
        </p>
      ))}
    </>
  );
}
