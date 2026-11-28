"use client";

import { type RefObject, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { factorPoint, factorProgress, squarePoint } from "@/lib/factorSquare";

gsap.registerPlugin(ScrollTrigger, SplitText);

/**
 * Panjang gulir per satuan waktu linimasa, dalam kelipatan tinggi layar.
 * Bagian teks pembuka (±14 satuan) menghabiskan ±4 tinggi layar, sebanding
 * dengan acuan (±3.500 px di laptop 900 px).
 */
const SCREENS_PER_UNIT = 0.28;
/** Pembesaran roda saat masuk ke faktor pilihan. */
const FOCUS_SCALE = 5;
/** Lebar akhir garis lingkaran kiri-kanan terhadap lebar awalnya. */
const LINES_SPREAD = 1.55;

export type WheelRefs = {
  root: RefObject<HTMLElement | null>;
  /** Lintasan persegi (pathLength = 1000) yang digambar searah jarum jam. */
  ring: RefObject<SVGPathElement | null>;
  markers: RefObject<(HTMLElement | null)[]>;
  /** Urutan faktor yang diperbesar. */
  focusIndex: number;
  /** Salinan logo navigasi yang turun menjadi titik awal lingkaran. */
  ghost: RefObject<HTMLElement | null>;
  /** Lingkaran krem yang melebar dari titik faktor hingga menutup layar. */
  cover: RefObject<HTMLElement | null>;
  /** Judul faktor di atas lingkaran krem (jembatan ke bagian berikutnya). */
  coverTitle: RefObject<HTMLElement | null>;
};

type Refs = {
  /** Pembungkus yang ditahan di layar selama urutan berjalan. */
  pin: RefObject<HTMLElement | null>;
  /** Judul, label, dan tombol hero yang pergi saat gulir dimulai. */
  hero: RefObject<HTMLElement | null>;
  /**
   * Blok teks berurutan, masing-masing masuk lalu pergi. Blok bertanda
   * `data-pace="short"` (kalimat jembatan) berganti lebih cepat.
   */
  blocks: RefObject<(HTMLElement | null)[]>;
  /** Roda faktor (objek stabil, mis. useMemo). */
  wheel: WheelRefs;
  /** Pengali lebar garis lingkaran kiri-kanan, dibaca HeroLines tiap bingkai. */
  spread: RefObject<number>;
};

/**
 * Urutan beranda yang digerakkan gulir.
 *
 * 1. Hero ditahan di layar; judulnya pergi. Sepanjang urutan, garis
 *    lingkaran kiri-kanan pelan-pelan melebar.
 * 2. Tiap blok teks dipecah per baris (SplitText). Baris masuk dari
 *    kedalaman (kabur, miring ke belakang) menjadi tajam, lalu pergi ke atas.
 * 3. Salinan logo bulat di navigasi turun ke tengah sisi atas persegi, lalu
 *    berjalan searah jarum jam sambil menggambar persegi faktor; titik dan
 *    nama faktor menyala saat logo melewatinya (lib/factorSquare.ts).
 * 4. Roda diperbesar ke satu faktor dan titiknya melebar menjadi layar krem.
 *
 * Semua langkah mengikuti posisi gulir (scrub), jadi menggulir balik
 * memutar urutan mundur. Kabur hanya dipakai pada baris teks yang kecil,
 * tidak pada lapisan layar penuh, agar ringan di laptop menengah. Bila
 * pengguna meminta gerak dikurangi, baris hanya memudar.
 */
export function useHeroScroll({ pin, hero, blocks, wheel, spread }: Refs) {
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
          const short = items[i].dataset.pace === "short";
          const move = short ? 1.5 : 2;
          const isParagraph = i === linesOf.length - 1 || items[i + 1]?.dataset.pace === "short";
          const hold = short ? ">0.35" : isParagraph ? ">1.2" : ">0.6";
          tl.to(lines, { ...enterTo, duration: move, stagger: 0.08, ease: "power3.out" }, i === 0 ? ">-0.2" : ">0.1");
          tl.to(lines, { ...leaveTo, duration: move, stagger: 0.08, ease: "power3.in" }, hold);
        });

        addWheel(tl, wheel, reduce);
        // Jeda di layar krem sebelum hero dilepas.
        tl.to({}, { duration: 1 });

        // Garis kiri-kanan melebar perlahan sepanjang seluruh urutan.
        if (!reduce) tl.fromTo(spread, { current: 1 }, { current: LINES_SPREAD, duration: tl.duration(), ease: "sine.inOut" }, 0);
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
  }, [pin, hero, blocks, wheel, spread]);
}

/** Lama turunnya logo dan lama menggambar persegi (satuan waktu linimasa). */
const DESCEND_UNITS = 2.2;
const DRAW_UNITS = 4.4;

/**
 * Langkah roda faktor: salinan logo navigasi turun ke tengah sisi atas, lalu
 * berjalan menyusuri persegi searah jarum jam sambil menggambar garisnya;
 * tiap titik faktor menyala saat logo melewatinya. Sesudah itu roda
 * diperbesar ke satu faktor.
 */
