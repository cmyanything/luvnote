/* Procedural soundscape for The River Remembers. No audio files: everything is synthesised with Web Audio,
   so there is nothing to license or download. Starts only after a user gesture; mute is respected instantly. */

const PENTA = [0, 2, 4, 7, 9]; // major pentatonic: any touch sounds consonant
const hz = (base: number, step: number) => base * Math.pow(2, step / 12);

export type RiverAudio = ReturnType<typeof createRiverAudio>;

export function createRiverAudio() {
  let ctx: AudioContext | null = null, analyser: AnalyserNode | null = null, master: GainNode, wet: GainNode, bed: GainNode, flameGain: GainNode, water: GainNode;
  let muted = false, droneOsc: OscillatorNode[] = [], flameOn = false;

  const ensure = () => {
    if (ctx) return ctx;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.55;
    const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -14; lim.knee.value = 6; lim.ratio.value = 20; lim.attack.value = 0.003; lim.release.value = 0.2; master.connect(lim); lim.connect(ctx.destination); analyser = ctx.createAnalyser(); analyser.fftSize = 1024; lim.connect(analyser);
    // simple feedback-delay "cave" reverb
    const d1 = ctx.createDelay(1), d2 = ctx.createDelay(1), fb = ctx.createGain(), lp = ctx.createBiquadFilter();
    d1.delayTime.value = 0.23; d2.delayTime.value = 0.37; fb.gain.value = 0.22; lp.type = 'lowpass'; lp.frequency.value = 2400;
    wet = ctx.createGain(); wet.gain.value = 0.55; wet.connect(d1); wet.connect(d2); d1.connect(lp); d2.connect(lp); lp.connect(fb); const dc = ctx.createBiquadFilter(); dc.type = 'highpass'; dc.frequency.value = 120; fb.connect(dc); dc.connect(d1); lp.connect(master);
    bed = ctx.createGain(); bed.gain.value = 0; bed.connect(master);
    // water: looped brown-ish noise through a moving low-pass
    const len = ctx.sampleRate * 3, buf = ctx.createBuffer(1, len, ctx.sampleRate), ch = buf.getChannelData(0); let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; ch[i] = last * 3.2; }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const wf = ctx.createBiquadFilter(); wf.type = 'lowpass'; wf.frequency.value = 520; wf.Q.value = 0.7;
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.12; lg.gain.value = 220; lfo.connect(lg); lg.connect(wf.frequency); lfo.start();
    water = ctx.createGain(); water.gain.value = 0.0; src.connect(wf); wf.connect(water); water.connect(master); src.start();
    // drone pad: two detuned sines + fifth
    [55, 55.25, 82.4].forEach((f, i) => { const o = ctx!.createOscillator(), g = ctx!.createGain(); o.type = i === 2 ? 'triangle' : 'sine'; o.frequency.value = f; g.gain.value = i === 2 ? 0.05 : 0.09; o.connect(g); g.connect(bed); o.start(); droneOsc.push(o); });
    // flame: highpassed noise crackle, gated by flameGain
    const nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() < 0.015 ? (Math.random() * 2 - 1) : (Math.random() * 2 - 1) * 0.04;
    const ns = ctx.createBufferSource(); ns.buffer = nb; ns.loop = true; const hf = ctx.createBiquadFilter(); hf.type = 'highpass'; hf.frequency.value = 2500;
    flameGain = ctx.createGain(); flameGain.gain.value = 0; ns.connect(hf); hf.connect(flameGain); flameGain.connect(master); ns.start();
    return ctx;
  };

  const tone = (freq: number, dur: number, vol: number, type: OscillatorType = 'sine', send = 0.7, delay = 0, glideTo?: number) => {
    const c = ctx; if (!c || muted) return; const t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t); if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); const s = c.createGain(); s.gain.value = send; g.connect(s); s.connect(wet); o.start(t); o.stop(t + dur + 0.05);
  };
  const bell = (step: number, vol = 0.16, delay = 0, base = 392) => { const f = hz(base, step); tone(f, 2.2, vol, 'sine', 0.9, delay); tone(f * 2.756, 1.1, vol * 0.25, 'sine', 0.9, delay); tone(f * 5.4, 0.5, vol * 0.08, 'sine', 0.9, delay); };
  const noiseBurst = (dur: number, f0: number, f1: number, vol: number, delay = 0) => {
    const c = ctx; if (!c || muted) return; const t = c.currentTime + delay, n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1);
    const s = c.createBufferSource(); s.buffer = b; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(master); g.connect(wet); s.start(t);
  };

  return {
    /** call from a click handler */
    start() { const c = ensure(); if (!c) return; if (c.state === 'suspended') void c.resume(); bed.gain.linearRampToValueAtTime(0.5, c.currentTime + 4); water.gain.linearRampToValueAtTime(0.35, c.currentTime + 3); },
    setMuted(m: boolean) { muted = m; if (ctx) master.gain.setTargetAtTime(m ? 0 : 0.55, ctx.currentTime, 0.05); },
    isMuted: () => muted,
    ripple(i: number, yNorm = 0.5) { const step = PENTA[i % 5] + (i > 4 ? 12 : 0) + (yNorm < 0.3 ? 12 : 0); bell(step, 0.15); noiseBurst(0.35, 900, 300, 0.05); },
    petal(i: number) { bell(PENTA[(i * 2) % 5] + 12, 0.12, 0, 523); tone(hz(262, PENTA[i % 5]), 0.5, 0.05, 'triangle', 0.5); },
    petalPick() { tone(660, 0.12, 0.05, 'sine', 0.4); },
    krathongDone() { [0, 4, 7, 12].forEach((s, i) => bell(s, 0.13, i * 0.14, 330)); },
    ignite(on: boolean) { if (!ctx) return; flameOn = on; flameGain.gain.setTargetAtTime(on ? 0.5 : 0, ctx.currentTime, on ? 1.2 : 0.4); if (on) noiseBurst(0.5, 700, 3500, 0.12); },
    lit() { bell(12, 0.12, 0, 440); bell(19, 0.08, 0.2, 440); noiseBurst(0.7, 400, 5000, 0.14); },
    stroke(speed: number) { if (!ctx) return; tone(hz(330, PENTA[Math.floor(Math.random() * 5)]), 0.9, 0.05 + Math.min(speed, 1) * 0.04, 'sine', 0.9); },
    echo() { [0, 2, 4, 7, 9, 12, 16].forEach((s, i) => bell(s + 12, 0.1, i * 0.12, 330)); noiseBurst(2.2, 300, 3000, 0.07); },
    swap(k: number) { if (!ctx) return; water.gain.setTargetAtTime(0.35 + k * 0.4, ctx.currentTime, 0.1); },
    swapHit() { noiseBurst(1.8, 200, 4200, 0.2); tone(110, 2.5, 0.12, 'sine', 0.8, 0, 440); [0, 7, 12, 19].forEach((s, i) => bell(s, 0.1, 0.8 + i * 0.18, 247)); },
    release() { noiseBurst(1.2, 500, 2500, 0.08); [0, 5, 9, 14].forEach((s, i) => bell(s, 0.12, i * 0.25, 392)); },
    finale() { [0, 4, 7, 11, 14, 19, 23, 26].forEach((s, i) => bell(s, 0.12, i * 0.3, 262)); },
    actTransition(n: number) { if (!ctx) return; tone(hz(98, [0, 2, 4, 5, 7, 9, 12][n] || 0), 3, 0.07, 'sine', 0.8); if (n === 6) this.finale(); else noiseBurst(1.2, 200, 1800, 0.05); },
    stop() { if (!ctx) return; const c = ctx; bed.gain.setTargetAtTime(0, c.currentTime, 0.3); water.gain.setTargetAtTime(0, c.currentTime, 0.3); flameGain.gain.setTargetAtTime(0, c.currentTime, 0.2); setTimeout(() => { void c.close(); }, 1000); ctx = null; droneOsc = []; flameOn = false; },
    isFlame: () => flameOn,
    /** RMS of the mixed output (0..1) and context state, used by the automated check */
    level() { if (!analyser) return -1; const a = new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(a); let t = 0; for (const v of a) t += v * v; return Math.sqrt(t / a.length); },
    state: () => ctx?.state ?? 'none',
  };
}
