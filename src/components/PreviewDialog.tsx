import { useLayoutEffect, useRef } from 'react';
import type { CardData, ThemeConfig } from '../types';
import { useModal } from '../hooks/useModal';

export function PreviewDialog({
  theme,
  card,
  onClose,
}: {
  theme: ThemeConfig;
  card: Partial<CardData>;
  onClose: () => void;
}) {
  const dialog = useModal(onClose);
  const frame = useRef<HTMLIFrameElement>(null);
  const sent = useRef(false);
  function send() {
    if (sent.current || !frame.current?.contentWindow) return;
    sent.current = true;
    frame.current.contentWindow.postMessage(
      { type: 'luvnote-card', card },
      window.location.origin,
    );
  }
  useLayoutEffect(() => {
    function ready(event: MessageEvent) {
      if (
        event.origin === window.location.origin &&
        event.source === frame.current?.contentWindow &&
        event.data?.type === 'luvnote-ready'
      )
        send();
    }
    window.addEventListener('message', ready);
    return () => window.removeEventListener('message', ready);
  }, [card]);
  return (
    <div
      className="ov show"
      id="ov"
      role="dialog"
      aria-modal="true"
      aria-label="พรีวิวการ์ด"
      ref={dialog}
    >
      <div className="pv">
        <iframe
          ref={frame}
          id="frame"
          src={`card.html?v=${theme.version}#preview`}
          title="พรีวิวการ์ดของคุณ"
          allow="autoplay"
          onLoad={send}
        />
      </div>
      <button type="button" className="close" id="closePv" onClick={onClose}>
        ✕ ปิดตัวอย่าง
      </button>
    </div>
  );
}
