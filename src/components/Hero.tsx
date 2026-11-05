import { useLayoutEffect, useRef } from 'react';
import type { ThemeConfig } from '../types';

export function Hero({
  theme,
  onDemo,
}: {
  theme: ThemeConfig;
  onDemo: () => void;
}) {
  const screen = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  useLayoutEffect(() => {
    const element = screen.current;
    if (!element) return;
    function fit() {
      if (!element || !frame.current || !element.clientWidth) return;
      const scale = element.clientWidth / 390;
      Object.assign(frame.current.style, {
        width: '390px',
        height: `${element.clientHeight / scale}px`,
        transform: `scale(${scale})`,
      });
    }
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <>
      <div className="hero">
        <div
          className="phone"
          id="heroPhone"
          role="button"
          tabIndex={0}
          aria-label="ดูการ์ดตัวอย่าง"
          onClick={onDemo}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onDemo();
            }
          }}
        >
          <div className="screen" ref={screen}>
            <iframe
              ref={frame}
              id="heroDemo"
              src={`card.html?v=${theme.version}#demo`}
              title="ตัวอย่างการ์ด"
              tabIndex={-1}
              scrolling="no"
            />
          </div>
        </div>
        <div className="hero-t">
          <span className="chip">{theme.category}</span>
          <h1>{theme.name}</h1>
          <p>{theme.description}</p>
          {theme.couple ? (
            <div className="price">
              <span className="pp">
                <b>ฟรี</b>
              </span>
              <small>พรีเมียม {theme.premiumPrice} ฿</small>
            </div>
          ) : (
            <div className="price">
              <span className="pp">
                <b>{theme.price}</b>
                <i>฿</i>
              </span>
              <small>ต่อ 1 ใบ</small>
            </div>
          )}
        </div>
      </div>
      <div className="feats">
        {theme.features.map((feature) => (
          <span key={feature}>{feature}</span>
        ))}
      </div>
      <button type="button" className="demo-btn" id="demoBtn" onClick={onDemo}>
        ▶ ดูการ์ดตัวอย่างก่อน
      </button>
    </>
  );
}
