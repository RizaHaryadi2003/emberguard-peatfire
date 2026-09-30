"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

/**
 * Penjaga kelancaran: bila rata-rata di bawah 55 fps, resolusi render
 * diturunkan bertahap (hingga 1×) agar animasi tetap ≥ 60 fps di laptop biasa.
 * Dipakai bersama oleh semua modul section Gambut.
 */
export default function PerformanceGuard({ maxDpr }: { maxDpr: number }) {
  const setDpr = useThree((s) => s.setDpr);
  const acc = useRef({ time: 0, frames: 0, warmup: 3, dpr: maxDpr });

  useFrame((_, delta) => {
    const a = acc.current;
    // Abaikan detik-detik awal saat tekstur & model masih diunggah ke GPU.
    if (a.warmup > 0) {
      a.warmup -= delta;
      return;
    }
    a.time += delta;
    a.frames++;
    if (a.time < 1.5) return;
    const fps = a.frames / a.time;
    a.time = 0;
    a.frames = 0;
    if (fps < 55 && a.dpr > 1) {
      a.dpr = Math.max(1, a.dpr - 0.25);
      setDpr(a.dpr);
    }
  });

  return null;
}
