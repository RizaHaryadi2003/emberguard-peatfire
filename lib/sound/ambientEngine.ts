// Mesin suara alam yang disintesis langsung di peramban (Web Audio API),
// tanpa berkas audio. Suaranya disusun dari lapisan yang takarannya diatur
// tiap modul lewat `AmbientMix` (lihat soundscapes.ts):
//   - lapisan menerus : angin, air mengalir, hujan, tonggeret, gemuruh api;
//   - peristiwa acak  : kicau burung, katak, tetes hujan, guntur, derak bara.
// Semua perubahan takaran dihaluskan, jadi suara tidak pernah melompat.

import { birdRate, crackleRate, frogRate, SILENT_MIX, type AmbientMix } from "./soundscapes";

/** Derau acak berdurasi `seconds`; versi "coklat" lebih dalam dan lembut. */
function createNoiseBuffer(ctx: AudioContext, seconds: number, brown: boolean): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    } else {
      data[i] = white;
    }
  }
  return buffer;
}

/** Kekuatan puncak tiap lapisan menerus pada takaran 1. */
const PEAK = {
  wind: 0.55,
  water: 0.09,
  rain: 0.16,
  insects: 0.035,
  fire: 0.9,
} as const;

/** Waktu penghalusan perubahan takaran (detik, konstanta waktu). */
const SMOOTH_S = 0.8;

/** Selang penjadwal peristiwa acak (milidetik). */
const TICK_MS = 100;

/** Peluang kejadian per selang dari laju per detik. */
const perTick = (ratePerSecond: number) => (ratePerSecond * TICK_MS) / 1000;

export class AmbientEngine {
  private ctx: AudioContext;
  private master: GainNode;
  private brown: AudioBuffer;
  private white: AudioBuffer;
  private gains: Record<keyof typeof PEAK, GainNode>;
  private waterFilters: BiquadFilterNode[] = [];
  private timer: number | null = null;
  private mix: AmbientMix = { ...SILENT_MIX };

  constructor() {
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ctx.destination);
    this.brown = createNoiseBuffer(this.ctx, 6, true);
    this.white = createNoiseBuffer(this.ctx, 2, false);

    const gain = () => {
      const g = this.ctx.createGain();
      g.gain.value = 0;
      g.connect(this.master);
      return g;
    };
    this.gains = { wind: gain(), water: gain(), rain: gain(), insects: gain(), fire: gain() };

    // Angin: derau coklat bersaring lolos-rendah yang frekuensinya diayun pelan.
    const windFilter = this.filter("lowpass", 420);
    this.lfo(0.07, 220, windFilter.frequency);
    this.loop(this.brown).connect(windFilter).connect(this.gains.wind);

    // Air mengalir: dua pita sempit yang frekuensinya digoyang acak oleh
    // penjadwal, sehingga terdengar seperti gemericik, bukan desis.
    for (const f of [520, 980]) {
      const bp = this.filter("bandpass", f, 3.5);
      this.loop(this.white).connect(bp).connect(this.gains.water);
      this.waterFilters.push(bp);
    }

    // Hujan: derau putih yang dipotong atas-bawah menjadi desau rintik.
    const rainHigh = this.filter("highpass", 900);
    const rainLow = this.filter("lowpass", 7000);
    this.loop(this.white).connect(rainHigh).connect(rainLow).connect(this.gains.rain);

    // Tonggeret: pita tinggi yang dikedipkan ±28 kali per detik, lalu
    // membesar-mengecil pelan seperti paduan serangga di hutan siang.
    const insectBand = this.filter("bandpass", 4800, 6);
    const pulse = this.ctx.createGain();
    pulse.gain.value = 0.5;
    this.lfo(28, 0.5, pulse.gain);
    const swell = this.ctx.createGain();
    swell.gain.value = 0.7;
    this.lfo(0.05, 0.3, swell.gain);
    this.loop(this.white).connect(insectBand).connect(pulse).connect(swell).connect(this.gains.insects);

