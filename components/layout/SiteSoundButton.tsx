"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { SITE_SOUND } from "@/config/assets";
import { siteSoundPreference } from "@/lib/sound/preference";

/** Kekerasan suara latar (0–1); dibuat pelan supaya tidak menutupi narator modul. */
const VOLUME = 0.45;

/** Ikon headphone garis tipis; tanda silang di tengah saat suara mati. */
function HeadphoneIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
      <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
      <rect x="3" y="14" width="4" height="7" rx="1.6" />
      <rect x="17" y="14" width="4" height="7" rx="1.6" />
      {on ? (
        <path d="M10 15.5v2M12 14v5M14 15.5v2" />
      ) : (
        <path d="M10.4 15l3.2 3.2M13.6 15l-3.2 3.2" />
      )}
    </svg>
  );
}

/**
 * Tombol "Suara" di navigasi. Memutar suara latar dari `SITE_SOUND` secara
 * berulang. Pilihannya diingat selama sesi; suara berhenti saat tab
 * disembunyikan. Bila berkas suara belum diisi, tombol hanya berganti ikon.
 */
export default function SiteSoundButton() {
  const on = useSyncExternalStore(
    siteSoundPreference.subscribe,
    siteSoundPreference.getSnapshot,
    siteSoundPreference.getServerSnapshot,
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!SITE_SOUND) return;
    if (!on) {
      audioRef.current?.pause();
      return;
    }
    const audio = (audioRef.current ??= Object.assign(new Audio(SITE_SOUND), { loop: true, volume: VOLUME }));
    const apply = () => {
      // Peramban bisa menolak memutar sebelum ada ketukan; cukup diam.
      if (document.hidden) audio.pause();
      else void audio.play().catch(() => {});
    };
    apply();
    document.addEventListener("visibilitychange", apply);
    return () => document.removeEventListener("visibilitychange", apply);
  }, [on]);

  useEffect(
    () => () => {
      audioRef.current?.pause();
      audioRef.current = null;
    },
    [],
  );

  return (
    <button
      type="button"
      onClick={() => siteSoundPreference.set(!on)}
      aria-pressed={on}
      aria-label={on ? "Matikan suara" : "Nyalakan suara"}
      className="flex cursor-pointer items-center gap-2 text-[#474747] transition-opacity hover:opacity-70"
    >
      <HeadphoneIcon on={on} />
      <span className="type-label hidden md:inline">Suara</span>
    </button>
  );
}
