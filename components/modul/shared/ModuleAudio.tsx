"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { Mic, MicOff } from "lucide-react";
import AmbientSoundToggle, { AUDIO_BUTTON, audioButtonState } from "./AmbientSoundToggle";
import { NARRATION_EVENT, narratorPreference } from "@/lib/sound/preference";
import type { AmbientMix } from "@/lib/sound/soundscapes";

export type Narration = {
  /** Nama folder klip di public/audio/narasi/. */
  modul: string;
  /** Kunci klip yang seharusnya terdengar sekarang, atau null bila diam. */
  clip: string | null;
  /**
   * true: klip ini memotong yang sedang diputar (layar pembuka, penjelasan
   * tahap baru). false: klip menunggu yang sedang diputar selesai (arahan),
   * supaya penjelasan tidak terpotong di tengah kalimat.
   */
  interrupt: boolean;
};

/** Beri tahu suara alam bahwa narator mulai/berhenti bicara. */
const announce = (speaking: boolean) => window.dispatchEvent(new CustomEvent(NARRATION_EVENT, { detail: speaking }));

/**
 * Tombol "Narator" dan pemutar klipnya.
 *
 * Menyala secara bawaan. Peramban baru mengizinkan suara setelah pembaca
 * menekan sesuatu; bila pemutaran ditolak, klip yang diminta terakhir
 * diputar pada sentuhan pertama. Datang dari halaman lain di situs ini
 * (sudah pernah menekan), layar pembuka langsung bersuara.
 */
function NarratorToggle({ modul, clip, interrupt }: Narration) {
  const on = useSyncExternalStore(narratorPreference.subscribe, narratorPreference.getSnapshot, narratorPreference.getServerSnapshot);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  /** Arahan yang menunggu klip sekarang selesai. */
  const pendingRef = useRef<string | null>(null);
  /** Klip yang terakhir diminta; diputar pada sentuhan pertama bila tertahan. */
  const wantedRef = useRef<string | null>(null);
  const gestureRef = useRef<(() => void) | null>(null);

  const srcOf = (key: string) => `/audio/narasi/${modul}/${key}.mp3`;

  const clearGesture = () => {
    if (!gestureRef.current) return;
    document.removeEventListener("pointerdown", gestureRef.current);
    document.removeEventListener("keydown", gestureRef.current);
    gestureRef.current = null;
  };

  const playNow = (key: string) => {
    const audio = audioRef.current;
    if (!audio) return;
    wantedRef.current = key;
    pendingRef.current = null;
    audio.src = srcOf(key);
    audio.play().catch((err: unknown) => {
      // Ditolak peramban: tunggu sentuhan pertama. Kesalahan lain (mis.
      // dipotong klip berikutnya) cukup diabaikan.
      if (!(err instanceof DOMException) || err.name !== "NotAllowedError" || gestureRef.current) return;
      gestureRef.current = () => {
        clearGesture();
        if (narratorPreference.getSnapshot() && wantedRef.current) playNow(wantedRef.current);
      };
      document.addEventListener("pointerdown", gestureRef.current);
      document.addEventListener("keydown", gestureRef.current);
    });
  };
  const playNowRef = useRef(playNow);
  useEffect(() => {
    playNowRef.current = playNow;
  });

  // Satu elemen audio selama modul terbuka.
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;
    const onPlaying = () => announce(true);
    const onStop = () => announce(false);
    const onEnded = () => {
      announce(false);
      const next = pendingRef.current;
      if (next) playNowRef.current(next);
    };
    const onHidden = () => {
      if (document.hidden) audio.pause();
    };
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onStop);
    audio.addEventListener("ended", onEnded);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      audio.pause();
      audio.removeAttribute("src");
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onStop);
      audio.removeEventListener("ended", onEnded);
      document.removeEventListener("visibilitychange", onHidden);
      clearGesture();
      announce(false);
      audioRef.current = null;
    };
  }, []);

  // Klip berganti, atau narator dinyalakan/dimatikan.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!on) {
      pendingRef.current = null;
      audio.pause();
      return;
    }
    if (!clip) return;
    const busy = !audio.paused && !audio.ended;
    if (interrupt || !busy) playNowRef.current(clip);
    else {
      pendingRef.current = clip;
      wantedRef.current = clip;
    }
  }, [clip, interrupt, on]);

  return (
    <button
      type="button"
      onClick={() => narratorPreference.set(!on)}
      aria-pressed={on}
      aria-label="Narator"
      // Paket gratis ElevenLabs mewajibkan kredit sumber suara.
      title={`${on ? "Matikan" : "Nyalakan"} narator · suara oleh ElevenLabs`}
      className={`${AUDIO_BUTTON} ${audioButtonState(on)}`}
    >
      {on ? <Mic size={16} /> : <MicOff size={16} />}
      <span className="hidden lg:inline">Narator</span>
    </button>
  );
}

/**
 * Kendali suara modul di pojok kanan atas, di samping navigasi: narator
 * (bila modulnya sudah punya naskah) dan suara alam.
 */
export default function ModuleAudio({ getMix, narration }: { getMix: () => AmbientMix; narration?: Narration }) {
  return (
    <div className="fixed right-2 top-2 z-[100] flex items-center gap-2 md:right-5 md:top-[21px]">
      {narration && <NarratorToggle {...narration} />}
      <AmbientSoundToggle getMix={getMix} />
    </div>
  );
}
