"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { AmbientEngine } from "@/lib/sound/ambientEngine";
import { ambientPreference, NARRATION_EVENT } from "@/lib/sound/preference";
import type { AmbientMix } from "@/lib/sound/soundscapes";

/** Gaya tombol suara (suara alam dan narator) di pojok kanan atas. */
export const AUDIO_BUTTON =
  "inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors lg:px-4";
export const audioButtonState = (on: boolean) =>
  on ? "border-white/40 bg-white/15 text-white" : "border-white/25 bg-black/55 text-white/75 hover:text-white";

/** Selang membaca keadaan modul untuk racikan suara (milidetik). */
const POLL_MS = 250;

type Props = {
  /**
   * Membaca racikan suara dari keadaan modul saat ini. Dipanggil berkala,
   * bukan tiap render, jadi boleh membaca ref adegan 3D.
   */
  getMix: () => AmbientMix;
};

/**
 * Tombol "Suara alam" dan mesin suaranya. Diletakkan oleh `ModuleAudio`.
 *
 * Suara mati pada kunjungan pertama karena peramban hanya mengizinkan audio
 * setelah pembaca menekan sesuatu. Begitu dinyalakan, pilihannya diingat
 * selama sesi, jadi modul berikutnya langsung bersuara. Suara berhenti saat
 * tab disembunyikan dan meredam selama narator bicara.
 */
export default function AmbientSoundToggle({ getMix }: Props) {
  const on = useSyncExternalStore(ambientPreference.subscribe, ambientPreference.getSnapshot, ambientPreference.getServerSnapshot);
  const engineRef = useRef<AmbientEngine | null>(null);
  const duckedRef = useRef(false);
  const getMixRef = useRef(getMix);
  useEffect(() => {
    getMixRef.current = getMix;
  });

  // Narator bicara → suara alam diredam (juga dicatat bila mesin belum ada).
  useEffect(() => {
    const onNarration = (e: Event) => {
      duckedRef.current = (e as CustomEvent<boolean>).detail;
      engineRef.current?.setDucked(duckedRef.current);
    };
    window.addEventListener(NARRATION_EVENT, onNarration);
    return () => window.removeEventListener(NARRATION_EVENT, onNarration);
  }, []);

  useEffect(() => {
    if (!on) {
      engineRef.current?.stop();
      return;
    }
    const engine = (engineRef.current ??= new AmbientEngine());
    engine.setDucked(duckedRef.current);
    const apply = () => {
      if (document.hidden) engine.stop();
      else void engine.start();
    };
    engine.setMix(getMixRef.current());
    apply();
    const timer = window.setInterval(() => engine.setMix(getMixRef.current()), POLL_MS);
    document.addEventListener("visibilitychange", apply);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", apply);
    };
  }, [on]);

  // Dibuang saat modul ditutup, dan rujukannya dikosongkan: mesin yang sudah
  // dibuang tidak boleh dipakai ulang (mode ketat React memasang komponen dua
  // kali di pengembangan, dan pemasangan kedua harus membuat mesin baru).
  useEffect(
    () => () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    },
    [],
  );

  return (
    <button
      type="button"
      onClick={() => ambientPreference.set(!on)}
      aria-pressed={on}
      aria-label="Suara alam"
      title={on ? "Matikan suara alam" : "Nyalakan suara alam"}
      className={`${AUDIO_BUTTON} ${audioButtonState(on)}`}
    >
      {on ? <Volume2 size={16} /> : <VolumeX size={16} />}
      <span className="hidden lg:inline">Suara alam</span>
    </button>
  );
}
