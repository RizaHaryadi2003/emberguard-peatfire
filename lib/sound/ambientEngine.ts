// Mesin suara alam yang disintesis langsung di peramban (Web Audio API),
// tanpa berkas audio. Suaranya disusun dari lapisan yang takarannya diatur
// tiap modul lewat `AmbientMix` (lihat soundscapes.ts):
//   - lapisan menerus : angin, air mengalir, hujan, tonggeret, gemuruh api,
//                       dengung lalu lintas kota, mesin perahu klotok;
//   - peristiwa acak  : kicau burung, katak, tetes hujan, guntur, derak bara,
//                       motor yang lewat, klakson di kejauhan.
// Semua perubahan takaran dihaluskan, jadi suara tidak pernah melompat.

import { birdRate, crackleRate, frogRate, hornRate, passByRate, SILENT_MIX, type AmbientMix } from "./soundscapes";

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
  city: 0.5,
  boat: 0.16,
} as const;

/** Kekerasan keseluruhan: biasa, dan saat narator sedang bicara. */
const LEVEL = { normal: 0.9, ducked: 0.3 } as const;

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
  /** Sudah dibuang: konteksnya tertutup dan tidak boleh disentuh lagi. */
  private disposed = false;
  /** Sedang berbunyi (sudah start, belum stop). */
  private playing = false;
  /** Diredam karena narator sedang bicara. */
  private ducked = false;
  /** Pendengar "sentuhan pertama" yang masih terpasang di dokumen. */
  private gestureResume: (() => void) | null = null;

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
    this.gains = { wind: gain(), water: gain(), rain: gain(), insects: gain(), fire: gain(), city: gain(), boat: gain() };

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

    // Dengung kota: gemuruh rendah lalu lintas jauh ditambah desis ban di
    // aspal, keduanya membesar-mengecil pelan seperti arus kendaraan.
    const traffic = this.ctx.createGain();
    traffic.gain.value = 0.75;
    this.lfo(0.045, 0.2, traffic.gain);
    this.loop(this.brown).connect(this.filter("lowpass", 240)).connect(traffic);
    const tyres = this.ctx.createGain();
    tyres.gain.value = 0.05;
    this.loop(this.white).connect(this.filter("bandpass", 900, 0.6)).connect(tyres).connect(traffic);
    traffic.connect(this.gains.city);

    // Klotok: mesin satu silinder yang berdentum ±4 kali per detik di air,
    // sesekali menjauh lalu mendekat.
    const engine = this.ctx.createOscillator();
    engine.type = "sawtooth";
    engine.frequency.value = 52;
    const thump = this.ctx.createGain();
    thump.gain.value = 0.5;
    const beat = this.ctx.createOscillator();
    beat.type = "square";
    beat.frequency.value = 4.2;
    const beatDepth = this.ctx.createGain();
    beatDepth.gain.value = 0.5;
    beat.connect(beatDepth).connect(thump.gain);
    beat.start();
    const distance = this.ctx.createGain();
    distance.gain.value = 0.6;
    this.lfo(0.025, 0.4, distance.gain);
    engine.connect(this.filter("lowpass", 190)).connect(thump).connect(distance).connect(this.gains.boat);
    engine.start();
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

  /**
   * Motor lewat di jalan tepi sungai: dengung mesin yang mendekat lalu
   * menjauh, nadanya turun sedikit saat lewat (efek Doppler) dan bergeser
   * dari satu telinga ke telinga lain.
   */
  private passBy(at: number, strength: number) {
    const length = 2.6 + Math.random() * 2.4;
    const f0 = 85 + Math.random() * 70;
    const fromLeft = Math.random() < 0.5;
    const out = this.ctx.createGain();
    out.gain.setValueAtTime(0.0001, at);
    out.gain.exponentialRampToValueAtTime(0.03 * strength * (0.5 + Math.random() * 0.6), at + length * 0.5);
    out.gain.exponentialRampToValueAtTime(0.0001, at + length);
    const pan = this.ctx.createStereoPanner();
    pan.pan.setValueAtTime(fromLeft ? -0.85 : 0.85, at);
    pan.pan.linearRampToValueAtTime(fromLeft ? 0.85 : -0.85, at + length);
    const lp = this.filter("lowpass", 700 + Math.random() * 500);
    for (const mult of [1, 2.02]) {
      const osc = this.ctx.createOscillator();
      osc.type = mult === 1 ? "sawtooth" : "square";
      osc.frequency.setValueAtTime(f0 * mult * 1.05, at);
      osc.frequency.linearRampToValueAtTime(f0 * mult * 0.93, at + length);
      const g = this.ctx.createGain();
      g.gain.value = mult === 1 ? 1 : 0.25;
      osc.connect(g).connect(lp);
      osc.start(at);
      osc.stop(at + length + 0.05);
    }
    lp.connect(out).connect(pan).connect(this.master);
  }

  /** Klakson di kejauhan: satu atau dua bunyi pendek bernada ganda. */
  private horn(at: number) {
    const beeps = Math.random() < 0.35 ? 2 : 1;
    const base = 380 + Math.random() * 120;
    const lp = this.filter("lowpass", 1600);
    const pan = this.ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.6 - 0.8;
    lp.connect(pan).connect(this.master);
    for (let b = 0; b < beeps; b++) {
      const t = at + b * 0.28;
      const len = 0.14 + Math.random() * 0.22;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.012, t + 0.015);
      g.gain.setValueAtTime(0.012, t + len);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.05);
      g.connect(lp);
      for (const f of [base, base * 1.26]) {
        const osc = this.ctx.createOscillator();
        osc.type = "square";
        osc.frequency.value = f;
        osc.connect(g);
        osc.start(t);
        osc.stop(t + len + 0.08);
      }
    }
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
    if (this.disposed) return;
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
    const city = m.city ?? 0;
    if (Math.random() < perTick(passByRate(city))) this.passBy(soon(), city);
    if (Math.random() < perTick(hornRate(city))) this.horn(soon());
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
    if (this.ctx.state === "running" || this.gestureResume) return;
    this.gestureResume = () => {
      this.removeGestureResume();
      if (!this.disposed) this.ctx.resume().catch(() => {});
    };
    document.addEventListener("pointerdown", this.gestureResume);
    document.addEventListener("keydown", this.gestureResume);
  }

  /**
   * Lepas pendengar sentuhan pertama. Wajib saat dibuang: tanpa ini,
   * sentuhan di modul berikutnya mencoba melanjutkan konteks yang sudah
   * ditutup ("Cannot resume a closed AudioContext").
   */
  private removeGestureResume() {
    if (!this.gestureResume) return;
    document.removeEventListener("pointerdown", this.gestureResume);
    document.removeEventListener("keydown", this.gestureResume);
    this.gestureResume = null;
  }

  /** Mulai (atau lanjutkan) suara dengan memudar masuk. */
  async start() {
    if (this.disposed) return;
    this.resumeOnGesture();
    try {
      await this.ctx.resume();
    } catch {
      return;
    }
    // Bisa saja dibuang selagi menunggu resume (pembaca pindah modul).
    if (this.disposed) return;
    const now = this.ctx.currentTime;
    this.playing = true;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(this.ducked ? LEVEL.ducked : LEVEL.normal, now, 0.6);
    if (this.timer === null) this.timer = window.setInterval(this.tick, TICK_MS);
  }

  /** Hentikan suara dengan memudar keluar. */
  stop() {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    this.playing = false;
    if (this.disposed) return;
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
  }

  /** Redam suara alam selama narator bicara, lalu kembalikan perlahan. */
  setDucked(ducked: boolean) {
    this.ducked = ducked;
    if (this.disposed || !this.playing) return;
    this.master.gain.setTargetAtTime(ducked ? LEVEL.ducked : LEVEL.normal, this.ctx.currentTime, ducked ? 0.25 : 1.2);
  }

  /** Setel takaran tiap lapisan (0–1); perubahannya dihaluskan. */
  setMix(mix: AmbientMix) {
    if (this.disposed) return;
    this.mix = mix;
    const now = this.ctx.currentTime;
    for (const key of Object.keys(PEAK) as (keyof typeof PEAK)[]) {
      this.gains[key].gain.setTargetAtTime(PEAK[key] * (mix[key] ?? 0), now, SMOOTH_S);
    }
  }

  /** Buang mesin; aman dipanggil lebih dari sekali. */
  dispose() {
    if (this.disposed) return;
    this.stop();
    this.removeGestureResume();
    this.disposed = true;
    this.ctx.close().catch(() => {});
  }
}
