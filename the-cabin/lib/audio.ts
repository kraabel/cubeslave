/**
 * Generative sound for the cabin. Everything is synthesized with the Web Audio
 * API, so there are no audio files to host. Must be started from a user
 * gesture (browser autoplay rules).
 */

type Nodes = {
  ctx: AudioContext;
  master: GainNode;
  verb: GainNode;
  droneFilter: BiquadFilterNode;
  tensionOsc: OscillatorNode;
  tensionGain: GainNode;
  windGain: GainNode;
  analyser: AnalyserNode;
  level: Uint8Array<ArrayBuffer>;
};

class CabinAudio {
  private n: Nodes | null = null;
  private muted = false;

  get started() {
    return this.n !== null;
  }

  start() {
    if (this.n) {
      void this.n.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();

    const master = ctx.createGain();
    master.gain.value = 0;
    master.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 4);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    master.connect(analyser);
    analyser.connect(ctx.destination);

    // Long, dark reverb from a decaying noise impulse.
    const convolver = ctx.createConvolver();
    convolver.buffer = impulse(ctx, 5.5, 2.6);
    const verb = ctx.createGain();
    verb.gain.value = 0.55;
    verb.connect(convolver);
    convolver.connect(master);

    // Wind: pink-ish noise through a wandering band-pass.
    const wind = ctx.createBufferSource();
    wind.buffer = noise(ctx, 6);
    wind.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = "bandpass";
    windFilter.frequency.value = 500;
    windFilter.Q.value = 0.8;
    const windLfo = ctx.createOscillator();
    windLfo.frequency.value = 0.07;
    const windLfoAmt = ctx.createGain();
    windLfoAmt.gain.value = 320;
    windLfo.connect(windLfoAmt).connect(windFilter.frequency);
    const windGain = ctx.createGain();
    windGain.gain.value = 0.16;
    wind.connect(windFilter).connect(windGain);
    windGain.connect(master);
    windGain.connect(verb);
    wind.start();
    windLfo.start();

    // Drone: low detuned fifths under a slow-breathing low-pass.
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = "lowpass";
    droneFilter.frequency.value = 260;
    droneFilter.Q.value = 3;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.11;
    droneFilter.connect(droneGain);
    droneGain.connect(master);
    droneGain.connect(verb);
    for (const [f, type, det] of [
      [55, "sawtooth", -6],
      [55, "sawtooth", 7],
      [82.41, "triangle", 0],
      [110, "sine", 3],
    ] as const) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.detune.value = det;
      o.connect(droneFilter);
      o.start();
    }
    const breath = ctx.createOscillator();
    breath.frequency.value = 0.05;
    const breathAmt = ctx.createGain();
    breathAmt.gain.value = 120;
    breath.connect(breathAmt).connect(droneFilter.frequency);
    breath.start();

    // Tension: a minor-second partial that swells as questions go on.
    const tensionOsc = ctx.createOscillator();
    tensionOsc.type = "sine";
    tensionOsc.frequency.value = 116.54;
    const tensionGain = ctx.createGain();
    tensionGain.gain.value = 0;
    tensionOsc.connect(tensionGain);
    tensionGain.connect(verb);
    tensionGain.connect(master);
    tensionOsc.start();

    this.n = { ctx, master, verb, droneFilter, tensionOsc, tensionGain, windGain, analyser, level: new Uint8Array(analyser.frequencyBinCount) };
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (!this.n) return;
    const { ctx, master } = this.n;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.linearRampToValueAtTime(m ? 0 : 0.9, ctx.currentTime + 0.6);
  }

  isMuted() {
    return this.muted;
  }

  /** 0 = calm, 1 = full dread. */
  setTension(t: number) {
    if (!this.n) return;
    const { ctx, droneFilter, tensionGain, windGain } = this.n;
    const now = ctx.currentTime;
    droneFilter.frequency.linearRampToValueAtTime(260 + t * 520, now + 2);
    tensionGain.gain.linearRampToValueAtTime(t * 0.05, now + 2);
    windGain.gain.linearRampToValueAtTime(0.16 + t * 0.12, now + 2);
  }

  /** A typewriter key strike. */
  tick() {
    if (!this.n || this.muted) return;
    const { ctx, master } = this.n;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noise(ctx, 0.04);
    const hp = ctx.createBiquadFilter();
    hp.type = "bandpass";
    hp.frequency.value = 2200 + Math.random() * 1400;
    hp.Q.value = 2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    src.connect(hp).connect(g).connect(master);
    src.start(t);
  }

  /** Soft glassy tone for hover. */
  hover() {
    this.bell(880 + Math.random() * 60, 0.025, 0.8);
  }

  /** Choice confirmed: a low bell into the reverb. */
  select() {
    this.bell(196, 0.12, 3.5);
    this.bell(293.66, 0.05, 2.5);
  }

  /** The verdict: sub drop, dull thud, long tail. */
  reveal(intensity: number) {
    if (!this.n || this.muted) return;
    const { ctx, master, verb } = this.n;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(28, t + 2.4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5 + intensity * 0.4, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3);
    o.connect(g);
    g.connect(master);
    g.connect(verb);
    o.start(t);
    o.stop(t + 3.1);

    const n = ctx.createBufferSource();
    n.buffer = noise(ctx, 1.2);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 400;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.3 * intensity + 0.05, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
    n.connect(lp).connect(ng);
    ng.connect(verb);
    ng.connect(master);
    n.start(t);
    this.bell(146.83, 0.08, 6);
  }

  /** 0..1 loudness, used to make the orb breathe with the sound. */
  level(): number {
    if (!this.n) return 0;
    const { analyser, level } = this.n;
    analyser.getByteFrequencyData(level);
    let sum = 0;
    for (let i = 0; i < 24; i++) sum += level[i];
    return sum / (24 * 255);
  }

  private bell(freq: number, gain: number, decay: number) {
    if (!this.n || this.muted) return;
    const { ctx, master, verb } = this.n;
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    g.connect(master);
    g.connect(verb);
    for (const [ratio, amp] of [
      [1, 1],
      [2.76, 0.35],
      [5.4, 0.12],
    ]) {
      const o = ctx.createOscillator();
      o.frequency.value = freq * ratio;
      const og = ctx.createGain();
      og.gain.value = amp;
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + decay);
    }
  }
}

function noise(ctx: AudioContext, seconds: number): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = buf.getChannelData(0);
  let b = 0;
  for (let i = 0; i < d.length; i++) {
    // Leaky integration tilts white noise toward pink for a softer wind.
    b = 0.97 * b + 0.03 * (Math.random() * 2 - 1);
    d[i] = b * 6 + (Math.random() * 2 - 1) * 0.15;
  }
  return buf;
}

function impulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

export const audio = new CabinAudio();

/** The oracle's spoken voice, via the browser's built-in speech synthesis. */
export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || audio.isMuted()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.82;
  u.pitch = 0.55;
  u.volume = 0.9;
  const voices = window.speechSynthesis.getVoices();
  const pick =
    voices.find((v) => /Daniel|Google UK English Male|Alex|Fred/i.test(v.name)) ?? voices.find((v) => v.lang.startsWith("en"));
  if (pick) u.voice = pick;
  window.speechSynthesis.speak(u);
}

export function hush() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}
