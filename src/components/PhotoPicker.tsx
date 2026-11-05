import { useRef, useState } from 'react';
import type { Photo, ThemeConfig } from '../types';
import { readPhoto } from '../lib/images';
import { today } from '../lib/dates';
import { R2_MEDIA_ENABLED } from '../lib/media-v3';

function imageReadError(error: unknown): string {
  return error instanceof Error && error.message === 'image_too_large'
    ? 'รูปใหญ่เกิน 15 MB กรุณาเลือกรูปที่เล็กลง'
    : 'อ่านรูปนี้ไม่ได้ ลองรูปอื่นนะ';
}

export function PhotoPicker({
  photos,
  cover,
  theme,
  onPhotos,
  onCover,
  toast,
  onBusy,
  max = 5,
}: {
  max?: number;
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
  const anniversary = theme.occasion === 'anniversary';
  function move(index: number, delta: number) {
    onPhotos((previous) => {
      const next = [...previous];
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      return next;
    });
  }
  async function add(files: File[]) {
    if (pending.current) return;
    const selected = files.slice(0, max - photos.length);
    if (!selected.length) {
      toast(`ใส่ได้สูงสุด ${max} รูปนะ`);
      return;
    }
    pending.current = true;
    setBusy(true);
    onBusy(true);
    try {
      const added: Photo[] = [];
      for (const file of selected) {
        try {
          // R2 accepts a maximum 1024px JPEG. Prepare 900px only once.
          added.push({ src: await readPhoto(file, R2_MEDIA_ENABLED ? 900 : 1080), cap: '' });
        } catch (error) {
          toast(imageReadError(error));
        }
      }
      onPhotos((previous) => [...previous, ...added].slice(0, max));
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
    } catch (error) {
      toast(imageReadError(error));
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
            <div className="photo-fields">
              <input
                type="text"
                maxLength={anniversary ? 40 : 30}
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
              {anniversary && (
                <input
                  type="date"
                  aria-label={`วันที่ของรูปที่ ${index + 1}`}
                  min="1900-01-01"
                  max={today()}
                  value={photo.date || ''}
                  onChange={(event) =>
                    onPhotos((previous) =>
                      previous.map((p, i) =>
                        i === index ? { ...p, date: event.target.value } : p,
                      ),
                    )
                  }
                />
              )}
            </div>
            {anniversary && (
              <div className="photo-order">
                <button
                  type="button"
                  aria-label={`ย้ายรูปที่ ${index + 1} ขึ้น`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`ย้ายรูปที่ ${index + 1} ลง`}
                  disabled={index === photos.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </button>
              </div>
            )}
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
          style={{ display: photos.length >= max ? 'none' : undefined }}
        >
          <b>+</b>
          {busy ? 'กำลังอ่านรูป…' : 'เพิ่มรูป'}{' '}
          <span className="en" style={{ opacity: 0.6, fontSize: 13 }}>
            (สูงสุด {max})
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
