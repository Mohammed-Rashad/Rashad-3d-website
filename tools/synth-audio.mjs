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
S['amb-intro'] = () => { const x = buf(14); for (const f of [110, 164.8, 220]) mix(x, mul(tone(14, f, { a: 3, d: 30, harm: [1, 0.1] }), new Float32Array(14 * SR).fill(0.25))); for (let i = 0; i < x.length; i++) x[i] *= 0.7 + 0.3 * Math.sin(TAU * i / SR / 7); return loopify(x, 2); };
S['amb-taiz'] = () => { const x = wind(16, 0.5, 250); for (let k = 0; k < 14; k++) { const at = Math.floor(rnd() * 14 * SR); const f = 2800 + rnd() * 2000; for (let j = 0; j < 2 + rnd() * 3; j++) mix(x, chirp(f), at + j * Math.floor(0.12 * SR), 0.12); } return loopify(x); };
S['amb-sanaa'] = () => { const x = wind(14, 0.7, 200); mix(x, x.map(() => 0)); for (let k = 0; k < 200; k++) { const at = Math.floor(rnd() * 13.5 * SR); mix(x, tone(0.03, 4200 + rnd() * 300, { a: 0.003, d: 0.01 }), at, 0.04); } return loopify(x); };
S['amb-cairo'] = () => { const n = 16 * SR; const w = noise(n); bandpass(w, 200, 1200); for (let i = 0; i < n; i++) { const t = i / SR; w[i] *= 0.5 + 0.5 * Math.abs(Math.sin(TAU * t * 0.37) * Math.sin(TAU * t * 1.3)); } const hum = brown(n); lowpass(hum, 180); mix(w, hum, 0, 0.6); for (let k = 0; k < 40; k++) mix(w, click(0.015, 800, 3000), Math.floor(rnd() * 15 * SR), 0.3); return loopify(w); };
S['amb-lubeck'] = () => { const n = 16 * SR; const sea = noise(n); lowpass(sea, 700); for (let i = 0; i < n; i++) { const t = i / SR; sea[i] *= 0.25 + 0.75 * Math.pow(0.5 + 0.5 * Math.sin(TAU * t / 5.2), 3); } mix(sea, wind(16, 0.4, 300), 0, 0.5); for (const at of [2.1, 6.5, 7.2, 11.8]) mix(sea, gull(), Math.floor(at * SR), 0.35); return loopify(sea); };
S['amb-najran'] = () => { const x = wind(16, 0.75, 450); const hi = noise(16 * SR); bandpass(hi, 2000, 5000); for (let i = 0; i < hi.length; i++) hi[i] *= 0.06 * (0.5 + 0.5 * Math.sin(TAU * i / SR / 4)); mix(x, hi); return loopify(x); };
S['amb-library'] = () => { const n = 14 * SR; const x = brown(n); lowpass(x, 300); const c = noise(n); bandpass(c, 1500, 6000); for (let i = 0; i < n; i++) c[i] *= rnd() < 0.002 ? 1 : 0.03; mix(x, c, 0, 0.5); const clk = buf(14); for (let t = 0; t < 14; t += 1) mix(clk, click(0.01, 2000, 5000), Math.floor(t * SR), 0.25); mix(x, clk); return loopify(x); };
S['amb-writer'] = () => { const n = 14 * SR; const x = brown(n); lowpass(x, 400); for (let k = 0; k < 6; k++) { const r = noise(Math.floor(0.4 * SR)); bandpass(r, 1000, 6000); mix(x, mul(r, env(r.length, 0.1, 0.1)), Math.floor(rnd() * 13 * SR), 0.15); } return loopify(x); };
S['amb-ai'] = () => { const x = buf(16); for (const [f, g] of [[130.8, 0.3], [196, 0.2], [261.6, 0.12], [329.6, 0.08]]) { const t = tone(16, f, { a: 4, d: 40, harm: [1, 0.3, 0.1], vib: 0.002 }); mix(x, t, 0, g); } return loopify(x, 3); };
S['amb-end'] = () => { const x = buf(18); for (const [f, g] of [[146.8, 0.3], [220, 0.22], [293.7, 0.15], [370, 0.1], [440, 0.06]]) mix(x, tone(18, f, { a: 5, d: 40, harm: [1, 0.2], vib: 0.003 }), 0, g); return loopify(x, 3); };

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
  const x = norm(fn(), name.startsWith('amb') ? 0.5 : 0.8);
  const wav = path.join(TMP, name + '.wav'); writeWav(wav, x);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libvorbis', '-q:a', '1', path.join(OUT, name + '.ogg')]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '64k', path.join(OUT, name + '.mp3')]);
  console.log(name);
}
fs.rmSync(TMP, { recursive: true, force: true });
