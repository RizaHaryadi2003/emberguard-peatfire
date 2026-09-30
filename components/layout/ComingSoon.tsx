import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Props = { eyebrow: string; title: string; description: string };

/** Halaman sementara untuk section yang belum dibangun. */
export default function ComingSoon({ eyebrow, title, description }: Props) {
  return (
    <main className="flex min-h-[100dvh] items-center bg-black px-5 text-white sm:px-10">
      <div className="mx-auto w-full max-w-3xl">
        <p className="hero-anim hero-fade text-[11px] font-medium uppercase tracking-[0.22em] text-white/45" style={{ animationDelay: "0.1s" }}>
          {eyebrow} · Segera hadir
        </p>
        <h1
          className="hero-anim hero-reveal mt-4 font-playfair text-6xl italic leading-[0.95] sm:text-8xl"
          style={{ letterSpacing: "-0.05em", animationDelay: "0.2s" }}
        >
          {title}
        </h1>
        <p className="hero-anim hero-fade mt-6 max-w-md text-sm leading-relaxed text-white/65 sm:text-[15px]" style={{ animationDelay: "0.4s" }}>
          {description}
        </p>
        <Link
          href="/gambut"
          className="hero-anim hero-fade mt-10 inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm text-white/85 transition-colors hover:border-white/40 hover:text-white"
          style={{ animationDelay: "0.55s" }}
        >
          <ArrowLeft size={16} /> Mulai dari Gambut
        </Link>
      </div>
    </main>
  );
}
