"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { breath, type Fate, type Mask } from "@/lib/model/haze";
import type { FrameRect } from "./lung/LungScene";

export { BREATH_SEC } from "./lung/timing";

// Babak 03 · Satu Tarikan Napas. Adegan 3D-nya (lung/LungScene.tsx) memenuhi
// seluruh layar supaya butir asap melayang di sekeliling, tetapi paru-paru
// dipaskan ke kotak gambar ini: kotak inilah yang diukur lalu diteruskan ke
// kamera. Three.js dimuat terpisah, hanya saat babak ini dibuka.

const LungScene = dynamic(() => import("./lung/LungScene"), {
  ssr: false,
  loading: () => (
    <p className="absolute inset-0 grid place-items-center text-[11px] text-white/40">
      Menyiapkan paru-paru…
    </p>
  ),
});

export default function BreathView({
  mask,
  breathId,
}: {
  mask: Mask;
  breathId: number;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<FrameRect | null>(null);
  const fates = useMemo<Fate[]>(() => breath(mask), [mask]);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setRect({ x: r.left, y: r.top, w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <div ref={frameRef} className="absolute inset-0">
      <div
        className="fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, #1a1411 0%, #0a0a0d 60%, #060608 100%)",
        }}
      >
        {rect && (
          <LungScene
            mask={mask}
            fates={fates}
            breathId={breathId}
            rect={rect}
          />
        )}
      </div>
    </div>
  );
}
