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
  voiceBus: GainNode;
};

class CabinAudio {
  private n: Nodes | null = null;
  // Two independent channels, each 0..1. Atmosphere is every synthesized
  // sound (it drives the master bus); voice is the spoken narration.
  private atmos = 0.8;
  private voice = 0.8;
  // One switch over both channels, for the header's sound button.
  private allMuted = false;

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
    master.gain.linearRampToValueAtTime(this.allMuted ? 0 : busGain(this.atmos), ctx.currentTime + 4);
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

    // The guide's voice: its own bus so the voice slider and the atmosphere
    // slider stay independent. It still feeds the analyser, so the waveform
    // and the paper swarm's light move when the guide speaks.
    const voiceBus = ctx.createGain();
    voiceBus.gain.value = this.voiceGain();
    voiceBus.connect(analyser);
    const voiceSend = ctx.createGain();
    voiceSend.gain.value = 0.12;
    voiceBus.connect(voiceSend);
    voiceSend.connect(verb);

    this.n = { ctx, master, verb, droneFilter, tensionOsc, tensionGain, windGain, analyser, level: new Uint8Array(analyser.frequencyBinCount), voiceBus };
  }

  setAtmosphere(v: number) {
    this.atmos = clamp01(v);
    if (!this.n) return;
    const { ctx, master } = this.n;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(this.allMuted ? 0 : busGain(this.atmos), ctx.currentTime + 0.25);
  }

  setAllMuted(m: boolean) {
    this.allMuted = m;
    if (m) hush();
    this.setAtmosphere(this.atmos);
    this.applyVoiceGain();
  }

  isAllMuted() {
    return this.allMuted;
  }

  setVoice(v: number) {
    this.voice = clamp01(v);
    if (this.voice === 0) hush();
    this.applyVoiceGain();
  }

  private voiceGain() {
    return this.allMuted ? 0 : Math.min(1.2, this.voice * this.voice * 1.3);
  }

  private applyVoiceGain() {
    if (!this.n) return;
    const { ctx, voiceBus } = this.n;
    voiceBus.gain.setTargetAtTime(this.voiceGain(), ctx.currentTime, 0.08);
  }

  private clip: HTMLAudioElement | null = null;
  private sources = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();

  /**
   * Play one of the guide's recorded lines. Resolves when it finishes, is
   * interrupted, or fails to load (a missing file never blocks the flow).
   */
  playVoice(url: string): Promise<void> {
    this.stopVoice();
    if (this.voice === 0 || this.allMuted) return Promise.resolve();
    const el = new Audio(url);
    el.preload = "auto";
    this.clip = el;
    if (this.n) {
      let src = this.sources.get(el);
      if (!src) {
        src = this.n.ctx.createMediaElementSource(el);
        this.sources.set(el, src);
      }
      src.connect(this.n.voiceBus);
    } else {
      el.volume = Math.min(1, this.voice);
    }
    return new Promise((resolve) => {
      const done = () => {
        el.removeEventListener("ended", done);
        el.removeEventListener("error", done);
        el.removeEventListener("pause", done);
        if (this.clip === el) this.clip = null;
        resolve();
      };
      el.addEventListener("ended", done);
      el.addEventListener("error", done);
      el.addEventListener("pause", done);
      el.play().catch(done);
    });
  }

  /** Play a blob of speech (from /api/speak) through the same voice bus. */
  playVoiceBlob(blob: Blob): Promise<void> {
    const url = URL.createObjectURL(blob);
    return this.playVoice(url).finally(() => URL.revokeObjectURL(url));
  }

  stopVoice() {
    if (this.clip) {
      this.clip.pause();
      this.clip = null;
    }
  }

  atmosphere() {
    return this.atmos;
  }

  voiceLevel() {
    return this.allMuted ? 0 : this.voice;
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
    if (!this.n || this.atmos === 0) return;
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

  /** Pages in flight: an airy swell with paper crackle on top. */
  rustle(intensity: number) {
    if (!this.n || this.atmos === 0) return;
    const { ctx, master, verb } = this.n;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noise(ctx, 2.6);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 0.7;
    bp.frequency.setValueAtTime(700, t);
    bp.frequency.linearRampToValueAtTime(2400, t + 1.1);
    bp.frequency.linearRampToValueAtTime(900, t + 2.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22 * intensity, t + 0.9);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
    src.connect(bp).connect(g);
    g.connect(master);
    g.connect(verb);
    src.start(t);

    // Crackle: short bright ticks scattered through the swell.
    const crackles = Math.round(18 * intensity);
    for (let i = 0; i < crackles; i++) {
      const at = t + 0.2 + Math.random() * 2;
      const c = ctx.createBufferSource();
      c.buffer = noise(ctx, 0.03);
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 3000 + Math.random() * 3000;
      const cg = ctx.createGain();
      cg.gain.setValueAtTime(0.05 + Math.random() * 0.07, at);
      cg.gain.exponentialRampToValueAtTime(0.0001, at + 0.03);
      c.connect(hp).connect(cg).connect(master);
      c.start(at);
    }
  }

  private lastUi = 0;

  /**
   * Button sounds. Hover is a soft breath of air with a glint on primary
   * buttons; press is a warm low knock (primary), a paper tap (answers) or a
   * dry tick (everything else). Throttled so sweeping across buttons stays
   * quiet.
   */
  uiHover(kind: "primary" | "glass" | "outline" | "link") {
    if (!this.n || this.atmos === 0) return;
    const { ctx, master, verb } = this.n;
    const t = ctx.currentTime;
    if (t - this.lastUi < 0.06) return;
    this.lastUi = t;
    const src = ctx.createBufferSource();
    src.buffer = noise(ctx, 0.25);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(kind === "glass" ? 1800 : 1200, t);
    bp.frequency.exponentialRampToValueAtTime(kind === "glass" ? 3400 : 2200, t + 0.2);
    bp.Q.value = 1.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(kind === "link" ? 0.02 : 0.045, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    src.connect(bp).connect(g).connect(master);
    src.start(t);
    if (kind === "primary" || kind === "glass") this.bell(kind === "primary" ? 1318.5 : 987.8, 0.012, 0.9);
    void verb;
  }

  uiPress(kind: "primary" | "glass" | "outline" | "link") {
    if (!this.n || this.atmos === 0) return;
    const { ctx, master, verb } = this.n;
    const t = ctx.currentTime;
    if (kind === "primary") {
      // A warm knock, like a hand on a wooden door.
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(62, t + 0.16);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.28, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g);
      g.connect(master);
      g.connect(verb);
      o.start(t);
      o.stop(t + 0.32);
    }
    // Every press gets a short tap on top: papery for answers, dry for the rest.
    const src = ctx.createBufferSource();
    src.buffer = noise(ctx, 0.08);
    const f = ctx.createBiquadFilter();
    f.type = kind === "glass" ? "bandpass" : "highpass";
    f.frequency.value = kind === "glass" ? 2600 : kind === "primary" ? 1800 : 3200;
    f.Q.value = 0.9;
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(kind === "link" ? 0.05 : 0.11, t);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + (kind === "glass" ? 0.07 : 0.035));
    src.connect(f).connect(g2).connect(master);
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
    if (!this.n || this.atmos === 0) return;
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
    if (!this.n || this.atmos === 0) return;
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

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Sliders feel linear to the ear when the gain follows a square curve. */
const busGain = (v: number) => 0.9 * v * v;

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
  const level = audio.voiceLevel();
  if (typeof window === "undefined" || !("speechSynthesis" in window) || level === 0) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.82;
  u.pitch = 0.55;
  u.volume = level;
  const voices = window.speechSynthesis.getVoices();
  const pick =
    voices.find((v) => /Daniel|Google UK English Male|Alex|Fred/i.test(v.name)) ?? voices.find((v) => v.lang.startsWith("en"));
  if (pick) u.voice = pick;
  window.speechSynthesis.speak(u);
}

export function hush() {
  audio.stopVoice();
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}
