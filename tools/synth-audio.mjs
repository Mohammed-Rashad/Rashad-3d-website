// Procedural placeholder sound design (CC0, made for this site).
// Usage: node tools/synth-audio.mjs  → writes public/audio/*.ogg + *.mp3 via ffmpeg.
// Replace any file with a real recording (Freesound / ElevenLabs) of the same name later.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import os from 'os';

const SR = 32000;
const OUT = path.resolve('public/audio');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'synth-'));
fs.mkdirSync(OUT, { recursive: true });

let seed = 1234567;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const white = () => rnd() * 2 - 1;
const buf = (sec) => new Float32Array(Math.floor(sec * SR));
const TAU = Math.PI * 2;

// simple one-pole filters
function lowpass(x, fc) { const a = Math.exp(-TAU * fc / SR); let y = 0; for (let i = 0; i < x.length; i++) { y = (1 - a) * x[i] + a * y; x[i] = y; } return x; }
function highpass(x, fc) { const a = Math.exp(-TAU * fc / SR); let y = 0, px = 0; for (let i = 0; i < x.length; i++) { const v = a * (y + x[i] - px); px = x[i]; y = v; x[i] = v; } return x; }
function bandpass(x, lo, hi) { return lowpass(highpass(x, lo), hi); }
function brown(n) { const x = new Float32Array(n); let b = 0; for (let i = 0; i < n; i++) { b = (b + 0.02 * white()) / 1.02; x[i] = b * 3.5; } return x; }
function noise(n) { const x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = white(); return x; }
function mix(dst, src, at = 0, gain = 1) { for (let i = 0; i < src.length && at + i < dst.length; i++) if (at + i >= 0) dst[at + i] += src[i] * gain; return dst; }
function env(n, a, d) { const e = new Float32Array(n); const A = Math.floor(a * SR); for (let i = 0; i < n; i++) e[i] = i < A ? i / A : Math.exp(-(i - A) / (d * SR)); return e; }
function mul(x, e) { for (let i = 0; i < x.length; i++) x[i] *= e[i]; return x; }
function norm(x, peak = 0.8) { let m = 1e-9; for (const v of x) m = Math.max(m, Math.abs(v)); for (let i = 0; i < x.length; i++) x[i] *= peak / m; return x; }
function tone(sec, f, { a = 0.005, d = 0.3, harm = [1], vib = 0, glide = 0 } = {}) {
  const x = buf(sec); let ph = 0;
  for (let i = 0; i < x.length; i++) { const t = i / SR; const fr = f * (1 + glide * t) * (1 + vib * Math.sin(TAU * 5 * t)); ph += TAU * fr / SR; let s = 0; harm.forEach((h, k) => (s += h * Math.sin(ph * (k + 1)))); x[i] = s; }
  return mul(x, env(x.length, a, d));
}
// make a seamless loop by crossfading the tail into the head
function loopify(x, fade = 1.5) {
  const F = Math.floor(fade * SR); const n = x.length - F; const y = new Float32Array(n);
  for (let i = 0; i < n; i++) y[i] = x[i];
  for (let i = 0; i < F; i++) { const g = i / F; y[i] = x[i] * Math.sqrt(g) + x[n + i] * Math.sqrt(1 - g); }
  return y;
}
function wind(sec, depth = 0.6, base = 300) {
  const n = Math.floor(sec * SR); const x = brown(n); const y = noise(n); bandpass(y, base, base * 3);
  for (let i = 0; i < n; i++) { const t = i / SR; const g = 1 - depth * (0.5 + 0.5 * Math.sin(TAU * t / 7.3) * Math.sin(TAU * t / 3.1 + 1)); x[i] = (x[i] * 0.8 + y[i] * 0.35) * g; }
  return x;
}
function chirp(f0 = 3500) { const s = 0.06 + rnd() * 0.1; const x = buf(s); let ph = 0; for (let i = 0; i < x.length; i++) { const t = i / x.length; ph += TAU * f0 * (1 + 0.5 * Math.sin(Math.PI * t)) / SR; x[i] = Math.sin(ph) * Math.sin(Math.PI * t); } return x; }
function gull() { const x = buf(0.7); let ph = 0; for (let i = 0; i < x.length; i++) { const t = i / x.length; const f = 1400 + 900 * Math.sin(Math.PI * t) - 600 * t; ph += TAU * f / SR; x[i] = (Math.sin(ph) + 0.4 * Math.sin(2 * ph) + 0.2 * white()) * Math.sin(Math.PI * t) ** 0.5 * (1 - t); } return bandpass(x, 600, 4000); }
function bell(f, sec = 3) { const x = buf(sec); const parts = [[0.5, 1], [1, 0.8], [1.19, 0.5], [1.5, 0.4], [2, 0.3], [2.74, 0.2]]; for (let i = 0; i < x.length; i++) { const t = i / SR; let s = 0; for (const [r, g] of parts) s += g * Math.sin(TAU * f * r * t) * Math.exp(-t * (1.2 + r)); x[i] = s; } return x; }
function click(len = 0.02, lo = 1500, hi = 6000) { const x = noise(Math.floor(len * SR)); bandpass(x, lo, hi); return mul(x, env(x.length, 0.001, len / 4)); }

