"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { HERO_LOOPS, introScale, LINE_BOX, loopPath } from "@/lib/heroLines";

gsap.registerPlugin(useGSAP);

/** Lintasan dihitung sekali saja; bentuknya tidak pernah berubah. */
const PATHS = HERO_LOOPS.map((spec) => ({ d: loopPath(spec), width: spec.width, opacity: spec.opacity }));

const C = LINE_BOX / 2;
const transformFor = (sx: number, sy: number) => `translate(${C} ${C}) scale(${sx} ${sy}) translate(${-C} ${-C})`;

type Props = {
  /** Garis putih (di atas video) atau abu-abu gelap (di atas latar polos). */
  light: boolean;
};

/**
 * Garis lingkaran goresan tangan. Saat halaman dimuat, garis tampil sebagai
 * lingkaran kecil di tengah lalu melebar ke tepi layar, seperti paru-paru
 * yang mengembang. Setelah itu garis diam, jadi tidak ada kerja gambar
 * ulang selama video berputar di belakangnya (masker pemudar tepi hanya
 * digambar ulang selama animasi pembuka yang singkat itu).
 *
 * Skala diubah pada atribut `transform` milik <g> (bukan CSS transform)
 * supaya `vector-effect: non-scaling-stroke` menjaga garis tetap setipis
 * rambut sepanjang animasi.
 */
export default function HeroLines({ light }: Props) {
  const groupRef = useRef<SVGGElement>(null);

  useGSAP(() => {
    const g = groupRef.current;
    if (!g) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      g.setAttribute("transform", transformFor(1, 1));
      return;
    }
    const start = introScale(window.innerWidth, window.innerHeight);
    const s = { ...start };
    g.setAttribute("transform", transformFor(s.sx, s.sy));
    gsap.to(s, {
      sx: 1,
      sy: 1,
      delay: 0.5,
      duration: 1.9,
      ease: "power3.inOut",
      onUpdate: () => g.setAttribute("transform", transformFor(s.sx, s.sy)),
    });
  });

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${LINE_BOX} ${LINE_BOX}`}
      preserveAspectRatio="none"
      className={`pointer-events-none absolute inset-0 z-20 h-full w-full transition-colors duration-[1500ms] ${
        light ? "text-white" : "text-[#3a3936]"
      }`}
    >
      {/* Tepi atas dan bawah layar dipudarkan, jadi yang tampak hanya lengkungan di kiri-kanan. */}
      <defs>
        <linearGradient id="hero-line-fade" x1="0" y1="0" x2="0" y2={LINE_BOX} gradientUnits="userSpaceOnUse">
          <stop offset="0.04" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.24" stopColor="#fff" />
          <stop offset="0.76" stopColor="#fff" />
          <stop offset="0.96" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="hero-line-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={LINE_BOX} height={LINE_BOX}>
          <rect width={LINE_BOX} height={LINE_BOX} fill="url(#hero-line-fade)" />
        </mask>
      </defs>
      <g mask="url(#hero-line-mask)">
        {/* Skala awal yang sama dengan animasi, agar tidak berkedip sebelum skrip berjalan. */}
        <g ref={groupRef} transform={transformFor(0.4, 0.5)} fill="none" stroke="currentColor">
          {PATHS.map((p, i) => (
            <path key={i} d={p.d} strokeWidth={p.width} strokeOpacity={p.opacity} vectorEffect="non-scaling-stroke" />
          ))}
        </g>
      </g>
    </svg>
  );
}
