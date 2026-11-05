import { useEffect, useRef, useState } from 'react';
import { seconds, youtubeId, youtubeStart } from '../lib/card';

interface Player {
  destroy(): void;
  cueVideoById?(options: { videoId: string; startSeconds: number }): void;
}
interface YouTubeAPI {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      playerVars: { playsinline: number; rel: number; start: number };
      events: { onReady(): void; onError(event: { data: number }): void };
    },
  ) => Player;
}
declare global {
  interface Window {
    YT?: YouTubeAPI;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let api: Promise<YouTubeAPI | undefined> | undefined;
function loadYouTube() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (api) return api;
  api = new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout>;
    function finish() {
      clearTimeout(timer);
      resolve(window.YT);
    }
    window.onYouTubeIframeAPIReady = finish;
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = finish;
    timer = setTimeout(finish, 7000);
    document.head.appendChild(script);
  });
  return api;
}

export function MusicPicker({
  value,
  start,
  help,
  onValue,
  onStart,
  onAllowed,
}: {
  value: string;
  start: string;
  help: string;
  onValue: (value: string) => void;
  onStart: (value: string) => void;
  onAllowed: (allowed: boolean) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const startValue = useRef(start);
  startValue.current = start;
  const id = youtubeId(value);
  const playerRef = useRef<Player | undefined>(undefined);
  const ready = useRef(false);
  const [status, setStatus] = useState<{ kind: string; text: string }>({
    kind: '',
    text: '',
  });
  useEffect(() => {
    let active = true;
    let player: Player | undefined;
    if (!id) {
      onAllowed(false);
      return;
    }
    onAllowed(true);
    setStatus({ kind: '', text: 'กำลังตรวจเพลง…' });
    const timer = setTimeout(() => {
      void loadYouTube().then((YT) => {
        if (!active || !host.current) return;
        if (!YT?.Player) {
          setStatus({
            kind: 'ok',
            text: '✓ ลิงก์ถูกต้อง เพลงจะเล่นเมื่อเปิดการ์ด',
          });
          return;
        }
        const target = document.createElement('div');
        host.current.appendChild(target);
        ready.current = false;
        player = new YT.Player(target, {
          videoId: id,
          playerVars: {
            playsinline: 1,
            rel: 0,
            start: seconds(startValue.current),
          },
          events: {
            onReady() {
              playerRef.current = player;
              ready.current = true;
              if (active)
                setStatus({
                  kind: 'ok',
                  text: '✓ ใช้เพลงนี้ได้ กดเล่นในกรอบเพื่อลองฟังได้',
                });
            },
            onError(event) {
              if (!active) return;
              onAllowed(false);
              setStatus({
                kind: 'bad',
                text: [101, 150, 153].includes(event.data)
                  ? 'คลิปนี้เจ้าของไม่ให้เล่นบนเว็บอื่น ลองค้นเพลงเดียวกันแบบ Lyrics หรือ Audio นะ'
                  : 'เปิดคลิปนี้ไม่ได้ ลองลิงก์อื่นนะ',
              });
            },
          },
        });
      });
    }, 350);
    const element = host.current;
    return () => {
      active = false;
      clearTimeout(timer);
      player?.destroy();
      element?.replaceChildren();
    };
  }, [id, onAllowed]);
  useEffect(() => {
    if (!id || !ready.current) return;
    const timer = setTimeout(() => {
      try {
        playerRef.current?.cueVideoById?.({
          videoId: id,
          startSeconds: seconds(start),
        });
      } catch {
        /* player not ready */
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [id, start]);
  const shown = !value.trim()
    ? { kind: '', text: 'คัดลอกลิงก์จากแอป YouTube (กดแชร์ › คัดลอกลิงก์)' }
    : !id
      ? {
          kind: 'bad',
          text: 'ลิงก์นี้ไม่ใช่ลิงก์ YouTube ลองคัดลอกใหม่อีกครั้ง',
        }
      : status;
  return (
    <>
      <input
        type="url"
        id="yt"
        aria-label="ลิงก์เพลงจาก YouTube"
        placeholder="วางลิงก์เพลงจาก YouTube"
        value={value}
        onChange={(event) => {
          onValue(event.target.value);
          if (!start) {
            const time = youtubeStart(event.target.value);
            if (time) onStart(time);
          }
        }}
      />
      <div className={`yt ${shown.kind}`} id="ytS" role="status">
        <div className="disc" />
        <span id="ytT">{shown.text}</span>
      </div>
      <div className={`ytbox${id ? ' show' : ''}`} id="ytBox">
        <div ref={host} id="ytPrev" />
      </div>
      <div className="startrow">
        <label htmlFor="ytStart">
          ให้เพลงเริ่มที่ (นาที:วินาที)
          <br />
          <span className="help" style={{ margin: 0 }}>
            เช่น ข้ามอินโทรไปเริ่มท่อนฮุคเลย
          </span>
        </label>
        <input
          type="text"
          id="ytStart"
          inputMode="numeric"
          maxLength={5}
          placeholder="0:00"
          value={start}
          onChange={(event) =>
            onStart(event.target.value.replace(/[^\d:]/g, ''))
          }
        />
      </div>
      <p className="help">{help}</p>
    </>
  );
}
