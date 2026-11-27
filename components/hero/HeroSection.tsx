"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { HERO_POSTER, HERO_VIDEOS } from "@/config/assets";
import { EYEBROW, FACTOR_WHEEL, HEADING, HERO_ACTIONS, SCROLL_STORY } from "@/config/hero-content";
import EyebrowRotator from "./EyebrowRotator";
import FactorWheel from "./FactorWheel";
import HeroLines from "./HeroLines";
import HeroVideo from "./HeroVideo";
import { useHeroScroll } from "./useHeroScroll";

/** Video muncul setelah garis selesai melebar (lihat HeroLines: jeda 0,5 s + 1,9 s). */
const VIDEO_REVEAL_MS = 2100;

/**
 * Hero layar penuh beranda.
 * Urutan lapisan (z-index): latar gradasi → video (0) → peredup (10) →
 * garis lingkaran (20) → label, judul, dan tombol (50). Navigasi ada di atas semuanya.
 *
 * Tanpa video, hero memakai latar abu-abu bergradasi dan garis gelap.
 * Begitu video tampil, garis berubah putih dan peredup menjaga teks tetap terbaca.
 *
 * Saat digulir, hero ditahan di layar (useHeroScroll): judul pergi, lalu
 * kalimat pembuka, kutipan, dan satu paragraf bergantian muncul di tengah
 * garis lingkaran, disusul roda faktor yang diperbesar ke satu faktor.
 * Teksnya diatur di config/hero-content.ts (SCROLL_STORY, FACTOR_WHEEL).
 */
export default function HeroSection() {
  const hasVideo = HERO_VIDEOS.length > 0;
  const [videoShown, setVideoShown] = useState(false);
  const pinRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const blocksRef = useRef<(HTMLElement | null)[]>([]);
  const wheelRef = useRef<HTMLDivElement>(null);
  const wheelCenterRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<(HTMLDivElement | null)[]>([]);
  const coverRef = useRef<HTMLDivElement>(null);
  const coverTitleRef = useRef<HTMLHeadingElement>(null);
  // Objek stabil supaya urutan gulir tidak dibangun ulang tiap render.
  const wheel = useMemo(
    () => ({
      root: wheelRef,
      center: wheelCenterRef,
      markers: markersRef,
      focusIndex: Math.max(0, FACTOR_WHEEL.factors.indexOf(FACTOR_WHEEL.focus)),
      cover: coverRef,
      coverTitle: coverTitleRef,
    }),
    [],
  );
  useHeroScroll({ pin: pinRef, hero: heroRef, blocks: blocksRef, wheel });

  return (
    // Pembungkus yang ditahan; transform pembuka (#beranda) tetap di section.
    <div ref={pinRef}>
      <section
        id="beranda"
        className="section-backdrop relative h-[100dvh] w-full overflow-clip"
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
        <div
          ref={heroRef}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center px-5 pb-[4vh] text-center"
        >
          <div className="hero-anim hero-fade" style={{ animationDelay: "0.2s" }}>
            <EyebrowRotator prefix={EYEBROW.prefix} words={EYEBROW.words} />
          </div>

          <h1
            className="hero-anim hero-reveal type-display mt-5 text-[#f1f1f1]"
            style={{ animationDelay: "0.3s" }}
          >
            <span className="block">{HEADING.line1}</span>
            <span className="block">{HEADING.line2}</span>
          </h1>

          <div
            className="hero-anim hero-fade mt-7 flex w-full max-w-[320px] flex-col gap-2.5 sm:w-auto sm:max-w-none sm:flex-row"
            style={{ animationDelay: "0.5s" }}
          >
            <Link
              href={HERO_ACTIONS.primary.href}
              className="btn-cream sm:w-[164px]"
            >
              {HERO_ACTIONS.primary.label}
            </Link>
            <Link
              href={HERO_ACTIONS.secondary.href}
              className="btn-line sm:w-[164px]"
            >
              {HERO_ACTIONS.secondary.label}
            </Link>
          </div>
        </div>

        {/* Urutan teks gulir: tersembunyi sampai digerakkan useHeroScroll. */}
        <div
          aria-label="Pengantar"
          className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center px-5 text-center text-[#f1f1f1] [perspective:900px]"
        >
          <div ref={(el) => { blocksRef.current[0] = el; }} className="story-block absolute">
            <h2 data-split className="story-opening font-marcellus">
              {SCROLL_STORY.opening}
            </h2>
          </div>
          <figure ref={(el) => { blocksRef.current[1] = el; }} className="story-block absolute">
            <blockquote data-split className="story-quote font-marcellus">
              “{SCROLL_STORY.quote.text}”
            </blockquote>
            <figcaption className="story-author font-marcellus">
              {SCROLL_STORY.quote.author}
            </figcaption>
          </figure>
          <div ref={(el) => { blocksRef.current[2] = el; }} className="story-block absolute">
            <p data-split className="story-paragraph font-marcellus">
              {SCROLL_STORY.paragraph}
            </p>
          </div>

          <FactorWheel
            center={FACTOR_WHEEL.center}
            factors={FACTOR_WHEEL.factors}
            rootRef={wheelRef}
            centerRef={wheelCenterRef}
            markerRefs={markersRef}
          />
        </div>

        {/* Layar krem hasil pembesaran faktor: jembatan ke bagian berikutnya
            (rancangannya belum ditentukan pengguna). */}
        <div aria-hidden className="factor-cover pointer-events-none absolute left-1/2 top-1/2 z-[45]" ref={coverRef} />
        <div className="pointer-events-none absolute inset-0 z-[46] flex items-center justify-center">
          <h2 ref={coverTitleRef} className="factor-cover-title font-marcellus">
            {FACTOR_WHEEL.focus}
          </h2>
        </div>
      </section>
    </div>
  );
}
