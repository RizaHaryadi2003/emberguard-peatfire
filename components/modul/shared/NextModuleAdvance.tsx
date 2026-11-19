"use client";

import StepAdvance from "@/components/modul/shared/StepAdvance";
import { BACK_TO_MODULE_LIST, nextAvailableModule } from "@/config/modules-content";

/**
 * Panah lanjut di babak terakhir sebuah modul: menuju modul berikutnya yang
 * sudah tersedia, atau kembali ke daftar modul bila belum ada.
 *
 * Dipusatkan di sini karena tujuannya berubah setiap kali modul baru dibuat.
 * Sebelumnya tiap modul menulis "kembali ke daftar" sendiri, sehingga saat
 * Musim Api dibangun, panah Kanal tetap kembali ke daftar padahal modul
 * sesudahnya sudah ada.
 */
export default function NextModuleAdvance({ href, className }: { href: string; className?: string }) {
  const next = nextAvailableModule(href);
  if (!next?.href) return <StepAdvance {...BACK_TO_MODULE_LIST} className={className} />;
  return <StepAdvance nextTitle={`Modul ${next.number} · ${next.title}`} label="Modul berikutnya" href={next.href} forward className={className} />;
}
