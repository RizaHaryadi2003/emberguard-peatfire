"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { HeroClip } from "@/config/assets";

/** Lama memudar saat berganti klip (milidetik); sama dengan kelas duration di bawah. */
const FADE_MS = 900;
/** Layar selebar ini atau lebih memakai video 1440p; di bawahnya 720p. */
const LARGE_QUERY = "(min-width: 1024px)";

type Props = {
  clips: HeroClip[];
  poster?: string;
  /** Jeda sebelum video pertama muncul, supaya garis sempat melebar dulu (milidetik). */
  revealDelayMs: number;
  /** Dipanggil sekali ketika video mulai tampil. */
  onShown: () => void;
};

function subscribeLarge(onChange: () => void) {
  const mq = window.matchMedia(LARGE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * Video latar beranda. Hanya ada satu elemen <video>: setiap klip selesai,
 * video memudar, sumbernya diganti klip berikutnya, lalu muncul lagi.
 * Dengan begitu peramban tidak pernah memutar dua video sekaligus.
 *
 * Putar otomatis hanya diizinkan peramban untuk video bisu. React tidak
 * menulis atribut `muted` ke HTML, jadi video dibisukan dan diputar sendiri
 * lewat skrip; tombol putar bawaan Safari disembunyikan di globals.css.
 * Ukuran video dipilih menurut lebar layar (1440p laptop, 720p ponsel).
 */
export default function HeroVideo({ clips, poster, revealDelayMs, onShown }: Props) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const shownRef = useRef(false);
  const onShownRef = useRef(onShown);
  useEffect(() => {
    onShownRef.current = onShown;
  });
  // null di server: video baru dipasang di peramban, setelah ukuran layar diketahui.
  const large = useSyncExternalStore(
    subscribeLarge,
    () => window.matchMedia(LARGE_QUERY).matches,
    () => null,
  );
  const src = large === null ? null : large ? clips[index].large : clips[index].small;

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

  // Pastikan bisu lalu putar; bila peramban menolak (mis. mode hemat daya),
  // coba lagi pada sentuhan/klik pertama. Poster tetap tampil sementara itu.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !src) return;
    v.muted = true;
    v.defaultMuted = true;
    v.setAttribute("muted", "");
    const play = () => v.play().catch(() => {});
    play();
    const retry = () => play();
    window.addEventListener("pointerdown", retry, { once: true });
    window.addEventListener("keydown", retry, { once: true });
    return () => {
      window.removeEventListener("pointerdown", retry);
      window.removeEventListener("keydown", retry);
    };
  }, [src]);

  // Ganti klip: pudar → ganti sumber → muncul (dilakukan di onLoadedData).
  const handleEnded = () => {
    if (clips.length < 2) return;
    setVisible(false);
    window.setTimeout(() => setIndex((i) => (i + 1) % clips.length), FADE_MS);
  };

  if (!src) return null;
  return (
    <video
      ref={videoRef}
      key={src}
      src={src}
      poster={index === 0 ? poster || undefined : undefined}
      autoPlay
      muted
      playsInline
      disablePictureInPicture
      disableRemotePlayback
      controls={false}
      loop={clips.length < 2}
      preload="auto"
      onEnded={handleEnded}
      onLoadedData={() => {
        if (shownRef.current) setVisible(true);
      }}
      aria-hidden
      tabIndex={-1}
      className={`hero-video pointer-events-none absolute inset-0 z-0 h-full w-full object-cover transition-opacity duration-[900ms] ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}
