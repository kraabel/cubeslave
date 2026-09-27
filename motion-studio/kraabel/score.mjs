// node kraabel/score.mjs out/kraabel-score.wav
// Original score for the kraabel.ai ad: 96 BPM (bar = 2.5s), felt-piano chords, pencil and machine textures.
// Every cue below is a time taken from kraabel/index.html.
import { writeFileSync } from 'node:fs';

const SR = 48000, DUR = 15, N = DUR * SR, TAU = Math.PI * 2, BEAT = 0.625;
const L = new Float32Array(N), R = new Float32Array(N), MUS_L = new Float32Array(N), MUS_R = new Float32Array(N);
let seed = 11;
const noise = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2147483648) - 1;
const lpA = (fc) => 1 - Math.exp(-TAU * fc / SR);

function put(bl, br, t0, len, pan, fn) {
  const gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4), s0 = Math.floor(t0 * SR);
  for (let i = 0; i < len * SR; i++) { const j = s0 + i; if (j < 0 || j >= N) continue; const v = fn(i / SR); bl[j] += v * gl; br[j] += v * gr; }
}
const sfx = (t0, len, pan, fn) => put(L, R, t0, len, pan, fn);
const mus = (t0, len, pan, fn) => put(MUS_L, MUS_R, t0, len, pan, fn);

// ---------- instruments ----------
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
function piano(t0, midi, vel = 0.5, pan = 0, len = 2.6) {
  const f = hz(midi), dk = 1.6 + (midi - 50) * 0.04;
  let lp = 0;
  mus(t0, len, pan, (t) => {
    const env = Math.min(1, t * 250) * Math.exp(-t * dk);
    const tone = Math.sin(TAU * f * t) + 0.42 * Math.sin(TAU * 2 * f * t) * Math.exp(-t * 3) + 0.18 * Math.sin(TAU * 3.01 * f * t) * Math.exp(-t * 6);
    const hammer = t < 0.012 ? noise() * 0.25 : 0;
    lp += lpA(1400 + 2200 * vel) * (tone + hammer - lp); // felt: soft top end
    return lp * env * vel * 0.28;
  });
}
function bass(t0, midi, len) {
  const f = hz(midi);
  mus(t0, len, 0, (t) => Math.sin(TAU * f * t) * Math.min(1, t * 20) * Math.min(1, (len - t) * 4) * Math.exp(-t * 0.5) * 0.32);
}
function softKick(t0, gain = 1) {
  let ph = 0;
  sfx(t0, 0.5, 0, (t) => { ph += TAU * (42 + 48 * Math.exp(-t * 22)) / SR; return Math.sin(ph) * Math.exp(-t * 6.5) * 0.6 * gain; });
}
function shaker(t0, gain) {
  let lp = 0;
  sfx(t0, 0.06, 0.25, (t) => { const n = noise(); lp += lpA(6000) * (n - lp); return (n - lp) * Math.sin(Math.PI * t / 0.06) * 0.07 * gain; });
}
function tick(t0, f = 3200, gain = 0.1, pan = 0) {
  sfx(t0, 0.03, pan, (t) => Math.sin(TAU * f * t) * Math.exp(-t * 260) * gain);
}
function pencil(t0, len, gain = 0.12) {
  let hp = 0, lp = 0;
  sfx(t0, len, -0.15, (t) => {
    const n = noise(); hp += lpA(1800) * (n - hp); const band = n - hp; lp += lpA(5200) * (band - lp);
    const tex = 0.55 + 0.45 * Math.abs(Math.sin(t * 23 + Math.sin(t * 7) * 2)); // strokes and pressure
    const env = Math.min(1, t * 12) * Math.min(1, (len - t) * 6);
    return lp * tex * env * gain * 2.2;
  });
}
function machineTone(t0, len, f = 1318.5, gain = 0.05) {
  sfx(t0, len, 0.2, (t) => Math.sin(TAU * f * t) * Math.min(1, t * 30) * Math.min(1, (len - t) * 8) * gain);
}
function paper(tCut, len = 0.5, gain = 1) {
  let lp = 0; const t0 = tCut - len * 0.6;
  sfx(t0, len, 0, (t) => { const x = t / len; lp += lpA(500 + 2600 * Math.sin(Math.PI * x)) * (noise() - lp); return lp * Math.sin(Math.PI * x) ** 2 * 0.38 * gain; });
}
function chime(t0, gain = 1) {
  sfx(t0, 2.2, 0.1, (t) => (Math.sin(TAU * 1760 * t) + 0.5 * Math.sin(TAU * 2637 * t) * Math.exp(-t * 3) + 0.25 * Math.sin(TAU * 4435 * t) * Math.exp(-t * 6)) * Math.exp(-t * 2.2) * 0.07 * gain);
}
function boom(t0) {
  sfx(t0, 2.8, 0, (t) => Math.sin(TAU * (48 + 10 * Math.exp(-t * 6)) * t) * Math.exp(-t * 1.6) * Math.min(1, t * 60) * 0.5);
}

