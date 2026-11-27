"use client";

import { type RefObject, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

/**
 * Panjang gulir per satuan waktu linimasa, dalam kelipatan tinggi layar.
 * Bagian teks (±14 satuan) menghabiskan ±4 tinggi layar, sebanding dengan
 * acuan (±3.500 px di laptop 900 px).
 */
const SCREENS_PER_UNIT = 0.28;
/** Pembesaran roda saat masuk ke faktor pilihan. */
const FOCUS_SCALE = 5;

type Refs = {
  /** Pembungkus yang ditahan di layar selama urutan teks berjalan. */
  pin: RefObject<HTMLElement | null>;
  /** Judul, label, dan tombol hero yang pergi saat gulir dimulai. */
  hero: RefObject<HTMLElement | null>;
  /** Blok teks berurutan, masing-masing masuk lalu pergi. */
  blocks: RefObject<(HTMLElement | null)[]>;
  /** Roda faktor yang muncul sesudah teks, lalu diperbesar ke satu faktor (objek stabil, mis. useMemo). */
  wheel: {
    root: RefObject<HTMLElement | null>;
    center: RefObject<HTMLElement | null>;
    markers: RefObject<(HTMLElement | null)[]>;
    /** Urutan faktor yang diperbesar. */
    focusIndex: number;
    /** Lingkaran krem yang melebar dari titik faktor hingga menutup layar. */
    cover: RefObject<HTMLElement | null>;
    /** Judul faktor di atas lingkaran krem (jembatan ke bagian berikutnya). */
    coverTitle: RefObject<HTMLElement | null>;
  };
};

/**
 * Urutan teks beranda yang digerakkan gulir.
 *
 * Hero ditahan di layar, lalu tiap blok teks dipecah per baris (SplitText).
 * Baris masuk dari kedalaman (kabur, sedikit miring ke belakang) menjadi
 * tajam, berhenti sebentar, lalu pergi ke atas sebelum blok berikutnya
 * masuk. Sesudah teks, roda faktor muncul: lingkaran dan judul tengah lebih
 * dulu, lalu titik faktor berpasangan. Gulir berikutnya memperbesar roda ke
 * satu faktor, dan titiknya melebar menjadi layar krem penuh.
 * Semua langkah mengikuti posisi gulir (scrub), jadi menggulir balik
 * memutar urutan mundur.
 *
 * Kabur hanya dipakai pada baris teks yang kecil, tidak pada lapisan layar
 * penuh, agar ringan di laptop menengah. Bila pengguna meminta gerak
 * dikurangi, baris hanya memudar tanpa kabur dan tanpa gerak 3D.
 */
export function useHeroScroll({ pin, hero, blocks, wheel }: Refs) {
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
            end: () => `+=${Math.round(tl.duration() * window.innerHeight * SCREENS_PER_UNIT)}`,
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
          // Paragraf terakhir diberi jeda baca lebih lama.
          const hold = i === linesOf.length - 1 ? ">1.2" : ">0.6";
          tl.to(lines, { ...leaveTo, duration: 2, stagger: 0.08, ease: "power3.in" }, hold);
        });

        addWheel(tl, wheel, reduce);
        // Jeda di layar krem sebelum hero dilepas.
        tl.to({}, { duration: 1 });
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
  }, [pin, hero, blocks, wheel]);
}

/** Langkah roda faktor: muncul, titik berpasangan, lalu diperbesar ke satu faktor. */
function addWheel(tl: gsap.core.Timeline, wheel: Refs["wheel"], reduce: boolean) {
  const root = wheel.root.current;
  const cover = wheel.cover.current;
  const markers = (wheel.markers.current ?? []).filter((m): m is HTMLElement => !!m);
  const focus = markers[wheel.focusIndex];
  if (!root || !cover || !focus) return;

  const ring = root.querySelector(".factor-ring");
  const labels = markers.map((m) => m.querySelector(".factor-label"));
  const others = markers.filter((m) => m !== focus);
  const count = markers.length;
  const angle = -Math.PI / 2 + (2 * Math.PI * wheel.focusIndex) / count;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  gsap.set(root, { autoAlpha: 0, scale: 0.92 });
  gsap.set(markers, { autoAlpha: 0, scale: 0.85 });
  gsap.set(cover, { xPercent: -50, yPercent: -50, autoAlpha: 0 });
  gsap.set(wheel.coverTitle.current, { autoAlpha: 0, y: 16 });

  // Roda muncul, lalu titik faktor berpasangan (seperti acuan).
  tl.to(root, { autoAlpha: 1, scale: 1, duration: 0.8, ease: "power2.out" }, ">-0.4");
  for (let i = 0; i < count; i += 2) {
    tl.to(markers.slice(i, i + 2), { autoAlpha: 1, scale: 1, duration: 0.5, stagger: 0.12, ease: "power2.out" }, i === 0 ? "+=0.2" : ">0.35");
  }
  tl.to({}, { duration: 1.2 });

  // Masuk ke faktor pilihan: yang lain memudar, roda diperbesar dengan titik
  // pilihan sebagai poros sambil digeser ke tengah layar.
  tl.to([ring, wheel.center.current, ...others, ...labels], { autoAlpha: 0, duration: 0.8, ease: "power1.in" });
  tl.to(
    root,
    {
      transformOrigin: `${50 + cos * 50}% ${50 + sin * 50}%`,
      x: () => -cos * (root.offsetWidth / 2),
      y: () => -sin * (root.offsetHeight / 2),
      scale: FOCUS_SCALE,
      duration: 2,
      ease: "power2.inOut",
    },
    "<0.2",
  );

  // Titik melebar menjadi layar krem penuh: lingkaran krem mulai seukuran
  // titik yang sudah diperbesar, lalu tumbuh ke ukuran aslinya.
  const dot = () => (focus.querySelector(".factor-dot") as HTMLElement | null)?.offsetWidth ?? 24;
  tl.fromTo(
    cover,
    { autoAlpha: 1, scale: () => (dot() * FOCUS_SCALE) / cover.offsetWidth },
    { autoAlpha: 1, scale: 1, duration: reduce ? 0.8 : 1.6, ease: "power2.in", immediateRender: false },
  );
  tl.to(wheel.coverTitle.current, { autoAlpha: 1, y: 0, duration: 0.8, ease: "power2.out" }, ">-0.2");
}