const S = {};

// ---------- ambiences (loops) ----------


// ---------- ambiences (seamless loops): soft tonal pads + sparse details, no hiss ----------
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
// every LFO period divides the loop length L, so loops are seamless by construction
function pad(L, notes, { gain = 0.18, bright = 0.25, breathe = 0.35 } = {}) {
  const n = Math.floor(L * SR); const x = new Float32Array(n);
  notes.forEach((m, k) => {
    const f = hz(m); const cyc = Math.round(f * L) / L; // integer cycles per loop
    const lfo = 1 + (k % 3); const ph0 = k * 1.7;
    for (let i = 0; i < n; i++) {
      const t = i / SR; const a = 1 - breathe * (0.5 + 0.5 * Math.sin((TAU * lfo * t) / L + ph0));
      const p = TAU * cyc * t;
      x[i] += gain * a * (Math.sin(p) + bright * Math.sin(2 * p) * 0.5 + bright * 0.2 * Math.sin(3 * p));
    }
  });
  return lowpass(x, 2200);
}
function sprinkle(x, L, count, make, gain, seedOff = 0) { for (let k = 0; k < count; k++) { const at = Math.floor(((k + 0.5 + (rnd() - 0.5) * 0.6) / count) * (L - 2.6) * SR); mix(x, make(k), at, gain); } return x; }
const pluck = (m, d = 0.9) => tone(d + 0.4, hz(m), { a: 0.004, d, harm: [1, 0.25, 0.08] });
const drop = () => tone(0.25, 900 + rnd() * 700, { a: 0.002, d: 0.06, glide: 2.5 });
const softWind = (L, g = 0.06) => { const w = brown(Math.floor(L * SR)); lowpass(w, 220); for (let i = 0; i < w.length; i++) w[i] *= g * (0.6 + 0.4 * Math.sin((TAU * 2 * i) / (L * SR))); return w; };
const L = 24;
S['amb-intro'] = () => pad(L, [50, 57, 62, 66], { gain: 0.16, breathe: 0.5 });
S['amb-taiz'] = () => { const x = pad(L, [50, 57, 62, 64, 69], { gain: 0.12 }); mix(x, softWind(L, 0.08)); sprinkle(x, L, 7, () => { const c = buf(0.6); const f = 3000 + rnd() * 1500; for (let j = 0; j < 3; j++) mix(c, chirp(f), Math.floor(j * 0.11 * SR)); return c; }, 0.05); return x; };
S['amb-sanaa'] = () => { const x = pad(L, [52, 59, 64, 67, 71], { gain: 0.12, bright: 0.15 }); sprinkle(x, L, 10, (k) => pluck([76, 79, 83, 81][k % 4], 1.4), 0.04); return x; };
S['amb-cairo'] = () => { const x = pad(L, [57, 58, 61, 64, 69], { gain: 0.1, breathe: 0.45 }); sprinkle(x, L, 22, drop, 0.05); mix(x, softWind(L, 0.05)); return x; };
S['amb-lubeck'] = () => { const x = pad(L, [53, 60, 65, 69, 72], { gain: 0.11 }); sprinkle(x, L, 3, () => gull(), 0.12); sprinkle(x, L, 2, () => bell(220, 4), 0.06); return x; };
S['amb-najran'] = () => { const x = pad(L, [50, 51, 54, 57, 62], { gain: 0.11, breathe: 0.5 }); mix(x, softWind(L, 0.1)); return x; };
S['amb-library'] = () => { const x = pad(L, [48, 55, 60, 64], { gain: 0.1, bright: 0.1 }); const clk = buf(L); for (let t = 0; t < L - 0.1; t += 1) mix(clk, click(0.008, 2500, 5000), Math.floor(t * SR), 0.05); mix(x, clk); return x; };
S['amb-writer'] = () => { const x = pad(L, [55, 62, 67, 71], { gain: 0.11, bright: 0.12 }); sprinkle(x, L, 6, (k) => pluck([74, 79, 76, 81][k % 4], 1.8), 0.035); return x; };
S['amb-ai'] = () => { const x = pad(L, [48, 55, 62, 67, 72], { gain: 0.1, bright: 0.4 }); sprinkle(x, L, 24, (k) => pluck([72, 76, 79, 84, 83, 79][k % 6], 0.4), 0.03); return x; };
S['amb-end'] = () => pad(L, [50, 57, 62, 66, 69, 74], { gain: 0.12, breathe: 0.4 });

