// Suara suasana yang disintesis langsung di peramban (Web Audio API), tanpa
// berkas audio: angin, riak air, kicau burung, serta derak bara dan gemuruh
// api yang makin kuat seiring tingkat bahaya kebakaran.

/** Derau acak berdurasi `seconds`, disaring agar lebih "coklat" (dalam). */
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

/** Jumlah derak bara per detik untuk tingkat bahaya 0–1. */
export function crackleRate(danger: number): number {
  return danger <= 0 ? 0 : 2 + danger * 26;
}

/** Peluang kicau burung per detik; burung diam saat asap mulai tebal. */
export function birdChance(danger: number): number {
  return Math.max(0, 0.45 * (1 - danger / 0.35));
}

export class AmbientSound {
  private ctx: AudioContext;
  private master: GainNode;
  private windGain: GainNode;
  private roarGain: GainNode;
  private brown: AudioBuffer;
  private white: AudioBuffer;
  private timer: number | null = null;
  private danger = 0;

  constructor() {
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ctx.destination);
    this.brown = createNoiseBuffer(this.ctx, 6, true);
    this.white = createNoiseBuffer(this.ctx, 2, false);

    // Angin: derau coklat bersaring lolos-rendah yang frekuensinya diayun pelan.
    const wind = this.loop(this.brown);
    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = "lowpass";
    windFilter.frequency.value = 420;
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 220;
    lfo.connect(lfoGain).connect(windFilter.frequency);
    lfo.start();
    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0.5;
    wind.connect(windFilter).connect(this.windGain).connect(this.master);

    // Riak air: derau pita-sempit yang lembut.
    const water = this.loop(this.white);
    const waterFilter = this.ctx.createBiquadFilter();
    waterFilter.type = "bandpass";
    waterFilter.frequency.value = 700;
    waterFilter.Q.value = 0.8;
    const waterGain = this.ctx.createGain();
    waterGain.gain.value = 0.018;
    water.connect(waterFilter).connect(waterGain).connect(this.master);

    // Gemuruh api: derau coklat sangat rendah, hanya terdengar saat bahaya.
    const roar = this.loop(this.brown);
    const roarFilter = this.ctx.createBiquadFilter();
    roarFilter.type = "lowpass";
    roarFilter.frequency.value = 160;
    this.roarGain = this.ctx.createGain();
    this.roarGain.gain.value = 0;
    roar.connect(roarFilter).connect(this.roarGain).connect(this.master);
  }

  private loop(buffer: AudioBuffer): AudioBufferSourceNode {
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.start(0, Math.random() * buffer.duration);
    return src;
  }

  /** Satu derak bara: letupan derau sangat pendek bernada tinggi. */
  private crackle(at: number) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.white;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 1200 + Math.random() * 2500;
    const gain = this.ctx.createGain();
    const peak = (0.05 + Math.random() * 0.2) * (0.4 + this.danger);
    gain.gain.setValueAtTime(peak, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.01 + Math.random() * 0.03);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(at, Math.random() * 1.5, 0.05);
  }

  /** Satu kicau burung: beberapa nada pendek yang naik-turun cepat. */
  private chirp(at: number) {
    const notes = 2 + Math.floor(Math.random() * 3);
    const base = 2600 + Math.random() * 1600;
    for (let n = 0; n < notes; n++) {
      const t = at + n * (0.09 + Math.random() * 0.05);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(base, t);
      osc.frequency.exponentialRampToValueAtTime(base * (1.25 + Math.random() * 0.3), t + 0.06);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.03, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      osc.connect(gain).connect(this.master);
      osc.start(t);
      osc.stop(t + 0.1);
    }
  }

  /** Mulai (atau lanjutkan) suara dengan memudar masuk. */
  async start() {
    await this.ctx.resume();
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(0.9, now, 0.6);
    if (this.timer !== null) return;
    // Penjadwal ringan: tiap 100 ms memutuskan apakah ada derak/kicau baru.
    this.timer = window.setInterval(() => {
      const now2 = this.ctx.currentTime;
      const cracks = crackleRate(this.danger) * 0.1;
      for (let i = 0; i < Math.floor(cracks) + (Math.random() < cracks % 1 ? 1 : 0); i++) {
        this.crackle(now2 + Math.random() * 0.1);
      }
      if (Math.random() < birdChance(this.danger) * 0.1) this.chirp(now2 + Math.random() * 0.1);
    }, 100);
  }

  /** Hentikan suara dengan memudar keluar. */
  stop() {
    const now = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(0, now, 0.3);
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Perbarui tingkat bahaya 0–1: angin makin kencang, gemuruh & derak api muncul. */
  setDanger(danger: number) {
    this.danger = Math.min(1, Math.max(0, danger));
    const now = this.ctx.currentTime;
    this.roarGain.gain.setTargetAtTime(this.danger * 0.9, now, 0.4);
    this.windGain.gain.setTargetAtTime(0.5 + this.danger * 0.3, now, 0.4);
  }

  dispose() {
    this.stop();
    void this.ctx.close();
  }
}
