"use client";

import { useEffect, useRef } from "react";
import { SPOTLIGHT_R, SPOTLIGHT_STOPS } from "@/lib/spotlight";

type RevealLayerProps = {
  image: string;
  cursorX: number;
  cursorY: number;
};

/**
 * Lapisan gambar kedua yang hanya terlihat di dalam lingkaran sorot kursor.
 * Masker dibuat di kanvas tersembunyi (gradien radial putih → transparan),
 * lalu dipasang sebagai `mask-image` pada div gambar.
 */
export default function RevealLayer({ image, cursorX, cursorY }: RevealLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);

  // Samakan ukuran kanvas dengan jendela saat dipasang dan saat diubah ukurannya.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Gambar ulang masker setiap kali posisi kursor berubah.
  useEffect(() => {
    const canvas = canvasRef.current;
    const reveal = revealRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !reveal || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const gradient = ctx.createRadialGradient(cursorX, cursorY, 0, cursorX, cursorY, SPOTLIGHT_R);
    for (const [offset, alpha] of SPOTLIGHT_STOPS) {
      gradient.addColorStop(offset, `rgba(255,255,255,${alpha})`);
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cursorX, cursorY, SPOTLIGHT_R, 0, Math.PI * 2);
    ctx.fill();

    const mask = `url(${canvas.toDataURL()})`;
    reveal.style.maskImage = mask;
    reveal.style.webkitMaskImage = mask;
    reveal.style.maskSize = "100% 100%";
    reveal.style.webkitMaskSize = "100% 100%";
  });

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ display: "none" }}
      />
      <div
        ref={revealRef}
        className="absolute inset-0 bg-center bg-cover bg-no-repeat z-30 pointer-events-none"
        // Awalnya tertutup penuh sampai masker pertama selesai dibuat.
        style={{ backgroundImage: `url(${image})`, maskImage: "linear-gradient(transparent, transparent)" }}
      />
    </>
  );
}
