"use client";

import { useEffect, useRef, useState } from "react";

/** Lama memudar saat berganti klip (milidetik); sama dengan kelas duration di bawah. */
const FADE_MS = 900;

type Props = {
  sources: string[];
  poster?: string;
  /** Jeda sebelum video pertama muncul, supaya garis sempat melebar dulu (milidetik). */
  revealDelayMs: number;
  /** Dipanggil sekali ketika video mulai tampil. */
  onShown: () => void;
};

/**
 * Video latar beranda. Hanya ada satu elemen <video>: setiap klip selesai,
 * video memudar, sumbernya diganti klip berikutnya, lalu muncul lagi.
 * Dengan begitu peramban tidak pernah memutar dua video sekaligus.
 */
export default function HeroVideo({ sources, poster, revealDelayMs, onShown }: Props) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const shownRef = useRef(false);
  const onShownRef = useRef(onShown);
  useEffect(() => {
    onShownRef.current = onShown;
  });

  // Tampilkan video pertama setelah jeda pembuka.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setVisible(true);
      if (!shownRef.current) {
        shownRef.current = true;
        onShownRef.current();
      }
    }, revealDelayMs);
    return () => window.clearTimeout(t);
  }, [revealDelayMs]);

  // Ganti klip: pudar → ganti sumber → muncul (dilakukan di onLoadedData).
  const handleEnded = () => {
    if (sources.length < 2) return;
    setVisible(false);
    window.setTimeout(() => setIndex((i) => (i + 1) % sources.length), FADE_MS);
  };

  return (
    <video
      key={sources[index]}
      src={sources[index]}
      poster={index === 0 ? poster || undefined : undefined}
      autoPlay
      muted
      playsInline
      loop={sources.length < 2}
      preload="auto"
      onEnded={handleEnded}
      onLoadedData={() => {
        if (shownRef.current) setVisible(true);
      }}
      className={`absolute inset-0 z-0 h-full w-full object-cover transition-opacity duration-[900ms] ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}
