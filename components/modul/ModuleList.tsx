"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Link from "next/link";
import { ArrowUpRight, Lock } from "lucide-react";
import { MODULE_LIST_INTRO, MODULE_PARTS, MODULES, type NumberedModule } from "@/config/modules-content";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Satu kartu modul: terbuka bila sudah tersedia, terkunci bila belum. */
function ModuleCard({ m }: { m: NumberedModule }) {
  const content = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs tabular-nums text-white/45">{m.number}</span>
        {m.available ? (
          <ArrowUpRight
            size={18}
            className="text-white/70 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white"
          />
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
    <li className="module-card">
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
}

/**
 * Halaman Modul: pengantar, lalu semua modul dikelompokkan per bagian.
 *
 * Sebelumnya halaman ini hanya berisi bagian Gambut dengan empat modul.
 * Materinya kini dibagi menjadi beberapa bagian menurut pokok materi
 * penelitian — gambut, pengeringan, api, dampak, dan pencegahan — dan tiap
 * bagian punya judul serta pertanyaannya sendiri, sehingga pembaca tahu di
 * mana ia berada dalam keseluruhan cerita. Isinya dibaca dari
 * `config/modules-content.ts`.
 */
export default function ModuleList() {
  const rootRef = useRef<HTMLDivElement>(null);

  // Judul dan kartu muncul bertahap saat masuk layar, per bagian.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".intro-anim", { opacity: 0, y: 32, filter: "blur(10px)", duration: 1.1, stagger: 0.1, ease: "expo.out" });
        gsap.utils.toArray<HTMLElement>(".part-block").forEach((part) => {
          gsap.from(part.querySelectorAll(".part-anim, .module-card"), {
            opacity: 0,
            y: 36,
            duration: 1,
            stagger: 0.07,
            ease: "expo.out",
            scrollTrigger: { trigger: part, start: "top 85%" },
          });
        });
      });
    },
    { scope: rootRef },
  );

  return (
    <section id="modul" className="relative bg-black text-white">
      <div ref={rootRef} className="mx-auto w-full max-w-6xl px-5 pb-24 pt-28 sm:px-10 sm:pt-36">
        <div className="grid gap-8 md:grid-cols-[1fr_minmax(0,380px)] md:items-end">
          <div>
            <p className="intro-anim text-[11px] font-medium uppercase tracking-[0.22em] text-white/45">
              {MODULE_LIST_INTRO.eyebrow} · {MODULES.length} modul dalam {MODULE_PARTS.length} bagian
            </p>
            <h1
              className="intro-anim mt-4 font-playfair text-6xl italic leading-[0.95] sm:text-8xl"
              style={{ letterSpacing: "-0.05em" }}
            >
              {MODULE_LIST_INTRO.title}
            </h1>
          </div>
          <p className="intro-anim text-sm leading-relaxed text-white/65 sm:text-[15px]">{MODULE_LIST_INTRO.lead}</p>
        </div>

        {MODULE_PARTS.map((part, p) => {
          const modules = MODULES.filter((m) => m.partNumber === String(p + 1).padStart(2, "0"));
          return (
            <section key={part.id} id={part.id} className="part-block mt-20 scroll-mt-28 border-t border-white/10 pt-10">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,380px)] md:items-end">
                <div>
                  <p className="part-anim text-[11px] font-medium uppercase tracking-[0.22em] text-[#e8702a]">
                    Bagian {p + 1}
                  </p>
                  <h2 className="part-anim mt-2 font-playfair text-4xl italic leading-none sm:text-5xl" style={{ letterSpacing: "-0.03em" }}>
                    {part.title}
                  </h2>
                </div>
                <p className="part-anim text-sm leading-relaxed text-white/60">{part.lead}</p>
              </div>
              <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {modules.map((m) => (
                  <ModuleCard key={m.number} m={m} />
                ))}
              </ol>
            </section>
          );
        })}
      </div>
    </section>
  );
}