// ---------- interaction sounds ----------
S['sfx-pour'] = () => { const n = 1.6 * SR; const x = noise(n); for (let i = 0; i < n; i++) { const t = i / SR; x[i] *= Math.sin(Math.PI * t / 1.6); } bandpass(x, 400, 2500); for (let k = 0; k < 40; k++) mix(x, tone(0.04, 600 + rnd() * 900, { a: 0.002, d: 0.015, glide: 3 }), Math.floor(rnd() * 1.5 * SR), 0.25); return x; };
S['sfx-clink'] = () => { const x = buf(1.2); for (const f of [2637, 3520, 4186]) mix(x, tone(1.2, f, { a: 0.001, d: 0.25 }), 0, 0.3); return x; };
S['sfx-chalk'] = () => { const n = 0.7 * SR; const x = noise(n); bandpass(x, 1800, 7000); for (let i = 0; i < n; i++) { const t = i / SR; x[i] *= (0.5 + 0.5 * Math.sin(TAU * 18 * t)) * Math.sin(Math.PI * t / 0.7); } return x; };
S['sfx-bell'] = () => { const x = buf(1.5); for (let k = 0; k < 10; k++) mix(x, tone(0.3, 1800, { a: 0.001, d: 0.12, harm: [1, 0.5, 0.3] }), Math.floor(k * 0.06 * SR), 0.5); return x; };
S['sfx-keys'] = () => { const x = buf(1.2); let t = 0; while (t < 1.1) { mix(x, click(0.025, 1000, 5000), Math.floor(t * SR), 0.6 + rnd() * 0.4); t += 0.06 + rnd() * 0.1; } return x; };
S['sfx-ding'] = () => mix(tone(1.5, 1318.5, { a: 0.002, d: 0.5, harm: [1, 0.2, 0.05] }), tone(1.5, 1975.5, { a: 0.002, d: 0.35 }), 0, 0.3);
S['sfx-churchbell'] = () => { const x = buf(5); mix(x, bell(220, 4.5)); mix(x, bell(220, 2.5), Math.floor(2.4 * SR), 0.7); return x; };
S['sfx-tram'] = () => { const x = buf(1.2); mix(x, bell(1400, 1)); mix(x, bell(1400, 0.8), Math.floor(0.25 * SR)); return x; };
S['sfx-snow'] = () => { const x = buf(2); for (let k = 0; k < 4; k++) { const s = noise(Math.floor(0.25 * SR)); lowpass(s, 2500); for (let j = 0; j < s.length; j++) s[j] *= rnd() < 0.3 ? 1 : 0.2; mix(x, mul(s, env(s.length, 0.03, 0.08)), Math.floor(k * 0.5 * SR)); } return x; };
S['sfx-gull'] = () => { const x = buf(1.5); mix(x, gull()); mix(x, gull(), Math.floor(0.6 * SR), 0.7); return x; };
S['sfx-applause'] = () => { const n = 2.6 * SR; const x = buf(2.6); for (let k = 0; k < 500; k++) mix(x, click(0.012, 800, 5000), Math.floor(rnd() * (n - 800)), 0.3 + rnd() * 0.5); for (let i = 0; i < n; i++) { const t = i / SR; x[i] *= Math.min(1, t * 4) * Math.exp(-Math.max(0, t - 1.2) * 2); } return x; };
S['sfx-page'] = () => { const n = 0.5 * SR; const x = noise(n); bandpass(x, 800, 6000); return mul(x, env(n, 0.12, 0.12)); };
S['sfx-radio'] = () => { const n = 1.4 * SR; const x = noise(n); bandpass(x, 500, 5000); let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR; ph += TAU * (300 + 2000 * t) / SR; x[i] = x[i] * 0.6 + 0.3 * Math.sin(ph) * Math.exp(-((t - 0.9) ** 2) * 30); } return x; };
S['sfx-rustle'] = () => { const x = buf(0.9); for (let k = 0; k < 30; k++) mix(x, click(0.03, 1500, 8000), Math.floor(rnd() * 0.85 * SR), rnd()); return x; };
S['sfx-scribble'] = () => { const n = 1.0 * SR; const x = noise(n); bandpass(x, 2500, 8000); for (let i = 0; i < n; i++) { const t = i / SR; x[i] *= Math.max(0, Math.sin(TAU * 7 * t)) ** 2; } return x; };
S['sfx-blip'] = () => tone(0.25, 880, { a: 0.003, d: 0.08, harm: [1, 0.25] });
S['sfx-hum'] = () => loopify(mix(tone(4, 98, { a: 0.5, d: 20, harm: [1, 0.5, 0.25, 0.1] }), tone(4, 147, { a: 0.5, d: 20 }), 0, 0.3), 0.8);
S['sfx-pulse'] = () => { const x = buf(2.2); for (const f of [523.3, 659.3, 784, 1046.5]) mix(x, tone(2.2, f, { a: 0.01, d: 0.8, harm: [1, 0.15] }), Math.floor((f / 523.3 - 1) * 0.12 * SR), 0.3); return x; };
S['sfx-found'] = () => { const x = buf(1.2); [784, 988, 1175].forEach((f, k) => mix(x, tone(0.8, f, { a: 0.003, d: 0.25, harm: [1, 0.2] }), Math.floor(k * 0.09 * SR), 0.4)); return x; };
S['sfx-unlock'] = () => { const x = buf(3); [523.3, 659.3, 784, 1046.5, 1318.5].forEach((f, k) => mix(x, tone(2.5, f, { a: 0.005, d: 0.9, harm: [1, 0.2] }), Math.floor(k * 0.15 * SR), 0.3)); return x; };
S['sfx-wobble'] = () => { const x = buf(1.2); let ph = 0; for (let i = 0; i < x.length; i++) { const t = i / SR; const s = t === 0 ? 1 : Math.sin(Math.PI * 8 * (t - 0.6)) / (Math.PI * 8 * (t - 0.6) || 1); ph += TAU * (330 + 220 * s) / SR; x[i] = Math.sin(ph) * Math.exp(-((t - 0.6) ** 2) * 6); } return x; };

function writeWav(file, x) {
  const n = x.length; const b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(x[i] * 32767))), 44 + i * 2);
  fs.writeFileSync(file, b);
}

const only = process.argv.slice(2);
for (const [name, fn] of Object.entries(S)) {
  if (only.length && !only.includes(name)) continue;
  const x = norm(fn(), name.startsWith('amb') ? 0.35 : 0.8);
  const wav = path.join(TMP, name + '.wav'); writeWav(wav, x);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libvorbis', '-q:a', '1', path.join(OUT, name + '.ogg')]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '64k', path.join(OUT, name + '.mp3')]);
  console.log(name);
}
fs.rmSync(TMP, { recursive: true, force: true });
