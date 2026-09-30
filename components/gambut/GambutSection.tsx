"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArrowUpRight, Lock } from "lucide-react";
import { GAMBUT_INTRO, GAMBUT_MODULES } from "@/config/gambut-content";
import Link from "next/link";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Halaman Gambut: pengantar + daftar modul. Tiap modul memiliki halamannya
 * sendiri; saat ini baru Modul 01 (Anatomi Gambut) yang tersedia.
 */
export default function GambutSection() {
  const introRef = useRef<HTMLDivElement>(null);

  // Judul & kartu modul muncul bertahap saat masuk layar.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".intro-anim", {
          opacity: 0,
          y: 32,
          filter: "blur(10px)",
          duration: 1.1,
          stagger: 0.1,
          ease: "expo.out",
          scrollTrigger: { trigger: introRef.current, start: "top 75%" },
        });
        gsap.from(".module-card", {
          opacity: 0,
          y: 40,
          duration: 1,
          stagger: 0.08,
          ease: "expo.out",
          scrollTrigger: { trigger: ".module-grid", start: "top 85%" },
        });
      });
    },
    { scope: introRef },
  );

  return (
    <section id="gambut" className="relative flex min-h-[100dvh] items-center bg-black text-white">
      <div ref={introRef} className="mx-auto w-full max-w-6xl px-5 pb-20 pt-28 sm:px-10 sm:pt-36">
        <div className="grid gap-8 md:grid-cols-[1fr_minmax(0,380px)] md:items-end">
          <div>
            <p className="intro-anim text-[11px] font-medium uppercase tracking-[0.22em] text-white/45">
              {GAMBUT_INTRO.eyebrow}
            </p>
            <h2
              className="intro-anim mt-4 font-playfair text-6xl italic leading-[0.95] sm:text-8xl"
              style={{ letterSpacing: "-0.05em" }}
            >
              {GAMBUT_INTRO.title}
            </h2>
          </div>
          <p className="intro-anim text-sm leading-relaxed text-white/65 sm:text-[15px]">{GAMBUT_INTRO.lead}</p>
        </div>

        <ol className="module-grid mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {GAMBUT_MODULES.map((m) => {
            const content = (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs tabular-nums text-white/45">{m.number}</span>
                  {m.available ? (
                    <ArrowUpRight size={18} className="text-white/70 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white" />
                  ) : (
                    <Lock size={14} className="text-white/30" />
                  )}
                </div>
                <p className={`mt-10 text-lg font-medium ${m.available ? "text-white" : "text-white/40"}`}>{m.title}</p>
                <p className={`mt-1 text-xs ${m.available ? "text-white/55" : "text-white/30"}`}>
                  {m.available ? m.caption : "Segera hadir"}
                </p>
              </>
            );
            return (
              <li key={m.number} className="module-card">
                {m.available && m.href ? (
                  <Link
                    href={m.href}
                    className="group block h-full rounded-2xl border border-white/15 bg-white/[0.04] p-5 transition-colors duration-300 hover:border-white/35 hover:bg-white/[0.07]"
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="h-full rounded-2xl border border-white/[0.07] p-5" aria-disabled="true">
                    {content}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
