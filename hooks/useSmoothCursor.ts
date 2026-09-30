"use client";

import { useEffect, useRef, useState } from "react";
import { smoothStep, type Point } from "@/lib/spotlight";

/**
 * Melacak posisi kursor dengan gerak yang dihaluskan (lerp tiap bingkai),
 * sehingga lingkaran sorot "mengekor" kursor dengan lembut.
 */
export function useSmoothCursor(): Point {
  // Mulai jauh di luar layar agar sorot tidak tampil sebelum kursor bergerak.
  const mouse = useRef<Point>({ x: -999, y: -999 });
  const smooth = useRef<Point>({ x: -999, y: -999 });
  const rafRef = useRef<number>(0);
  const [cursorPos, setCursorPos] = useState<Point>({ x: -999, y: -999 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
    };

    const tick = () => {
      const next = smoothStep(smooth.current, mouse.current);
      // Lewati render ulang bila pergeseran sudah tak kasatmata (< 0,05 px).
      const moved =
        Math.abs(next.x - smooth.current.x) > 0.05 ||
        Math.abs(next.y - smooth.current.y) > 0.05;
      smooth.current = next;
      if (moved) setCursorPos(next);
      rafRef.current = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", handleMouseMove);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return cursorPos;
}
