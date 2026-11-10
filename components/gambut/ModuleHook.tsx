"use client";

import { ArrowDown } from "lucide-react";
import LaptopNudge from "./LaptopNudge";

type Props = {
  open: boolean;
  kicker: string;
  setup: string;
  question: string;
  cta: string;
  scrollHint: string;
  /** Pengantar tambahan, mis. untuk pembaca yang datang dari kartu hasil temannya. */
  lead?: string | null;
  onStart: () => void;
};

/**
 * Layar pembuka modul: satu pertanyaan yang menimbulkan rasa penasaran.
 * Tampil seketika tanpa menunggu kanvas 3D, karena pendatang dari media sosial
 * memutuskan untuk tinggal atau pergi dalam beberapa detik pertama.
 */
export default function ModuleHook({ open, kicker, setup, question, cta, scrollHint, lead, onStart }: Props) {
  return (
    <div
      inert={!open}
      className={`absolute inset-0 z-20 flex items-center bg-gradient-to-r max-md:items-end max-md:pb-24 from-black/85 via-black/45 to-transparent transition-[opacity,visibility] duration-700 motion-reduce:transition-none ${
        open ? "visible opacity-100" : "invisible opacity-0"
      }`}
    >
      <div className="w-full max-w-3xl px-5 sm:px-10 md:px-14">
        <p className="hero-anim hero-fade text-[11px] font-medium uppercase tracking-[0.22em] text-white/55">{kicker}</p>
        <h2 className="mt-6" style={{ letterSpacing: "-0.03em" }}>
          <span className="hero-anim hero-reveal block font-playfair text-3xl italic leading-[1.1] text-white/85 sm:text-4xl md:text-5xl">{setup}</span>
          <span
            className="hero-anim hero-reveal mt-3 block font-playfair text-6xl italic leading-[1.02] text-[#f0a060] sm:text-7xl md:text-8xl"
            style={{ animationDelay: "0.9s" }}
          >
            {question}
          </span>
        </h2>
        {lead && (
          <p className="hero-anim hero-fade mt-6 max-w-md text-sm leading-relaxed text-white/75 sm:text-base" style={{ animationDelay: "1.4s" }}>
            {lead}
          </p>
        )}
        <div className="hero-anim hero-fade mt-9 flex items-center gap-5" style={{ animationDelay: "1.5s" }}>
          <button
            type="button"
            onClick={onStart}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-[#f0a060]"
          >
            {cta}
            <ArrowDown size={16} />
          </button>
          <span className="text-xs text-white/50">{scrollHint}</span>
        </div>
        <LaptopNudge className="hero-anim hero-fade mt-4 flex" />
      </div>
    </div>
  );
}
