"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Lock } from "lucide-react";

type Props = {
  /** Tujuan yang menunggu: judul tahap berikutnya, atau daftar modul. */
  nextTitle: string;
  /** Tulisan pada tombol, mis. "Tahap berikutnya". */
  label: string;
  /** Yang harus dikerjakan pembaca dulu; tampil selama panah masih terkunci. */
  hint?: string;
  locked?: boolean;
  /** Pembaca baru saja mencoba melanjutkan padahal syaratnya belum tuntas. */
  urgent?: boolean;
  onAdvance?: () => void;
  /** Bila diisi, panah ini kembali ke halaman tersebut alih-alih berpindah tahap. */
  href?: string;
  /**
   * Tautan menuju ke depan (modul berikutnya), bukan kembali ke daftar.
   * Tanpa ini, tautan selalu digambar dengan panah ke kiri.
   */
  forward?: boolean;
  className?: string;
};

/**
 * Panah lanjut yang dipakai bersama semua modul, beserta satu baris
 * arahan di atasnya.
 *
 * Panahnya sengaja tetap terlihat meski belum bisa diklik: kalau ia baru
 * muncul setelah syaratnya tuntas, pembaca tidak tahu bahwa ada sesuatu yang
 * harus ia kerjakan dulu. Jadi yang berubah hanyalah keadaannya — terkunci
 * dengan arahan apa yang harus dilakukan, atau terbuka dengan nama tujuan
 * yang menunggu.
 *
 * Di tahap terakhir tidak ada lagi tahap yang menunggu, jadi tombol yang sama
 * dipakai untuk kembali ke daftar modul (`href`), dengan panah menghadap kiri.
 */
export default function StepAdvance({
  nextTitle,
  label,
  hint,
  locked = false,
  urgent,
  onAdvance,
  href,
  forward = false,
  className = "",
}: Props) {
  const title = locked ? hint : href ? label : `Lanjut ke ${nextTitle}`;
  // Tautan tidak mengenal keadaan "mati", jadi panahnya bergeser pada tiap
  // sorotan; tombol hanya bergeser selama ia memang dapat diklik.
  const body = href && !forward ? (
    <>
      <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
      {label}
    </>
  ) : (
    <>
      {locked ? <Lock size={13} /> : null}
      {label}
      <ArrowRight size={14} className="transition-transform group-enabled:group-hover:translate-x-0.5" />
    </>
  );
  const pill = `group inline-flex items-center gap-2 rounded-full border bg-black/55 px-4 py-2 text-xs font-medium text-white transition-colors ${
    locked
      ? `cursor-not-allowed bg-black/45 text-white/45 ${urgent ? "border-amber-300/50" : "border-white/12"}`
      : "cursor-pointer border-white/25 hover:bg-white/20"
  }`;

  return (
    <div className={`flex flex-col items-end gap-2 ${className}`}>
      {/* Di layar sempit arahan ini jatuh tepat di atas diorama, jadi ia
          membawa alas gelapnya sendiri agar tetap terbaca di atas dedaunan.
          Di layar lebar alas itu dilepas: teks yang terlipat tidak mengisi
          lebar kotaknya, sehingga sisi kirinya tampak sebagai ruang kosong,
          padahal di sana sudah ada peredup di tepi bawah layar. Di layar sempit
          teksnya dibuat satu baris agar kotaknya pas mengikuti tulisan. */}
      <p
        aria-live="polite"
        className={`max-w-[210px] rounded-2xl bg-black/55 px-3 py-1.5 text-right text-[11px] leading-snug transition-colors duration-300 max-md:max-w-none max-md:whitespace-nowrap md:max-w-[260px] md:rounded-none md:bg-transparent md:p-0 ${
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
