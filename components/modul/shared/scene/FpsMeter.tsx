"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

/** Selang pembaruan angka di layar (detik). */
const REPORT_SEC = 0.5;

/**
 * Pengukur kecepatan gambar untuk pemeriksaan, bukan untuk pembaca.
 *
 * Hanya dipasang bila alamat halaman memuat `?fps`. Menampilkan bingkai per
 * detik, lama satu bingkai, jumlah panggilan gambar, jumlah segitiga, dan
 * resolusi render saat itu. Angka-angka inilah yang dipakai untuk menilai
 * apakah suatu perubahan grafis membuat modul lebih berat atau lebih ringan,
 * sehingga perbaikan kinerja dapat diukur, tidak ditebak.
 *
 * Kanvas memakai `frameloop="demand"` dan sengaja dibatasi 30 bingkai per
 * detik selama pembaca diam (lihat `PerformanceGuard`), jadi angka 30 saat
 * diam adalah batasnya, bukan tanda lambat. Yang menentukan adalah angka saat
 * pembaca sedang menggeser atau menyeret: sasarannya 60.
 */
export default function FpsMeter() {
  const gl = useThree((s) => s.gl);
  const elRef = useRef<HTMLDivElement | null>(null);
  const acc = useRef({ time: 0, frames: 0, worst: 0 });

  useEffect(() => {
    const host = gl.domElement.parentElement;
    if (!host) return;
    const el = document.createElement("div");
    el.setAttribute("aria-hidden", "true");
    el.style.cssText =
      "position:absolute;left:50%;top:8px;transform:translateX(-50%);z-index:50;pointer-events:none;" +
      "font:11px/1.4 ui-monospace,monospace;color:#d6f5e3;background:rgba(0,0,0,.7);" +
      "padding:4px 8px;border-radius:6px;white-space:nowrap";
    el.textContent = "mengukur…";
    host.appendChild(el);
    elRef.current = el;
    return () => {
      el.remove();
      elRef.current = null;
    };
  }, [gl]);

  useFrame((_, delta) => {
    const a = acc.current;
    a.time += delta;
    a.frames++;
    a.worst = Math.max(a.worst, delta);
    if (a.time < REPORT_SEC || !elRef.current) return;
    const fps = a.frames / a.time;
    const info = gl.info.render;
    elRef.current.textContent =
      `${fps.toFixed(0)} fps · terburuk ${(a.worst * 1000).toFixed(0)} ms · ` +
      `${info.calls} gambar · ${(info.triangles / 1000).toFixed(0)}k segitiga · dpr ${gl.getPixelRatio().toFixed(2)}`;
    a.time = 0;
    a.frames = 0;
    a.worst = 0;
  });

  return null;
}

/** Pengukur dipasang hanya bila alamat halaman memuat `?fps`. */
export function wantsFpsMeter(): boolean {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).has("fps");
}
