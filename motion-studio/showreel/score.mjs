// node showreel/score.mjs out/score.wav
// Original 15s score for the showreel, synthesized in code on the same timeline as the picture.
// 120 BPM, Am – F – C – G, one chord per bar (2s). SFX are placed on the film's own cue times.
import { writeFileSync } from 'node:fs';

const SR = 48000, DUR = 15.4, N = Math.ceil(DUR * SR), TAU = Math.PI * 2;
const L = new Float32Array(N), R = new Float32Array(N);
const music = new Float32Array(N); // bass + arp bus, gets sidechained to the kick

let seed = 7;
const noise = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2147483648) - 1;
const lpA = (fc) => 1 - Math.exp(-TAU * fc / SR);

function add(buf, t0, len, fn) {
  const s0 = Math.floor(t0 * SR);
  for (let i = 0; i < len * SR; i++) { const j = s0 + i; if (j >= 0 && j < N) buf[j] += fn(i / SR); }
}
function addStereo(t0, len, pan, fn) {
  const gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4), s0 = Math.floor(t0 * SR);
  for (let i = 0; i < len * SR; i++) { const j = s0 + i; if (j < 0 || j >= N) continue; const v = fn(i / SR); L[j] += v * gl; R[j] += v * gr; }
}

// ---------- drums ----------
function kick(t0, gain = 1) {
  let ph = 0;
  addStereo(t0, 0.45, 0, (t) => { ph += TAU * (45 + 110 * Math.exp(-t * 28)) / SR; return (Math.sin(ph) * Math.exp(-t * 7) + (t < 0.004 ? noise() * 0.5 : 0)) * 0.9 * gain; });
}
function hat(t0, pan, gain = 1) {
  let lp = 0;
  addStereo(t0, 0.07, pan, (t) => { const n = noise(); lp += lpA(7000) * (n - lp); return (n - lp) * Math.exp(-t * 55) * 0.22 * gain; });
}
function clap(t0) {
  let a = 0, b = 0;
  addStereo(t0, 0.25, 0.05, (t) => {
    const n = noise(); a += lpA(2600) * (n - a); b += lpA(900) * (n - b);
    const env = t < 0.03 ? Math.exp(-(t % 0.01) * 300) : Math.exp(-(t - 0.03) * 18); // three quick bursts, then the tail
    return (a - b) * env * 0.55;
  });
}

// ---------- tonal parts ----------
const CHORDS = [[220, 261.63, 329.63, 440], [174.61, 220, 261.63, 349.23], [261.63, 329.63, 392, 523.25], [196, 246.94, 293.66, 392]];
const ROOTS = [55, 43.65, 65.41, 49];

const PL = new Float32Array(N), PR = new Float32Array(N); // arp bus (stereo), also ducked
function pluck(t0, f, gain, pan, bright = 1) {
  let lp = 0, p1 = 0, p2 = 0;
  const gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4), s0 = Math.floor(t0 * SR);
  for (let i = 0; i < 0.4 * SR; i++) {
    const t = i / SR, j = s0 + i; if (j >= N) break;
    p1 = (p1 + f / SR) % 1; p2 = (p2 + f * 1.006 / SR) % 1;
    const saw = (p1 * 2 - 1) + (p2 * 2 - 1);
    lp += lpA((600 + 3800 * Math.exp(-t * 14)) * bright) * (saw - lp);
    const v = lp * Math.exp(-t * 8) * gain;
    PL[j] += v * gl; PR[j] += v * gr;
  }
}

function bassNote(t0, f, len) {
  let ph = 0, p = 0, lp = 0;
  add(music, t0, len, (t) => {
    ph += TAU * f / SR; p = (p + f / SR) % 1;
    lp += lpA(420 + 500 * Math.exp(-t * 12)) * ((p * 2 - 1) - lp);
    const env = Math.min(1, t * 200) * Math.exp(-t * 3.2) * Math.min(1, (len - t) * 60);
    return (Math.sin(ph) * 0.55 + lp * 0.45) * env * 0.5;
  });
}

