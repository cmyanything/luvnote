import { useRef, useState } from 'react';
import { readPhoto } from '../lib/images';

type Who = 'from' | 'to';

// Two round photo slots (sender / recipient) that float above each krathong in Loy Together.
export function FacePicker({
  from,
  to,
  fromName,
  toName,
  onChange,
  toast,
  onBusy,
}: {
  from: string | null;
  to: string | null;
  fromName: string;
  toName: string;
  onChange: (who: Who, src: string | null) => void;
  toast: (message: string) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState<Who | null>(null);
  const pending = useRef(false);
  async function pick(who: Who, file: File | undefined) {
    if (!file || pending.current) return;
    pending.current = true;
    setBusy(who);
    onBusy(true);
    try {
      onChange(who, await readPhoto(file, 700));
    } catch (error) {
      toast(
        error instanceof Error && error.message === 'image_too_large'
          ? 'รูปใหญ่เกิน 15 MB กรุณาเลือกรูปที่เล็กลง'
          : 'อ่านรูปนี้ไม่ได้ ลองรูปอื่นนะ',
      );
    } finally {
      pending.current = false;
      setBusy(null);
      onBusy(false);
    }
  }
  const slot = (who: Who, src: string | null, label: string, name: string) => (
    <div className="face" key={who}>
      <label className={`face-btn${src ? ' has' : ''}`} id={`face-${who}`}>
        {src ? <img src={src} alt={label} /> : <span aria-hidden="true">📷</span>}
        <input
          type="file"
          accept="image/*"
          hidden
          disabled={!!busy}
          aria-label={label}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            void pick(who, file);
          }}
        />
      </label>
      <span className="face-name">{name.trim() || label}</span>
      <span className="face-act">
        {busy === who ? 'กำลังอ่านรูป…' : src ? 'แตะรูปเพื่อเปลี่ยน' : 'แตะเพื่อเลือกรูป'}
      </span>
      {src && (
        <button
          type="button"
          className="x"
          aria-label={`ลบ${label}`}
          onClick={() => onChange(who, null)}
        >
          ✕
        </button>
      )}
    </div>
  );
  return (
    <>
      <div className="faces" id="faces">
        {slot('from', from, 'รูปผู้ส่ง', fromName)}
        {slot('to', to, 'รูปผู้รับ', toName)}
      </div>
      <p className="help">
        รูปจะเป็นวงกลมลอยอยู่บนกระทงของแต่ละคน · เลือกรูปหน้าชัด ๆ จะสวยที่สุด · ไม่ใส่ก็ได้ จะมีแค่ป้ายชื่อ
      </p>
    </>
  );
}