// ---------- harmony: D, Bm, G, A, G, D (maj9 colour) ----------
const CH = [
  [50, 57, 61, 64, 66, 69], // Dmaj9
  [47, 54, 57, 61, 62, 66], // Bm9
  [43, 50, 54, 57, 59, 62], // Gmaj9
  [45, 52, 57, 59, 61, 64], // Aadd9
  [43, 50, 54, 57, 59, 62], // Gmaj9
  [50, 57, 61, 64, 66, 69], // Dmaj9, home for the wordmark
];
const r = (() => { let s = 5; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();

// bar 0: the lines are drawn; sparse notes, then the join
piano(0.02, 38, 0.55); piano(0.05, 62, 0.35, -0.2);
piano(1.0, 69, 0.3, 0.3); piano(1.25, 73, 0.28, 0.35);
[50, 57, 61, 64, 69].forEach((m, i) => piano(2.3 + i * 0.03, m, 0.42, (i - 2) * 0.15, 3));
// bars 1–4: 8th-note arpeggios, bass roots
for (let bar = 1; bar < 5; bar++) {
  const ch = CH[bar], t0 = bar * 2.5;
  bass(t0, ch[0] - 12, 2.5);
  const order = [1, 2, 3, 4, 5, 4, 3, 2];
  for (let k = 0; k < 8; k++) piano(t0 + k * BEAT / 2, ch[order[k]], 0.28 + r() * 0.14 + (k === 0 ? 0.12 : 0), k % 2 ? 0.25 : -0.25);
}
// close: wordmark lands on home
bass(12.5, 38, 2.5);
CH[5].forEach((m, i) => piano(12.55 + i * 0.035, m, 0.45 - i * 0.03, (i - 2.5) * 0.12, 3.5));
piano(13.05, 74, 0.3, 0.3, 2.5); piano(13.6, 76, 0.25, -0.3, 2);

// pulse from the cream sheet to the stack
for (let t = 5.0; t < 12.5; t += BEAT * 2) softKick(t, t === 5.0 ? 1 : 0.8);
for (let t = 5.0; t < 12.4; t += BEAT / 4) shaker(t, (Math.round(t / (BEAT / 4)) % 2) ? 1 : 0.45);

// ---------- cues from the picture ----------
pencil(0.02, 1.6);                                  // hand line
machineTone(1.0, 1.3); tick(1.0, 2600, 0.12, 0.3);   // machine line
softKick(2.3, 0.9); paper(2.45, 0.45, 0.7);          // lines join, rise to the header
for (let li = 0; li < 9; li++) for (let j = 0; j < 6; j++)
  tick(3.16 + li * 0.03 + j * 0.013 + r() * 0.01, 2400 + r() * 2400, 0.05 + r() * 0.04, (r() - 0.5) * 0.8); // strokes snap
paper(4.98); paper(7.45, 0.5, 0.8);                  // cream sheet, scroll
[5.45, 5.8875, 6.325].forEach((t) => { tick(t, 1900, 0.14); tick(t + 0.3, 2800, 0.08); }); // column rules
pencil(7.9, 0.5, 0.1); pencil(8.52, 0.5, 0.09); machineTone(9.15, 0.5, 1760, 0.04); // v1, v2 sketched; v3 exact
tick(7.9, 1500, 0.1); tick(8.52, 1500, 0.1); tick(9.15, 1500, 0.1);
chime(9.96); paper(10.0, 0.5, 0.9);                  // period lands, ink returns
[10.08, 10.705, 11.33].forEach((t) => tick(t, 2200, 0.08));
paper(12.4, 0.5, 0.8);
boom(12.55); chime(12.97, 0.8);                      // wordmark, orange rule

// ---------- mix ----------
const kicks = []; for (let t = 5.0; t < 12.5; t += BEAT * 2) kicks.push(t);
let ki = -1;
for (let j = 0; j < N; j++) {
  const t = j / SR;
  while (ki < kicks.length - 1 && kicks[ki + 1] <= t) ki++;
  const duck = ki >= 0 ? 1 - 0.3 * Math.exp(-(t - kicks[ki]) * 9) : 1;
  const tail = Math.min(1, (DUR - t) / 0.6);
  L[j] = Math.tanh((L[j] + MUS_L[j] * duck) * 1.2) * tail;
  R[j] = Math.tanh((R[j] + MUS_R[j] * duck) * 1.2) * tail;
}
const b = Buffer.alloc(44 + N * 4);
b.write('RIFF', 0); b.writeUInt32LE(36 + N * 4, 4); b.write('WAVEfmt ', 8);
b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22);
b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34);
b.write('data', 36); b.writeUInt32LE(N * 4, 40);
for (let j = 0; j < N; j++) {
  b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[j])) * 32767), 44 + j * 4);
  b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[j])) * 32767), 46 + j * 4);
}
const out = process.argv[2] || 'out/kraabel-score.wav';
writeFileSync(out, b); console.log('wrote', out);
