"use client";

import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";

type Props = {
  /** Tujuan yang menunggu: judul tahap berikutnya, atau nama modul berikutnya. */
  nextTitle: string;
  /** Tulisan pada tombol, mis. "Tahap berikutnya". */
  label: string;
  /** Yang harus dikerjakan pembaca dulu; tampil selama panah masih terkunci. */
  hint?: string;
  locked?: boolean;
  /** Pembaca baru saja mencoba melanjutkan padahal syaratnya belum tuntas. */
  urgent?: boolean;
  onAdvance?: () => void;
  /** Bila diisi, panah ini pindah halaman alih-alih berpindah tahap. */
  href?: string;
  className?: string;
};

/**
 * Panah lanjut pada Modul 01, beserta satu baris arahan di atasnya.
 *
 * Panahnya sengaja tetap terlihat meski belum bisa diklik: kalau ia baru
 * muncul setelah syaratnya tuntas, pembaca tidak tahu bahwa ada sesuatu yang
 * harus ia kerjakan dulu. Jadi yang berubah hanyalah keadaannya — terkunci
 * dengan arahan apa yang harus dilakukan, atau terbuka dengan nama tujuan
 * yang menunggu.
 *
 * Di tahap terakhir tidak ada lagi tahap yang menunggu, jadi panah yang sama
 * dipakai untuk menyeberang ke modul berikutnya (`href`).
 */
export default function StepAdvance({
  nextTitle,
  label,
  hint,
  locked = false,
  urgent,
  onAdvance,
  href,
  className = "",
}: Props) {
  const title = locked ? hint : `Lanjut ke ${nextTitle}`;
  // Tautan tidak mengenal keadaan "mati", jadi panahnya bergeser pada tiap
  // sorotan; tombol hanya bergeser selama ia memang dapat diklik.
  const body = (
    <>
      {locked ? <Lock size={13} /> : null}
      {label}
      <ArrowRight
        size={14}
        className={`transition-transform ${href ? "group-hover:translate-x-0.5" : "group-enabled:group-hover:translate-x-0.5"}`}
      />
    </>
  );
  const pill = `group inline-flex items-center gap-2 rounded-full border bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur-md transition-colors ${
    locked
      ? `cursor-not-allowed bg-white/5 text-white/45 ${urgent ? "border-amber-300/50" : "border-white/12"}`
      : "cursor-pointer border-white/25 hover:bg-white/20"
  }`;

  return (
    <div className={`flex flex-col items-end gap-2 ${className}`}>
      {/* Di layar sempit arahan ini jatuh tepat di atas diorama, jadi ia
          membawa alas gelapnya sendiri agar tetap terbaca di atas dedaunan. */}
      <p
        aria-live="polite"
        className={`max-w-[210px] rounded-2xl bg-black/35 px-3 py-1.5 text-right text-[11px] leading-snug backdrop-blur-[2px] transition-colors duration-300 ${
          locked ? (urgent ? "text-amber-200" : "text-white/55") : "text-white/45"
        }`}
      >
        {locked ? hint : nextTitle}
      </p>
      {href ? (
        <Link href={href} title={title} className={pill}>
          {body}
        </Link>
      ) : (
        <button type="button" onClick={onAdvance} disabled={locked} title={title} className={pill}>
          {body}
        </button>
      )}
    </div>
  );
}
