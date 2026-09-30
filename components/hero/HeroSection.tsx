"use client";

import { BG_IMAGE_1, BG_IMAGE_2 } from "@/config/assets";
import { HEADING, PARAGRAPH_LEFT, PARAGRAPH_RIGHT } from "@/config/hero-content";
import { useSmoothCursor } from "@/hooks/useSmoothCursor";
import RevealLayer from "./RevealLayer";

/**
 * Hero layar penuh bertema gelap.
 * Urutan lapisan (z-index): gambar dasar (10) → gambar tersingkap (30) → teks (50) → navigasi (100).
 */
export default function HeroSection() {
  const cursorPos = useSmoothCursor();

  return (
    <div
      className="tracking-[-0.02em]"
      style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
    >
      <section
        id="beranda"
        className="relative w-full overflow-hidden h-screen bg-black"
        style={{ height: "100dvh" }}
      >
        {/* Lapisan 1 — gambar dasar dengan zoom-out perlahan saat dimuat (tampil bila asetnya diisi) */}
        {BG_IMAGE_1 && (
          <div
            className="absolute inset-0 bg-center bg-cover bg-no-repeat z-10 hero-zoom"
            style={{ backgroundImage: `url(${BG_IMAGE_1})` }}
          />
        )}

        {/* Lapisan 2 — gambar kedua yang tersingkap mengikuti kursor (tampil bila asetnya diisi) */}
        {BG_IMAGE_2 && (
          <RevealLayer image={BG_IMAGE_2} cursorX={cursorPos.x} cursorY={cursorPos.y} />
        )}

        {/* Lapisan 3 — judul utama */}
        <div className="absolute top-[14%] left-0 right-0 z-50 flex flex-col items-center text-center px-5 pointer-events-none">
          <h1 className="text-white leading-[0.95]">
            <span
              className="block font-playfair italic font-normal text-5xl sm:text-7xl md:text-8xl hero-anim hero-reveal"
              style={{ letterSpacing: "-0.05em", animationDelay: "0.25s" }}
            >
              {HEADING.line1}
            </span>
            <span
              className="block font-normal text-5xl sm:text-7xl md:text-8xl -mt-1 hero-anim hero-reveal"
              style={{ letterSpacing: "-0.08em", animationDelay: "0.42s" }}
            >
              {HEADING.line2}
            </span>
          </h1>
        </div>

        {/* Lapisan 4 — paragraf kiri bawah (disembunyikan di seluler) */}
        <div
          className="hidden sm:block absolute bottom-14 left-10 md:left-14 max-w-[260px] z-50 hero-anim hero-fade"
          style={{ animationDelay: "0.7s" }}
        >
          <p className="text-sm text-white/80 leading-relaxed">{PARAGRAPH_LEFT}</p>
        </div>

        {/* Lapisan 5 — paragraf kanan bawah */}
        <div
          className="absolute bottom-10 sm:bottom-14 left-5 right-5 sm:left-auto sm:right-10 md:right-14 max-w-full sm:max-w-[260px] z-50 hero-anim hero-fade"
          style={{ animationDelay: "0.85s" }}
        >
          <p className="text-xs sm:text-sm text-white/80 leading-relaxed">{PARAGRAPH_RIGHT}</p>
        </div>
      </section>
    </div>
  );
}
