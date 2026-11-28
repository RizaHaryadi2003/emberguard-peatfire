"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { HeroClip } from "@/config/assets";

/** Lama saling memudar antarklip (milidetik); sama dengan kelas duration di bawah. */
const FADE_MS = 1200;
/** Layar selebar ini atau lebih memakai video besar; di bawahnya 720p. */
const LARGE_QUERY = "(min-width: 1024px)";
/** Jenis HEVC (H.265) Main yang dipakai berkas 2160p. */
const HEVC_TYPE = 'video/mp4; codecs="hvc1.1.6.L153.B0"';

type Size = "uhd" | "large" | "small";

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

/** Ukuran video untuk peramban ini: 4K HEVC bila bisa, 1440p, atau 720p. */
function pickSize(): Size {
  if (!window.matchMedia(LARGE_QUERY).matches) return "small";
  const probe = document.createElement("video");
  return probe.canPlayType(HEVC_TYPE) ? "uhd" : "large";
}

/** Bisukan lalu putar; penolakan peramban diabaikan (poster tetap tampil). */
function playMuted(v: HTMLVideoElement) {
  v.muted = true;
  v.defaultMuted = true;
  v.setAttribute("muted", "");
  v.play().catch(() => {});
}

/**
 * Video latar beranda, diputar bergiliran TANPA JEDA: ada dua elemen
 * <video> bertumpuk. Klip berikutnya sudah dimuat di elemen yang tersembunyi
 * dan mulai diputar sedikit sebelum klip sekarang habis, lalu memudar masuk
 * di atas klip lama (yang tetap utuh di bawahnya). Paling banyak dua video
 * berjalan bersamaan, hanya selama memudar.
 *
 * Putar otomatis hanya diizinkan peramban untuk video bisu. React tidak
 * menulis atribut `muted` ke HTML, jadi video dibisukan dan diputar lewat
 * skrip; tombol putar bawaan Safari disembunyikan di globals.css.
 */
export default function HeroVideo({ clips, poster, revealDelayMs, onShown }: Props) {
  // Klip yang dimuat di tiap slot, dan slot yang sedang tampil.
  const [slotClip, setSlotClip] = useState<[number, number]>([0, clips.length > 1 ? 1 : 0]);
  const [active, setActive] = useState<0 | 1>(0);
  // Slot lama tetap utuh di bawah selama slot baru memudar masuk di atasnya,
  // supaya latar abu-abu tidak tembus di tengah peralihan.
  const [holding, setHolding] = useState<0 | 1 | null>(null);
  const [revealed, setRevealed] = useState(false);
  const slotARef = useRef<HTMLVideoElement>(null);
  const slotBRef = useRef<HTMLVideoElement>(null);
  const switching = useRef(false);
  const shownRef = useRef(false);
  const onShownRef = useRef(onShown);
  useEffect(() => {
    onShownRef.current = onShown;
  });

  // null di server: video baru dipasang di peramban, setelah ukuran layar diketahui.
  const size = useSyncExternalStore<Size | null>(subscribeLarge, pickSize, () => null);

  // Tampilkan video pertama setelah jeda pembuka.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setRevealed(true);
      if (!shownRef.current) {
        shownRef.current = true;
        onShownRef.current();
      }
    }, revealDelayMs);
    return () => window.clearTimeout(t);
  }, [revealDelayMs]);

  // Putar slot yang tampil. Bila peramban menolak (mis. mode hemat daya),
  // coba lagi pada sentuhan/klik pertama.
  useEffect(() => {
    const v = (active === 0 ? slotARef : slotBRef).current;
    if (!v || !size) return;
    playMuted(v);
    const retry = () => playMuted(v);
    window.addEventListener("pointerdown", retry, { once: true });
    window.addEventListener("keydown", retry, { once: true });
    return () => {
      window.removeEventListener("pointerdown", retry);
      window.removeEventListener("keydown", retry);
    };
  }, [active, size]);

  // Menjelang klip habis: putar klip berikutnya di slot lain dan saling
  // memudar; sesudahnya slot lama dihentikan dan memuat klip berikutnya lagi.
  const handleTime = (slot: 0 | 1) => {
    if (clips.length < 2 || slot !== active || switching.current) return;
    const v = (slot === 0 ? slotARef : slotBRef).current;
    const next = (slot === 0 ? slotBRef : slotARef).current;
    if (!v || !next || !v.duration || v.duration - v.currentTime > FADE_MS / 1000 + 0.15) return;
    switching.current = true;
    next.currentTime = 0;
    playMuted(next);
    const other: 0 | 1 = slot === 0 ? 1 : 0;
    setHolding(slot);
    setActive(other);
    window.setTimeout(() => {
      v.pause();
      setHolding(null);
      setSlotClip((prev) => {
        const copy: [number, number] = [prev[0], prev[1]];
        copy[slot] = (prev[other] + 1) % clips.length;
        return copy;
      });
      switching.current = false;
    }, FADE_MS + 100);
  };

  if (!size) return null;
  return (
    <>
      {[0, 1].map((slot) => {
        const clip = clips[slotClip[slot]];
        const shown = revealed && (slot === active || slot === holding);
        return (
          <video
            key={slot}
            ref={slot === 0 ? slotARef : slotBRef}
            src={clip[size]}
            poster={slot === 0 && slotClip[0] === 0 ? poster || undefined : undefined}
            autoPlay={slot === 0}
            muted
            playsInline
            disablePictureInPicture
            disableRemotePlayback
            controls={false}
            loop={clips.length < 2}
            preload="auto"
            onTimeUpdate={() => handleTime(slot as 0 | 1)}
            aria-hidden
            tabIndex={-1}
            className={`hero-video pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-in-out ${
              slot === active ? "z-[1]" : "z-0"
            } ${shown ? "opacity-100" : "opacity-0"}`}
          />
        );
      })}
    </>
  );
}