// ---------- sfx ----------
function whoosh(tCut, len = 0.42, gain = 1) {
  let lp = 0; const t0 = tCut - len * 0.75;
  addStereo(t0, len, 0, (t) => { const x = t / len, fc = 300 + 5000 * Math.sin(Math.PI * x) ** 2;
    lp += lpA(fc) * (noise() - lp); return lp * Math.sin(Math.PI * x) ** 1.5 * 0.5 * gain; });
}
function click(t0, gain = 1) {
  addStereo(t0, 0.05, 0.1, (t) => (Math.sin(TAU * 1900 * t) * Math.exp(-t * 110) + (t < 0.002 ? noise() : 0) * 0.4) * 0.35 * gain);
}
function pop(t0, f0 = 420, f1 = 980) {
  let ph = 0;
  addStereo(t0, 0.16, 0, (t) => { ph += TAU * (f0 + (f1 - f0) * Math.min(1, t / 0.08)) / SR; return Math.sin(ph) * Math.exp(-t * 26) * 0.32; });
}
function blip(t0, f, pan) {
  addStereo(t0, 0.35, pan, (t) => (Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * f * 2 * t)) * Math.exp(-t * 11) * 0.22);
}
function zip(t0, f0, f1, len, gain = 0.25) {
  let ph = 0;
  addStereo(t0, len, 0, (t) => { ph += TAU * (f0 * Math.pow(f1 / f0, t / len)) / SR; return Math.sin(ph) * Math.sin(Math.PI * t / len) * gain; });
}
function riser(t0, t1) {
  let lp = 0, ph = 0; const len = t1 - t0;
  addStereo(t0, len, 0, (t) => { const x = t / len; lp += lpA(400 + 7000 * x * x) * (noise() - lp); ph += TAU * (180 * Math.pow(4, x)) / SR;
    return (lp * 0.5 + Math.sin(ph) * 0.12) * x * x * 0.8; });
}
function impact(t0) {
  kick(t0, 1.2);
  let hp = 0, ph = 0;
  addStereo(t0, 1.4, 0, (t) => { const n = noise(); hp += lpA(3000) * (n - hp); ph += TAU * 38 / SR;
    return ((n - hp) * Math.exp(-t * 3.2) * 0.3) + Math.sin(ph) * Math.exp(-t * 2.5) * 0.45; });
}

// ---------- arrangement (all times in seconds, beat = 0.5) ----------
const beats = []; for (let b = 1; b < 30; b++) beats.push(b * 0.5);
const inBreak = (t) => t >= 12 && t < 13.5;

// intro: landing thump, bar shoots out
kick(0.35, 0.8); click(0.35, 0.8); zip(0.5, 260, 1400, 0.16, 0.18);
// drums
const kicks = beats.filter((t) => t >= 2 && t < 14.6 && (!inBreak(t) || t === 12 || t === 13));
kicks.forEach((t) => kick(t));
kick(1.0, 0.6); kick(1.5, 0.7);
beats.filter((t) => t >= 2 && t < 14.6).forEach((t, i) => hat(t + 0.25, i % 2 ? 0.35 : -0.35, inBreak(t) ? 0.5 : 1));
beats.filter((t) => (t >= 4 && t < 12) || (t >= 13.5 && t < 14.6)).filter((t) => [0.5, 1.5].includes(t % 2)).forEach(clap);
// bass: 8ths with octave hops, bars 1..6 and the end card
for (let t = 2; t < 14.5; t += 0.25) {
  if (inBreak(t)) continue;
  const f = ROOTS[Math.floor(t / 2) % 4] * ((Math.round(t * 4) % 4 === 3) ? 2 : 1);
  bassNote(t, f, 0.22);
}
// arp: 8ths in the intro, 16ths from bar 1, filtered 8ths in the breakdown
const ORDER = [0, 1, 2, 3, 2, 1, 3, 2];
for (let t = 0.5, k = 0; t < 14.6; k++) {
  const step = t < 2 || inBreak(t) ? 0.25 : 0.125;
  const ch = CHORDS[Math.floor(t / 2) % 4], f = ch[ORDER[k % 8]] * (Math.floor(k / 8) % 2 ? 2 : 1);
  pluck(t, f, inBreak(t) ? 0.14 : 0.1, k % 2 ? 0.25 : -0.25, inBreak(t) ? 0.35 : 1);
  t = Math.round((t + step) * 1000) / 1000;
}
// cues from the picture
[1.75, 3.72, 5.8, 7.45, 9.45, 13.02, 14.55].forEach((t) => whoosh(t));
whoosh(11.62, 0.5, 1.2);                                  // zoom through the toggle
[4.0, 4.5, 5.0, 5.5].forEach((t, i) => pop(t, 380 + i * 60, 900 + i * 120));
blip(6.5, 880, -0.4); blip(7.0, 1320, 0.4); click(6.5); click(7.0);
click(10.5); click(10.78); click(11.25, 0.6);
zip(10.8, 300, 900, 0.45, 0.1);                           // slider drag
[11.0, 11.1, 11.2, 11.3].forEach((t, i) => blip(t, 660 * (1 + i * 0.25), i % 2 ? 0.3 : -0.3));
riser(12.9, 13.5); impact(13.5);
zip(14.8, 400, 2200, 0.2, 0.22);                          // dot leaves, loops to frame 0

// ---------- mix ----------
const kickTimes = [...kicks, 1.0, 1.5, 13.5].sort((a, b) => a - b);
let ki = 0, duck = 1;
for (let j = 0; j < N; j++) {
  const t = j / SR;
  while (ki < kickTimes.length - 1 && kickTimes[ki + 1] <= t) ki++;
  const since = t - kickTimes[ki];
  duck = since >= 0 ? 1 - 0.55 * Math.exp(-since * 11) : 1;
  L[j] += (music[j] + PL[j]) * duck; R[j] += (music[j] + PR[j]) * duck;
  const fadeOut = Math.min(1, (DUR - t) / 0.3);
  L[j] = Math.tanh(L[j] * 1.1) * fadeOut; R[j] = Math.tanh(R[j] * 1.1) * fadeOut;
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
writeFileSync(process.argv[2] || 'out/score.wav', b);
console.log('wrote', process.argv[2] || 'out/score.wav');
