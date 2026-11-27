"use client";

import { type RefObject, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { factorAngle } from "@/lib/factorRing";

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
  /** Lintasan lingkaran (pathLength = 1000) yang digambar searah jarum jam. */
  ring: RefObject<SVGPathElement | null>;
  center: RefObject<HTMLElement | null>;
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
 * 3. Logo bulat di navigasi seolah turun ke puncak roda, lalu lingkaran
 *    faktor tergambar searah jarum jam; tiap faktor muncul saat garis
 *    mencapainya.
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

/**
 * Langkah roda faktor: logo turun, lingkaran tergambar searah jarum jam
 * sambil faktor muncul satu per satu, lalu diperbesar ke satu faktor.
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
  const angle = factorAngle(wheel.focusIndex, count);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dotSize = () => (focus.querySelector(".factor-dot") as HTMLElement | null)?.offsetWidth ?? 22;

  // Letak di layar. Selama ditahan, section menempati layar penuh, jadi
  // koordinat layar = koordinat section. Navigasi tetap (fixed), jadi letak
  // logonya tidak bergantung posisi gulir.
  const logoRect = () =>
    document.querySelector("[data-ring-logo]")?.getBoundingClientRect() ??
    new DOMRect(window.innerWidth / 2 - 15, 16, 30, 30);
  const ghostSize = () => ghost.offsetWidth || 30;
  const topPoint = () => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 - root.offsetHeight / 2 });

  gsap.set(root, { autoAlpha: 1 });
  // Kotak lingkaran 1000 satuan → tebal ±1 px di layar berapa pun ukurannya.
  gsap.set(ring, { strokeDashoffset: 1000, attr: { "stroke-width": 1000 / Math.max(root.offsetWidth, 1) } });
  gsap.set(wheel.center.current, { autoAlpha: 0, y: 10 });
  gsap.set(markers, { autoAlpha: 1 });
  gsap.set(dots, { autoAlpha: 0, scale: 0.4 });
  gsap.set(labels, { autoAlpha: 0, y: 6 });
  gsap.set(ghost, { autoAlpha: 0 });
  gsap.set(cover, { xPercent: -50, yPercent: -50, autoAlpha: 0 });
  gsap.set(wheel.coverTitle.current, { autoAlpha: 0, y: 16 });

  // 1. Salinan logo muncul tepat di atas logo navigasi, lalu turun perlahan
  //    ke puncak roda sambil mengecil seukuran titik faktor.
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
    x: () => topPoint().x - ghostSize() / 2,
    y: () => topPoint().y - ghostSize() / 2,
    scale: () => dotSize() / ghostSize(),
    duration: 2.2,
    ease: "power2.inOut",
  });

  // 2. Lingkaran tergambar searah jarum jam dari puncak. Salinan logo
  //    melebur menjadi titik faktor pertama; faktor lain muncul tepat saat
  //    garis mencapainya (lintasan dan waktu sama-sama linear).
  const DRAW = 4;
  const drawAt = tl.duration();
  tl.to(ghost, { autoAlpha: 0, duration: 0.4 }, drawAt);
  tl.to(ring, { strokeDashoffset: 0, duration: DRAW, ease: "none" }, drawAt);
  tl.to(wheel.center.current, { autoAlpha: 1, y: 0, duration: 1, ease: "power2.out" }, drawAt + 0.6);
  markers.forEach((_, i) => {
    const at = drawAt + (DRAW * i) / count;
    tl.to(dots[i], { autoAlpha: 1, scale: 1, duration: 0.35, ease: "back.out(2)" }, at);
    tl.to(labels[i], { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out" }, at + 0.1);
  });
  tl.to({}, { duration: 1.4 });

  // 3. Masuk ke faktor pilihan dengan halus: yang lain memudar lebih dulu,
  //    titik pilihan bergeser ke tengah sambil membesar perlahan lalu makin
  //    cepat, kemudian lingkaran krem mengambil alih dari ukuran yang sama dan
  //    melambat sampai menutup layar, jadi tidak ada jeda di antaranya.
  const zoomAt = tl.duration();
  tl.to([ring, wheel.center.current, ...others, ...labels], { autoAlpha: 0, duration: 1, ease: "power1.inOut" }, zoomAt);
  tl.set(root, { transformOrigin: `${50 + cos * 50}% ${50 + sin * 50}%` }, zoomAt);
  tl.to(
    root,
    { x: () => -cos * (root.offsetWidth / 2), y: () => -sin * (root.offsetHeight / 2), duration: 2.4, ease: "power2.inOut" },
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
