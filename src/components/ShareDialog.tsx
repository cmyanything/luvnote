import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import type { CreatedCard, ThemeConfig } from '../types';
import { cardLink } from '../lib/card';
import { useModal } from '../hooks/useModal';

export function ShareDialog({
  theme,
  result,
  recipient,
  onClose,
  toast,
}: {
  theme: ThemeConfig;
  result: CreatedCard;
  recipient: string;
  onClose: () => void;
  toast: (message: string) => void;
}) {
  const dialog = useModal(onClose);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [qrError, setQrError] = useState(false);
  const url = cardLink(theme, result.id);
  const message = `${theme.shareMessage} ${recipient} 💗 แตะเปิดเลย ${url}`;
  useEffect(() => {
    let active = true;
    if (canvas.current)
      void QRCode.toCanvas(canvas.current, url, {
        width: 260,
        margin: 2,
        color: { dark: '#800020', light: '#ffffff' },
      }).catch(() => {
        if (active) setQrError(true);
      });
    return () => {
      active = false;
    };
  }, [url]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast('คัดลอกลิงก์แล้ว ♡');
    } catch {
      const input = document.createElement('textarea');
      input.value = url;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      dialog.current?.appendChild(input);
      input.select();
      try {
        toast(
          document.execCommand('copy')
            ? 'คัดลอกลิงก์แล้ว ♡'
            : 'กดค้างที่ลิงก์เพื่อคัดลอกนะ',
        );
      } catch {
        toast('กดค้างที่ลิงก์เพื่อคัดลอกนะ');
      } finally {
        input.remove();
      }
    }
  }
  return (
    <div
      className="sheet show"
      id="sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-title"
      ref={dialog}
    >
      <div className="grab" />
      <div className="okheart">{theme.successIcon}</div>
      <h3 id="share-title">การ์ดของคุณพร้อมแล้ว!</h3>
      <p className="sub">
        ส่งลิงก์นี้ให้ <span id="sTo">{recipient}</span> ได้เลย
      </p>
      <div className="link">
        <span id="lnk">{url.replace(/^https?:\/\//, '')}</span>
        <button type="button" id="copy" onClick={() => void copy()}>
          คัดลอก
        </button>
      </div>
      <div className="share">
        <a
          className="line"
          id="lineBtn"
          href={`https://line.me/R/msg/text/?${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          ส่งทาง LINE
        </a>
        <a
          className="open"
          id="openBtn"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          เปิดดูการ์ด
        </a>
      </div>
      {!qrError && (
        <div id="qr">
          <canvas
            ref={canvas}
            role="img"
            aria-label="QR Code สำหรับเปิดการ์ด"
          />
        </div>
      )}
      <p className="expn" id="expn">
        ลิงก์เปิดได้ถึง{' '}
        {new Date(result.expires).toLocaleDateString('th-TH', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </p>
      <button type="button" className="again" id="again" onClick={onClose}>
        กลับไปแก้ไข
      </button>
    </div>
  );
}