    // Gemuruh api: derau coklat sangat rendah.
    const roarFilter = this.filter("lowpass", 160);
    this.loop(this.brown).connect(roarFilter).connect(this.gains.fire);
  }

  private filter(type: BiquadFilterType, frequency: number, q?: number): BiquadFilterNode {
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = frequency;
    if (q !== undefined) f.Q.value = q;
    return f;
  }

  /** Pengayun pelan yang menambahkan ±`depth` ke parameter `target`. */
  private lfo(frequency: number, depth: number, target: AudioParam) {
    const osc = this.ctx.createOscillator();
    const amount = this.ctx.createGain();
    osc.frequency.value = frequency;
    amount.gain.value = depth;
    osc.connect(amount).connect(target);
    osc.start();
  }

  private loop(buffer: AudioBuffer): AudioBufferSourceNode {
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.start(0, Math.random() * buffer.duration);
    return src;
  }

  /** Letupan derau singkat bersaring, dipakai derak bara dan tetes hujan. */
  private burst(at: number, type: BiquadFilterType, frequency: number, peak: number, length: number) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.white;
    const f = this.filter(type, frequency);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(peak, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + length);
    src.connect(f).connect(g).connect(this.master);
    src.start(at, Math.random() * 1.5, length + 0.02);
  }

  /** Satu kicau burung: beberapa nada pendek yang naik cepat. */
  private chirp(at: number) {
    const notes = 2 + Math.floor(Math.random() * 3);
    const base = 2600 + Math.random() * 1600;
    for (let n = 0; n < notes; n++) {
      const t = at + n * (0.09 + Math.random() * 0.05);
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(base, t);
      osc.frequency.exponentialRampToValueAtTime(base * (1.25 + Math.random() * 0.3), t + 0.06);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.03, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      osc.connect(g).connect(this.master);
      osc.start(t);
      osc.stop(t + 0.1);
    }
  }

  /** Satu suara katak: deret denyut rendah yang serak. */
  private croak(at: number) {
    const pulses = 3 + Math.floor(Math.random() * 4);
    const pitch = 170 + Math.random() * 150;
    const osc = this.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = pitch;
    const band = this.filter("bandpass", pitch * 2.5, 2);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    for (let n = 0; n < pulses; n++) {
      const t = at + n * 0.048;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.045, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.032);
    }
    osc.connect(band).connect(g).connect(this.master);
    osc.start(at);
    osc.stop(at + pulses * 0.048 + 0.05);
  }

  /** Guntur di kejauhan: gemuruh rendah yang naik pelan lalu bergulung lama. */
  private thunder(at: number, strength: number) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.brown;
    const f = this.filter("lowpass", 90 + Math.random() * 60);
    const g = this.ctx.createGain();
    const length = 3 + Math.random() * 3;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.7 * strength, at + 0.25 + Math.random() * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, at + length);
    src.connect(f).connect(g).connect(this.master);
    src.start(at, Math.random() * 2, length + 0.1);
  }

  /** Penjadwal: tiap selang memutuskan peristiwa acak dan menggoyang air. */
  private tick = () => {
    const now = this.ctx.currentTime;
    const m = this.mix;
    const soon = () => now + Math.random() * (TICK_MS / 1000);
    const times = (rate: number) => {
      const p = perTick(rate);
      return Math.floor(p) + (Math.random() < p % 1 ? 1 : 0);
    };

    for (let i = times(crackleRate(m.fire)); i > 0; i--) {
      this.burst(soon(), "highpass", 1200 + Math.random() * 2500, (0.05 + Math.random() * 0.2) * (0.4 + m.fire), 0.01 + Math.random() * 0.03);
    }
    for (let i = times(m.rain * 30); i > 0; i--) {
      this.burst(soon(), "bandpass", 2000 + Math.random() * 3500, 0.02 + Math.random() * 0.04 * m.rain, 0.015);
    }
    if (Math.random() < perTick(birdRate(m.birds))) this.chirp(soon());
    if (Math.random() < perTick(frogRate(m.frogs))) this.croak(soon());
    if (m.rain > 0.6 && Math.random() < perTick(0.04 * m.rain)) this.thunder(soon(), m.rain);
    if (m.water > 0) {
      for (const f of this.waterFilters) {
        const base = f === this.waterFilters[0] ? 520 : 980;
        f.frequency.setTargetAtTime(base * (0.7 + Math.random() * 0.6), now, 0.04);
      }
    }
  };

  /**
   * Peramban menahan audio sampai pembaca menekan sesuatu di halaman ini.
   * Bila pilihan "suara menyala" terbawa dari halaman sebelumnya lewat muat
   * ulang penuh, konteksnya masih tertahan: lanjutkan pada sentuhan pertama.
   */
  private resumeOnGesture() {
    if (this.ctx.state === "running") return;
    const resume = () => {
      void this.ctx.resume();
      document.removeEventListener("pointerdown", resume);
      document.removeEventListener("keydown", resume);
    };
    document.addEventListener("pointerdown", resume);
    document.addEventListener("keydown", resume);
  }

  /** Mulai (atau lanjutkan) suara dengan memudar masuk. */
  async start() {
    this.resumeOnGesture();
    await this.ctx.resume();
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(0.9, now, 0.6);
    if (this.timer === null) this.timer = window.setInterval(this.tick, TICK_MS);
  }

  /** Hentikan suara dengan memudar keluar. */
  stop() {
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Setel takaran tiap lapisan (0–1); perubahannya dihaluskan. */
  setMix(mix: AmbientMix) {
    this.mix = mix;
    const now = this.ctx.currentTime;
    for (const key of Object.keys(PEAK) as (keyof typeof PEAK)[]) {
      this.gains[key].gain.setTargetAtTime(PEAK[key] * mix[key], now, SMOOTH_S);
    }
  }

  dispose() {
    this.stop();
    void this.ctx.close();
  }
}
