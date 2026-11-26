import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SectionBackdrop from "./SectionBackdrop";

type Props = { eyebrow: string; title: string; description: string };

/** Halaman sementara untuk section yang belum dibangun. */
export default function ComingSoon({ eyebrow, title, description }: Props) {
  return (
    <main className="relative isolate flex min-h-[100dvh] items-center px-5 text-white sm:px-10">
      <SectionBackdrop />
      <div className="mx-auto w-full max-w-3xl">
        <p className="hero-anim hero-fade type-eyebrow text-white/80" style={{ animationDelay: "0.1s" }}>
          {eyebrow} · Segera hadir
        </p>
        <h1 className="hero-anim hero-reveal type-display mt-4 text-[#f1f1f1]" style={{ animationDelay: "0.2s" }}>
          {title}
        </h1>
        <p className="hero-anim hero-fade type-lead mt-6 max-w-md text-white/90" style={{ animationDelay: "0.4s" }}>
          {description}
        </p>
        <Link href="/modul" className="hero-anim hero-fade btn-line mt-10" style={{ animationDelay: "0.55s" }}>
          <ArrowLeft size={14} /> Mulai dari Modul
        </Link>
      </div>
    </main>
  );
}
