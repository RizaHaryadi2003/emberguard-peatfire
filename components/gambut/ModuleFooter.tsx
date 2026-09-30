import Link from "next/link";
import { ArrowLeft, ArrowRight, Lock } from "lucide-react";
import { GAMBUT_MODULES } from "@/config/gambut-content";

/** Navigasi di akhir halaman modul: kembali ke daftar & modul berikutnya. */
export default function ModuleFooter({ current }: { current: string }) {
  const index = GAMBUT_MODULES.findIndex((m) => m.number === current);
  const next = GAMBUT_MODULES[index + 1];

  return (
    <footer className="border-t border-white/10 bg-black px-5 py-14 text-white sm:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/gambut"
          className="inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
        >
          <ArrowLeft size={16} /> Semua modul Gambut
        </Link>

        {next &&
          (next.available && next.href ? (
            <Link href={next.href} className="group text-right">
              <span className="block text-[11px] uppercase tracking-[0.2em] text-white/45">Modul berikutnya</span>
              <span className="mt-1 inline-flex items-center gap-2 font-playfair text-2xl italic">
                {next.title}
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ) : (
            <div className="text-left sm:text-right" aria-disabled="true">
              <span className="block text-[11px] uppercase tracking-[0.2em] text-white/35">
                Modul {next.number} · segera hadir
              </span>
              <span className="mt-1 inline-flex items-center gap-2 font-playfair text-2xl italic text-white/40">
                <Lock size={14} /> {next.title}
              </span>
            </div>
          ))}
      </div>
    </footer>
  );
}
