/**
 * The Our Story film's music box, synthesized with WebAudio (no audio files).
 * The AudioContext is created inside the tap that opens the film so mobile
 * browsers allow sound; the melody starts when the film itself starts.
 */
export type MusicBox = {
  start: () => void;
  pause: () => void;
  resume: () => void;
  fadeOut: () => void;
  setMuted: (muted: boolean) => void;
  close: () => void;
};

const SILENT: MusicBox = {
  start() {},
  pause() {},
  resume() {},
  fadeOut() {},
  setMuted() {},
  close() {},
};

export function createMusicBox(): MusicBox {
  let ctx: AudioContext;
  try {
    ctx = new AudioContext();
    void ctx.resume();
  } catch {
    return SILENT;
  }
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  const verb = ctx.createConvolver();
  const length = Math.floor(ctx.sampleRate * 2.6);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++)
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
  }
  verb.buffer = impulse;
  const wet = ctx.createGain();
  wet.gain.value = 0.35;
  verb.connect(wet);
  wet.connect(master);

  const eighth = 60 / 76 / 2;
  const notes = [349.23, 392, 440, 466.16, 523.25, 587.33, 659.25, 698.46];
  const chords = [
    [0, 2, 4, 7],
    [4, 6, 1, 4],
    [5, 0, 2, 5],
    [3, 5, 0, 3],
  ];
  const pattern = [0, 1, 2, 3, 2, 1, 2, 3];
  let timer: ReturnType<typeof setInterval> | undefined;
  let next = 0;
  let step = 0;
  let muted = false;
  const level = 0.6;

  function note(
    frequency: number,
    at: number,
    velocity: number,
    duration: number,
  ) {
    const tone = ctx.createOscillator();
    const overtone = ctx.createOscillator();
    const gain = ctx.createGain();
    tone.type = 'triangle';
    tone.frequency.value = frequency;
    overtone.type = 'sine';
    overtone.frequency.value = frequency * 2.01;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(velocity, at + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0008, at + duration);
    tone.connect(gain);
    overtone.connect(gain);
    gain.connect(master);
    gain.connect(verb);
    tone.start(at);
    overtone.start(at);
    tone.stop(at + duration + 0.05);
    overtone.stop(at + duration + 0.05);
    tone.onended = () => gain.disconnect();
  }

  function schedule() {
    while (next < ctx.currentTime + 0.25) {
      const chord = chords[Math.floor(step / 8) % 4];
      const position = step % 8;
      const degree = chord[pattern[position]];
      const octave = position >= 4 && position % 2 ? 2 : 1;
      note(notes[degree % 8] * octave, next, position === 0 ? 0.16 : 0.1, 1.8);
      if (position === 0) note(notes[chord[0] % 8] / 2, next, 0.09, 3.2);
      if (step % 32 === 28)
        note(notes[(chord[2] + 2) % 8] * 2, next + eighth / 2, 0.06, 1.4);
      next += eighth;
      step++;
    }
  }

  return {
    start() {
      if (ctx.state === 'closed') return;
      void ctx.resume();
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(0.0001, now);
      if (!muted) master.gain.exponentialRampToValueAtTime(level, now + 1.5);
      step = 0;
      next = now + 0.1;
      clearInterval(timer);
      timer = setInterval(schedule, 60);
    },
    pause() {
      if (ctx.state === 'running') void ctx.suspend();
    },
    resume() {
      if (ctx.state === 'suspended') void ctx.resume();
    },
    fadeOut() {
      if (ctx.state === 'closed') return;
      master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.9);
      const stop = timer;
      setTimeout(() => {
        if (timer === stop) clearInterval(timer);
      }, 4500);
    },
    setMuted(value) {
      muted = value;
      if (ctx.state === 'closed') return;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(muted ? 0 : level, ctx.currentTime, 0.1);
    },
    close() {
      clearInterval(timer);
      void ctx.close().catch(() => {});
    },
  };
}
