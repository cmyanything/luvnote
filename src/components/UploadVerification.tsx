import { useEffect, useRef } from 'react';
import { TURNSTILE_SITE_KEY } from '../lib/media-v3';

interface TurnstileAPI {
  render: (element: HTMLElement, options: {
    sitekey: string;
    action: string;
    appearance: 'interaction-only';
    callback: (token: string) => void;
    'expired-callback': () => void;
    'error-callback': () => void;
  }) => string;
  remove: (id: string) => void;
}

declare global {
  interface Window { turnstile?: TurnstileAPI }
}

let loading: Promise<TurnstileAPI> | null = null;
function loadTurnstile(): Promise<TurnstileAPI> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (loading) return loading;
  loading = new Promise<TurnstileAPI>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => {
      if (window.turnstile) resolve(window.turnstile);
      else reject(new Error('turnstile_unavailable'));
    };
    script.onerror = () => reject(new Error('turnstile_load_failed'));
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    loading = null;
    throw error;
  });
  return loading;
}

export function UploadVerification({ onToken }: { onToken: (token: string | null) => void }) {
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true;
    let widget: string | null = null;
    const container = element.current;
    onToken(null);
    void loadTurnstile().then((api) => {
      if (!active || !container || !TURNSTILE_SITE_KEY) return;
      widget = api.render(container, {
        sitekey: TURNSTILE_SITE_KEY,
        action: 'luvnote_media_upload',
        appearance: 'interaction-only',
        callback: (token) => { if (active) onToken(token); },
        'expired-callback': () => { if (active) onToken(null); },
        'error-callback': () => { if (active) onToken(null); },
      });
    }).catch(() => { if (active) onToken(null); });
    return () => {
      active = false;
      if (widget) window.turnstile?.remove(widget);
    };
  }, [onToken]);
  return <div ref={element} aria-label="ยืนยันการอัปโหลดรูปภาพ" style={{ display:'flex', justifyContent:'center', minHeight:65 }} />;
}
