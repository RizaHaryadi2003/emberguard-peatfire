"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { advanceFrameClock, FRAME_CAP, getFrameCap, judgeFrameWindow } from "@/lib/frameBudget";

/** Lama satu jendela pengukuran kecepatan (detik). */
const MEASURE_WINDOW_SEC = 1.5;

const INPUT_EVENTS = ["pointermove", "pointerdown", "wheel", "scroll", "keydown", "touchmove"] as const;

/**
 * Penjaga beban render, dipakai bersama oleh semua modul section Gambut.
 *
 * Kanvas memakai `frameloop="demand"`, dan komponen inilah yang memintanya
 * menggambar: 60 gambar per detik selama pembaca berinteraksi, 30 saat ia
 * diam. Bila perangkat tidak sanggup mencapai batas itu, resolusi diturunkan
 * bertahap sampai 1×; bila masih kewalahan, `onOverload` meminta modul memakai
 * mutu grafis rendah.
 */
export default function PerformanceGuard({ maxDpr, onOverload }: { maxDpr: number; onOverload: () => void }) {
  const setDpr = useThree((s) => s.setDpr);
  const invalidate = useThree((s) => s.invalidate);
  const lastInput = useRef(-Infinity);
  const acc = useRef({ time: 0, frames: 0, warmup: 3, dpr: maxDpr, slowWindows: 0, cap: FRAME_CAP.idle as number });

  useEffect(() => {
    const markInput = () => {
      lastInput.current = performance.now();
    };
    for (const name of INPUT_EVENTS) window.addEventListener(name, markInput, { passive: true, capture: true });

    let frame = 0;
    let nextAt = 0;
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const clock = advanceFrameClock(now, nextAt, getFrameCap(now - lastInput.current));
      nextAt = clock.nextAt;
      if (clock.due) invalidate();
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      for (const name of INPUT_EVENTS) window.removeEventListener(name, markInput, { capture: true });
    };
  }, [invalidate]);

  useFrame((_, delta) => {
    const a = acc.current;
    // Abaikan detik-detik awal saat tekstur & model masih diunggah ke GPU.
    if (a.warmup > 0) {
      a.warmup -= delta;
      return;
    }
    // Batas berganti di tengah pengukuran membuat hasilnya tidak sah, jadi diulang.
    const cap = getFrameCap(performance.now() - lastInput.current);
    if (cap !== a.cap) {
      a.cap = cap;
      a.time = 0;
      a.frames = 0;
      return;
    }
    a.time += delta;
    a.frames++;
    if (a.time < MEASURE_WINDOW_SEC) return;
    const judged = judgeFrameWindow(a.frames / a.time, cap, a.dpr, a.slowWindows);
    a.time = 0;
    a.frames = 0;
    a.slowWindows = judged.slowWindows;
    if (judged.dpr !== a.dpr) {
      a.dpr = judged.dpr;
      setDpr(a.dpr);
    }
    if (judged.overload) onOverload();
  });

  return null;
}