function addWheel(tl: gsap.core.Timeline, wheel: WheelRefs, reduce: boolean) {
  const root = wheel.root.current;
  const ring = wheel.ring.current;
  const cover = wheel.cover.current;
  const ghost = wheel.ghost.current;
  const markers = (wheel.markers.current ?? []).filter((m): m is HTMLElement => !!m);
  const focus = markers[wheel.focusIndex];
  if (!root || !ring || !cover || !ghost || !focus) return;

  const labels = markers.map((m) => m.querySelector(".factor-label"));
  const dots = markers.map((m) => m.querySelector(".factor-dot"));
  const others = markers.filter((m) => m !== focus);
  const count = markers.length;
  const focusAt = factorPoint(wheel.focusIndex, count);
  const dotSize = () => (focus.querySelector(".factor-dot") as HTMLElement | null)?.offsetWidth ?? 22;

  // Letak di layar. Selama ditahan, section menempati layar penuh, jadi
  // koordinat layar = koordinat section. Navigasi tetap (fixed), jadi letak
  // logonya tidak bergantung posisi gulir.
  const logoRect = () =>
    document.querySelector("[data-ring-logo]")?.getBoundingClientRect() ??
    new DOMRect(window.innerWidth / 2 - 15, 16, 30, 30);
  const ghostSize = () => ghost.offsetWidth || 30;
  /** Titik persegi di layar pada kemajuan keliling u. */
  const onSquare = (u: number) => {
    const p = squarePoint(u);
    const half = root.offsetWidth / 2;
    return { x: window.innerWidth / 2 + p.x * half, y: window.innerHeight / 2 + p.y * half };
  };

  gsap.set(root, { autoAlpha: 1 });
  // Kotak persegi 1000 satuan → tebal ±1 px di layar berapa pun ukurannya.
  gsap.set(ring, { strokeDashoffset: 1000, autoAlpha: 1, attr: { "stroke-width": 1000 / Math.max(root.offsetWidth, 1) } });
  gsap.set(markers, { autoAlpha: 1 });
  gsap.set(dots, { autoAlpha: 0, scale: 0.4 });
  gsap.set(labels, { autoAlpha: 0, y: 6 });
  gsap.set(ghost, { autoAlpha: 0 });
  gsap.set(cover, { xPercent: -50, yPercent: -50, autoAlpha: 0 });
  gsap.set(wheel.coverTitle.current, { autoAlpha: 0, y: 16 });

  // 1. Salinan logo muncul tepat di atas logo navigasi, lalu turun perlahan
  //    ke tengah sisi atas persegi sambil mengecil seukuran titik faktor.
  tl.fromTo(
    ghost,
    {
      autoAlpha: 0,
      x: () => logoRect().left + logoRect().width / 2 - ghostSize() / 2,
      y: () => logoRect().top + logoRect().height / 2 - ghostSize() / 2,
      scale: () => logoRect().width / ghostSize(),
    },
    { autoAlpha: 1, duration: 0.3, immediateRender: false },
    ">-0.6",
  );
  tl.to(ghost, {
    x: () => onSquare(0).x - ghostSize() / 2,
    y: () => onSquare(0).y - ghostSize() / 2,
    scale: () => dotSize() / ghostSize(),
    duration: reduce ? 1 : DESCEND_UNITS,
    ease: "power2.inOut",
  });

  // 2. Logo berjalan menyusuri persegi searah jarum jam dan garis tergambar
  //    tepat di belakangnya (lintasan dan waktu sama-sama linear). Titik
  //    faktor menyala saat logo tiba di sana; di ujung putaran logo melebur
  //    ke titik faktor pertama.
  const drawAt = tl.duration();
  const walk = { u: 0 };
  tl.to(ring, { strokeDashoffset: 0, duration: DRAW_UNITS, ease: "none" }, drawAt);
  tl.to(
    walk,
    {
      u: 1,
      duration: DRAW_UNITS,
      ease: "none",
      onUpdate: () => {
        const p = onSquare(walk.u);
        gsap.set(ghost, { x: p.x - ghostSize() / 2, y: p.y - ghostSize() / 2 });
      },
    },
    drawAt,
  );
  markers.forEach((_, i) => {
    const at = drawAt + DRAW_UNITS * factorProgress(i, count);
    tl.to(dots[i], { autoAlpha: 1, scale: 1, duration: 0.35, ease: "back.out(2)" }, at);
    tl.to(labels[i], { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out" }, at + 0.1);
  });
  tl.to(ghost, { autoAlpha: 0, duration: 0.4 }, drawAt + DRAW_UNITS - 0.2);
  tl.to({}, { duration: 1.4 });

  // 3. Masuk ke faktor pilihan dengan halus: yang lain memudar lebih dulu,
  //    titik pilihan bergeser ke tengah sambil membesar perlahan lalu makin
  //    cepat, kemudian lingkaran krem mengambil alih dari ukuran yang sama dan
  //    melambat sampai menutup layar, jadi tidak ada jeda di antaranya.
  const zoomAt = tl.duration();
  tl.to([ring, ...others, ...labels], { autoAlpha: 0, duration: 1, ease: "power1.inOut" }, zoomAt);
  tl.set(root, { transformOrigin: `${50 + focusAt.x * 50}% ${50 + focusAt.y * 50}%` }, zoomAt);
  tl.to(
    root,
    {
      x: () => -focusAt.x * (root.offsetWidth / 2),
      y: () => -focusAt.y * (root.offsetHeight / 2),
      duration: 2.4,
      ease: "power2.inOut",
    },
    zoomAt + 0.3,
  );
  tl.to(root, { scale: FOCUS_SCALE, duration: 2.6, ease: "power2.in" }, zoomAt + 0.3);
  tl.fromTo(
    cover,
    { autoAlpha: 1, scale: () => (dotSize() * FOCUS_SCALE) / cover.offsetWidth },
    { autoAlpha: 1, scale: 1, duration: reduce ? 1 : 2, ease: "power2.out", immediateRender: false },
  );
  tl.to(wheel.coverTitle.current, { autoAlpha: 1, y: 0, duration: 1, ease: "power2.out" }, ">-0.8");
}
