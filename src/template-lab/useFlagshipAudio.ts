import { useEffect, useRef, useState } from 'react';

/** Opt-in, synthesized bell tones. No autoplay, music file, or network access. */
export function useFlagshipAudio() {
  const [enabled, setEnabled] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const context = useRef<AudioContext | null>(null);
  const master = useRef<GainNode | null>(null);
  const enabledRef = useRef(false);
  useEffect(() => {
    const onVisibility = () => {
      const audio = context.current;
      if (!audio || audio.state === 'closed') return;
      if (document.hidden) void audio.suspend().catch(() => {});
      else if (enabledRef.current) void audio.resume().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { document.removeEventListener('visibilitychange', onVisibility); if (context.current && context.current.state !== 'closed') void context.current.close().catch(() => {}); };
  }, []);
  async function toggle() {
    if (enabledRef.current) {
      enabledRef.current = false; setEnabled(false);
      if (master.current && context.current) master.current.gain.setValueAtTime(0, context.current.currentTime);
      if (context.current && context.current.state !== 'closed') await context.current.suspend().catch(() => {});
      return;
    }
    try {
      const AudioConstructor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioConstructor) throw new Error('audio_unavailable');
      if (!context.current || context.current.state === 'closed') {
        context.current = new AudioConstructor(); master.current = context.current.createGain(); master.current.gain.value = .16; master.current.connect(context.current.destination);
      }
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try { await Promise.race([context.current.resume(), new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('audio_timeout')), 1600); })]); } finally { if (timeout) clearTimeout(timeout); }
      if (master.current) master.current.gain.setValueAtTime(.16, context.current.currentTime);
      enabledRef.current = true; setEnabled(true); setUnavailable(false);
      play('light');
    } catch { enabledRef.current = false; setEnabled(false); setUnavailable(true); if (context.current && context.current.state !== 'closed') void context.current.close().catch(() => {}); context.current = null; master.current = null; }
  }
  function play(kind: 'light' | 'turn' | 'memory' | 'finale') {
    const audio = context.current, output = master.current;
    if (!enabledRef.current || !audio || !output || audio.state !== 'running') return;
    const notes = kind === 'finale' ? [392, 493.88, 587.33, 783.99] : kind === 'light' ? [392, 587.33] : kind === 'memory' ? [493.88, 659.25] : [523.25];
    notes.forEach((freq, i) => {
      const time = audio.currentTime + i * .13;
      const oscillator = audio.createOscillator(), gain = audio.createGain();
      oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(.0001, time); gain.gain.exponentialRampToValueAtTime(.16, time + .025); gain.gain.exponentialRampToValueAtTime(.0001, time + .8);
      oscillator.connect(gain); gain.connect(output); oscillator.start(time); oscillator.stop(time + .82);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  }
  return { enabled, unavailable, toggle, play };
}
