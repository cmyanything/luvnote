import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import type { CreatedCard, ThemeConfig } from '../types';
import { cardLink, editLink } from '../lib/card';
import { useModal } from '../hooks/useModal';

export function ShareDialog({
  theme,
  result,
  recipient,
  edited = false,
  premium = false,
  onClose,
  toast,
}: {
  premium?: boolean;
  theme: ThemeConfig;
  result: CreatedCard;
  recipient: string;
  edited?: boolean;
  onClose: () => void;
  toast: (message: string) => void;
}) {
  const dialog = useModal(onClose);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [qrError, setQrError] = useState(false);
  const url = cardLink(theme, result.id);
  const message = `${theme.shareMessage} ${recipient} 💗 แตะเปิดเลย ${url}`;
  const ownerLink = result.editKey ? editLink(theme, result.id, result.editKey) : '';
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
  async function copy(text = url) {
    try {
      await navigator.clipboard.writeText(text);
      toast('คัดลอกลิงก์แล้ว ♡');
    } catch {
      const input = document.createElement('textarea');
      input.value = text;
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
      <h3 id="share-title">{edited ? 'บันทึกการแก้ไขแล้ว!' : 'การ์ดของคุณพร้อมแล้ว!'}</h3>
      <p className="sub">
        {edited ? (
          <>ลิงก์เดิมแสดงข้อมูลใหม่แล้ว ถ้าเคยส่งให้ <span id="sTo">{recipient}</span> ไม่ต้องส่งใหม่</>
        ) : (
          <>ส่งลิงก์นี้ให้ <span id="sTo">{recipient}</span> ได้เลย</>
        )}
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
      {premium && (
        <div className="paybox" id="payBox">
          <p className="owner-title">✨ ปลดล็อกพรีเมียม {theme.premiumPrice} บาท</p>
          <p className="owner-note">
            ตอนนี้ลิงก์เปิดเป็นแบบฟรีไปก่อน · โอน {theme.premiumPrice} บาท แล้วส่ง <b>สลิป + ลิงก์การ์ดนี้</b> ทาง LINE
            ร้านจะปลดล็อกโคมลอยรูปความทรงจำ เพลงของคุณ และเอาโฆษณาท้ายการ์ดออกบนลิงก์เดิม
          </p>
          <div className="share">
            <button type="button" className="open" id="copyForShop" onClick={() => void copy(`ขอปลดล็อกพรีเมียม ${theme.name} ${url}`)}>
              คัดลอกข้อความถึงร้าน
            </button>
            <a className="line" id="payLine" href="https://line.me/ti/p/~yingchonstom39" target="_blank" rel="noopener noreferrer">
              ทัก LINE ร้าน
            </a>
          </div>
        </div>
      )}
      {ownerLink && (
        <div className="owner" id="ownerBox">
          <p className="owner-title">🔒 ลิงก์แก้ไขการ์ด (สำหรับคุณคนเดียว)</p>
          <div className="link">
            <span id="editLnk">{ownerLink.replace(/^https?:\/\//, '')}</span>
            <button type="button" id="copyEdit" onClick={() => void copy(ownerLink)}>
              คัดลอก
            </button>
          </div>
          <p className="owner-note">
            เก็บลิงก์นี้ไว้เพื่อกลับมาเปลี่ยนรูปหรือข้อความได้ตลอดอายุการ์ด อย่าส่งให้คนอื่นนะ
          </p>
        </div>
      )}
      <p className="renew" id="renew">
        อยากเก็บการ์ดไว้นานกว่านี้? ต่ออายุปีละ 29 บาท{' '}
        <a href="https://line.me/ti/p/~yingchonstom39" target="_blank" rel="noopener noreferrer">
          ทัก LINE
        </a>
      </p>
      <button type="button" className="again" id="again" onClick={onClose}>
        {result.editKey ? 'กลับไปแก้ไขการ์ดใบนี้' : 'กลับไปแก้ไข'}
      </button>
      {result.editKey && (
        <a className="again" id="newCard" href="./">
          สร้างการ์ดใบใหม่
        </a>
      )}
    </div>
  );
}
