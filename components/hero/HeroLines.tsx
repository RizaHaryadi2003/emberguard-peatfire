"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { HERO_LOOPS, introScale, LINE_BOX, lineSpan, loopPoints, traceLoop } from "@/lib/heroLines";
import { afterIntro } from "@/lib/introGate";

/** Warna garis: abu-abu gelap di atas latar polos, putih di atas video. */
const DARK: [number, number, number] = [58, 57, 54];
const LIGHT: [number, number, number] = [255, 255, 255];
/** Lama perpindahan warna garis (detik). */
const COLOR_S = 1.5;
/** Ketajaman kanvas dibatasi agar layar beresolusi tinggi tidak terbebani. */
const MAX_DPR = 1.5;
/** Setelah pembuka, gerak putar pelan cukup digambar ±30 kali per detik. */
const IDLE_FRAME_MS = 1000 / 30;

type Props = {
  /** Garis putih (di atas video) atau abu-abu gelap (di atas latar polos). */
  light: boolean;
};

/**
 * Garis lingkaran goresan tangan, digambar di satu kanvas.
 *
 * - Pembuka: garis tampil sebagai lingkaran kecil di tengah lalu melebar ke
 *   tepi layar, seperti paru-paru yang mengembang.
 * - Sesudahnya: gelombang di tepi keempat garis terus bergeser searah jarum
 *   jam dengan laju berbeda, jadi garis tampak hidup dan saling bersilangan.
 *
 * Kanvas dipilih karena menggambar ulang empat garis per bingkai sangat
 * murah, sedangkan SVG layar penuh yang berubah tiap bingkai harus dihitung
 * ulang. Tepi atas-bawah dipudarkan dengan gradasi warna garis itu sendiri,
 * bukan masker, jadi tidak ada lapisan tambahan di atas video.
 */
export default function HeroLines({ light }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lightRef = useRef(light);
  useEffect(() => {
    lightRef.current = light;
  }, [light]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    };
    resize();

    // Skala pembuka (lihat introScale) → 1. Bila pembuka situs sedang tayang,
    // garis baru mulai melebar sesudah pembuka selesai.
    const scale = reduced ? { sx: 1, sy: 1 } : introScale(w, h);
    const intro = reduced ? null : gsap.to(scale, { sx: 1, sy: 1, delay: 0.5, duration: 1.9, ease: "power3.inOut", paused: true });
    const cancelWait = afterIntro(() => intro?.play());

    // Campuran warna 0 (gelap) → 1 (putih), mendekati sasaran secara bertahap.
    let mix = lightRef.current ? 1 : 0;

    const draw = (time: number, dt: number) => {
      const target = lightRef.current ? 1 : 0;
      mix += Math.sign(target - mix) * Math.min(Math.abs(target - mix), dt / COLOR_S);
      const rgb = DARK.map((c, i) => Math.round(c + (LIGHT[i] - c) * mix)).join(",");

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Gradasi tegak: ujung atas dan bawah oval dipudarkan (4–24 % dan 76–96 %),
      // jadi garis terputus di atas-bawah dan hanya lengkungan kiri-kanan yang tampak.
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0.04, `rgba(${rgb},0)`);
      grad.addColorStop(0.24, `rgba(${rgb},1)`);
      grad.addColorStop(0.76, `rgba(${rgb},1)`);
      grad.addColorStop(0.96, `rgba(${rgb},0)`);
      ctx.strokeStyle = grad;

      const span = lineSpan(w, h);
      const kx = (span.x / LINE_BOX) * scale.sx;
      const ky = (span.y / LINE_BOX) * scale.sy;
      for (const spec of HERO_LOOPS) {
        const pts = loopPoints(spec, time).map(
          ([x, y]) => [w / 2 + (x - LINE_BOX / 2) * kx, h / 2 + (y - LINE_BOX / 2) * ky] as [number, number],
        );
        ctx.beginPath();
        traceLoop(ctx, pts);
        ctx.globalAlpha = spec.opacity;
        ctx.lineWidth = spec.width;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    let raf = 0;
    let last = 0;
    let lastDraw = 0;
    const start = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      // Selama garis melebar gambar tiap bingkai; selain itu cukup ±30 bingkai per detik.
      const expanding = intro?.isActive() ?? false;
      if (!expanding && now - lastDraw < IDLE_FRAME_MS) return;
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;
      lastDraw = now;
      draw((now - start) / 1000, dt);
    };

    const onResize = () => {
      resize();
      // Gerak dikurangi: tidak ada putaran, jadi gambar ulang sekali di sini.
      if (reduced) draw(0, COLOR_S);
    };
    window.addEventListener("resize", onResize);

    if (reduced) draw(0, COLOR_S);
    else raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      cancelWait();
      intro?.kill();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // Gerak dikurangi: warna baru digambar ulang lewat penangan resize di atas.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) window.dispatchEvent(new Event("resize"));
  }, [light]);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 z-20 h-full w-full" />;
}
