"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { AmbientEngine } from "@/lib/sound/ambientEngine";
import type { AmbientMix } from "@/lib/sound/soundscapes";

/** Kunci penyimpanan pilihan suara selama sesi, supaya ikut ke modul berikutnya. */
const STORAGE_KEY = "emberguard-suara";

/** Selang membaca keadaan modul untuk racikan suara (milidetik). */
const POLL_MS = 250;

function readPreference(): boolean {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Cadangan bila penyimpanan diblokir (mode privat): berlaku selama halaman terbuka. */
let memoryPreference = false;
const listeners = new Set<() => void>();

function writePreference(on: boolean) {
  memoryPreference = on;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, on ? "1" : "0");
  } catch {
    // Penyimpanan diblokir: cukup memoryPreference.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Pilihan suara sebagai "toko luar" React: server selalu "mati", klien
 * membaca sessionStorage. useSyncExternalStore menangani perbedaan keduanya
 * saat hidrasi tanpa peringatan.
 */
const getSnapshot = () => readPreference() || memoryPreference;
const getServerSnapshot = () => false;

type Props = {
  /**
   * Membaca racikan suara dari keadaan modul saat ini. Dipanggil berkala,
   * bukan tiap render, jadi boleh membaca ref adegan 3D.
   */
  getMix: () => AmbientMix;
};

/**
 * Tombol "Suara alam" yang sama di semua modul, di pojok kanan atas di
 * samping navigasi.
 *
 * Suara mati pada kunjungan pertama karena peramban hanya mengizinkan audio
 * setelah pembaca menekan sesuatu. Begitu dinyalakan, pilihannya diingat
 * selama sesi, jadi modul berikutnya langsung bersuara. Suara berhenti saat
 * tab disembunyikan.
 */
export default function AmbientSoundToggle({ getMix }: Props) {
  const on = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const engineRef = useRef<AmbientEngine | null>(null);
  const getMixRef = useRef(getMix);
  useEffect(() => {
    getMixRef.current = getMix;
  });

  useEffect(() => {
    if (!on) {
      engineRef.current?.stop();
      return;
    }
    const engine = (engineRef.current ??= new AmbientEngine());
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

  useEffect(() => () => engineRef.current?.dispose(), []);

  const toggle = () => writePreference(!on);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label="Suara alam"
      title={on ? "Matikan suara alam" : "Nyalakan suara alam"}
      className={`fixed right-[68px] top-4 z-[100] inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors sm:top-5 md:right-5 md:top-4 lg:px-4 ${
        on ? "border-white/40 bg-white/15 text-white" : "border-white/25 bg-black/55 text-white/75 hover:text-white"
      }`}
    >
      {on ? <Volume2 size={16} /> : <VolumeX size={16} />}
      <span className="hidden lg:inline">Suara alam</span>
    </button>
  );
}
