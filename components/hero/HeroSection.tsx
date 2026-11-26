"use client";

import { useState } from "react";
import Link from "next/link";
import { HERO_POSTER, HERO_VIDEOS } from "@/config/assets";
import { EYEBROW, HEADING, HERO_ACTIONS, PARAGRAPH_LEFT, PARAGRAPH_RIGHT } from "@/config/hero-content";
import EyebrowRotator from "./EyebrowRotator";
import HeroLines from "./HeroLines";
import HeroVideo from "./HeroVideo";

/** Video muncul setelah garis selesai melebar (lihat HeroLines: jeda 0,5 s + 1,9 s). */
const VIDEO_REVEAL_MS = 2100;

/**
 * Hero layar penuh beranda.
 * Urutan lapisan (z-index): latar gradasi → video (0) → peredup (10) →
 * garis lingkaran (20) → teks dan tombol (50). Navigasi ada di atas semuanya.
 *
 * Tanpa video, hero memakai latar abu-abu bergradasi dan garis gelap.
 * Begitu video tampil, garis berubah putih dan peredup menjaga teks tetap terbaca.
 */
export default function HeroSection() {
  const hasVideo = HERO_VIDEOS.length > 0;
  const [videoShown, setVideoShown] = useState(false);

  return (
    <section
      id="beranda"
      className="relative h-[100dvh] w-full overflow-clip bg-gradient-to-b from-[#6c6b67] to-[#b3b2ac]"
    >
      {hasVideo && (
        <>
          <HeroVideo
            sources={HERO_VIDEOS}
            poster={HERO_POSTER}
            revealDelayMs={VIDEO_REVEAL_MS}
            onShown={() => setVideoShown(true)}
          />
          {/* Peredup tipis agar teks putih tetap terbaca di atas video yang terang. */}
          <div
            aria-hidden
            className={`absolute inset-0 z-10 bg-black/35 transition-opacity duration-[900ms] ${
              videoShown ? "opacity-100" : "opacity-0"
            }`}
          />
        </>
      )}

      <HeroLines light={videoShown} />

      {/* Label, judul, dan tombol di tengah layar */}
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center px-5 pb-[6vh] text-center">
        <div className="hero-anim hero-fade" style={{ animationDelay: "0.2s" }}>
          <EyebrowRotator prefix={EYEBROW.prefix} words={EYEBROW.words} />
        </div>

        <h1
          className="hero-anim hero-reveal mt-6 font-marcellus text-[clamp(2.1rem,4.3vw,3.9rem)] uppercase leading-[0.95] text-[#f1f1f1]"
          style={{ letterSpacing: "-0.01em", animationDelay: "0.3s" }}
        >
          <span className="block">{HEADING.line1}</span>
          <span className="block">{HEADING.line2}</span>
        </h1>

        <div
          className="hero-anim hero-fade mt-6 flex w-full max-w-[380px] flex-col gap-2.5 sm:w-auto sm:max-w-none sm:flex-row"
          style={{ animationDelay: "0.5s" }}
        >
          <Link
            href={HERO_ACTIONS.primary.href}
            className="font-marcellus inline-flex h-[50px] items-center justify-center rounded-lg border border-[#f2efe9] bg-[#f2efe9] px-6 text-[13px] text-[#474747] transition-colors hover:bg-white sm:w-[180px]"
          >
            {HERO_ACTIONS.primary.label}
          </Link>
          <Link
            href={HERO_ACTIONS.secondary.href}
            className="font-marcellus inline-flex h-[50px] items-center justify-center rounded-lg border border-[#f2efe9]/65 px-6 text-[13px] text-[#f2efe9] transition-colors hover:border-[#f2efe9] hover:bg-white/10 sm:w-[188px]"
          >
            {HERO_ACTIONS.secondary.label}
          </Link>
        </div>
      </div>

      {/* Paragraf kiri bawah (disembunyikan di ponsel) */}
      <div
        className="hero-anim hero-fade absolute bottom-14 left-10 z-50 hidden max-w-[260px] sm:block md:left-14"
        style={{ animationDelay: "0.8s" }}
      >
        <p className="text-sm leading-relaxed text-white/85">{PARAGRAPH_LEFT}</p>
      </div>

      {/* Paragraf kanan bawah */}
      <div
        className="hero-anim hero-fade absolute bottom-8 left-5 right-5 z-50 sm:bottom-14 sm:left-auto sm:right-10 sm:max-w-[260px] md:right-14"
        style={{ animationDelay: "0.95s" }}
      >
        <p className="text-xs leading-relaxed text-white/85 sm:text-sm">{PARAGRAPH_RIGHT}</p>
      </div>
    </section>
  );
}
