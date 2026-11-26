// Pilihan menyala/mati suara (suara alam, narator) yang diingat selama sesi,
// supaya ikut ke modul berikutnya. Bentuknya "toko luar" untuk
// useSyncExternalStore: server selalu memakai nilai bawaan, klien membaca
// sessionStorage, dan React menangani perbedaannya saat hidrasi.

export type Preference = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => boolean;
  getServerSnapshot: () => boolean;
  set: (on: boolean) => void;
};

export function createPreference(key: string, defaultOn: boolean): Preference {
  /** Cadangan bila penyimpanan diblokir (mode privat): berlaku selama halaman terbuka. */
  let memory: boolean | null = null;
  const listeners = new Set<() => void>();

  const read = (): boolean => {
    try {
      const v = window.sessionStorage.getItem(key);
      if (v === "1") return true;
      if (v === "0") return false;
    } catch {
      // Penyimpanan diblokir: pakai cadangan.
    }
    return memory ?? defaultOn;
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: read,
    getServerSnapshot: () => defaultOn,
    set(on) {
      memory = on;
      try {
        window.sessionStorage.setItem(key, on ? "1" : "0");
      } catch {
        // Penyimpanan diblokir: cukup cadangan.
      }
      listeners.forEach((l) => l());
    },
  };
}

/** Suara alam: mati secara bawaan. */
export const ambientPreference = createPreference("emberguard-suara", false);

/** Narator: menyala secara bawaan; tetap menunggu izin peramban untuk bersuara. */
export const narratorPreference = createPreference("emberguard-narator", true);

/** Nama peristiwa jendela saat narator mulai/berhenti bicara (untuk meredam suara alam). */
export const NARRATION_EVENT = "emberguard:narasi";

/** Suara latar situs (tombol "Suara" di navigasi): mati secara bawaan. */
export const siteSoundPreference = createPreference("emberguard-suara-situs", false);
