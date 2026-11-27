"use client";

import { type RefObject, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

/** Panjang gulir selama hero tertahan, dalam kelipatan tinggi layar (acuan: ±3.500 px di laptop 900 px). */
const PIN_SCREENS = 4;

type Refs = {
  /** Pembungkus yang ditahan di layar selama urutan teks berjalan. */
  pin: RefObject<HTMLElement | null>;
  /** Judul, label, dan tombol hero yang pergi saat gulir dimulai. */
  hero: RefObject<HTMLElement | null>;
  /** Blok teks berurutan; blok terakhir tetap tampil di akhir. */
  blocks: RefObject<(HTMLElement | null)[]>;
};

/**
 * Urutan teks beranda yang digerakkan gulir.
 *
 * Hero ditahan di layar, lalu tiap blok teks dipecah per baris (SplitText).
 * Baris masuk dari kedalaman (kabur, sedikit miring ke belakang) menjadi
 * tajam, berhenti sebentar, lalu pergi ke atas sebelum blok berikutnya
 * masuk. Semua langkah mengikuti posisi gulir (scrub), jadi menggulir balik
 * memutar urutan mundur.
 *
 * Kabur hanya dipakai pada baris teks yang kecil, tidak pada lapisan layar
 * penuh, agar ringan di laptop menengah. Bila pengguna meminta gerak
 * dikurangi, baris hanya memudar tanpa kabur dan tanpa gerak 3D.
 */
export function useHeroScroll({ pin, hero, blocks }: Refs) {
  useEffect(() => {
    let ctx: gsap.Context | null = null;
    let lastWidth = window.innerWidth;
    let cancelled = false;

    const build = () => {
      ctx?.revert();
      ctx = gsap.context(() => {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const items = (blocks.current ?? []).filter((b): b is HTMLElement => !!b);

        // Setiap anak bertanda [data-split] dipecah per baris; anak lain
        // (mis. nama penulis kutipan) diperlakukan sebagai satu baris.
        const linesOf = items.map((block) =>
          Array.from(block.children).flatMap((child) =>
            child.hasAttribute("data-split")
              ? SplitText.create(child, { type: "lines", linesClass: "story-line" }).lines
              : [child],
          ),
        );

        const enterFrom = reduce
          ? { autoAlpha: 0 }
          : { autoAlpha: 0, yPercent: 50, z: -200, rotateX: 10, filter: "blur(12px)" };
        const enterTo = reduce
          ? { autoAlpha: 1 }
          : { autoAlpha: 1, yPercent: 0, z: 0, rotateX: 0, filter: "blur(0px)" };
        const leaveTo = reduce
          ? { autoAlpha: 0 }
          : { autoAlpha: 0, yPercent: -50, z: -300, rotateX: -12, filter: "blur(8px)" };

        gsap.set(items, { autoAlpha: 1 });
        linesOf.forEach((lines) => gsap.set(lines, enterFrom));

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: pin.current,
            pin: pin.current,
            start: "top top",
            end: () => `+=${Math.round(window.innerHeight * PIN_SCREENS)}`,
            scrub: true,
            invalidateOnRefresh: true,
          },
        });

        // Judul hero pergi lebih dulu.
        tl.to(hero.current, {
          autoAlpha: 0,
          y: -40,
          ...(reduce ? {} : { filter: "blur(8px)" }),
          duration: 1,
          ease: "power2.in",
        });

        linesOf.forEach((lines, i) => {
          tl.to(lines, { ...enterTo, duration: 2, stagger: 0.08, ease: "power3.out" }, i === 0 ? ">-0.2" : ">0.1");
          // Blok terakhir tetap tampil sampai hero dilepas.
          if (i < linesOf.length - 1) {
            tl.to(lines, { ...leaveTo, duration: 2, stagger: 0.08, ease: "power3.in" }, ">0.6");
          }
        });
        // Jeda baca paragraf terakhir sebelum layar dilepas.
        tl.to({}, { duration: 1.5 });
      });
    };

    // Pecah baris setelah huruf termuat, supaya baris tidak berubah sesudahnya.
    document.fonts.ready.then(() => {
      if (!cancelled) build();
    });

    // Lebar layar berubah → baris berubah → pecah ulang. Perubahan tinggi saja
    // (bilah alamat ponsel) cukup ditangani ScrollTrigger.
    let timer = 0;
    const onResize = () => {
      if (window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      window.clearTimeout(timer);
      timer = window.setTimeout(build, 200);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
      ctx?.revert();
    };
  }, [pin, hero, blocks]);
}
