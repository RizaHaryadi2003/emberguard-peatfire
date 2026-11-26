"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND_NAME, NAV_LINKS } from "@/config/hero-content";
import RingLogo from "./RingLogo";
import SiteSoundButton from "./SiteSoundButton";

/** Menu aktif: "/" hanya untuk beranda, halaman lain juga mencakup sub-halamannya. */
function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Warna kartu navigasi: krem, teks abu tua, garis tepi tipis. */
const CARD = "rounded-lg border border-[#474747]/35 bg-[#f2efe9] text-[#474747]";

/**
 * Navigasi tetap di semua halaman, berupa kartu krem kecil:
 * kiri tombol Suara, tengah logo bulat (kembali ke beranda), kanan tombol Menu.
 * Menu membuka daftar bernomor di kartu kedua tepat di bawahnya.
 *
 * Di laptop kartu berada di tengah atas. Di ponsel kartu dibuat ringkas dan
 * diletakkan di kiri atas, karena pojok kanan atas dipakai tombol suara modul.
 */
export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLElement>(null);

  // Tutup menu saat pindah halaman.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  // Tutup menu dengan Escape atau klik di luar navigasi.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <nav
      ref={rootRef}
      aria-label="Navigasi utama"
      className="font-marcellus fixed left-2 top-2 z-[110] w-[212px] md:left-1/2 md:top-4 md:w-[346px] md:-translate-x-1/2"
    >
      {/* Kartu utama */}
      <div className={`${CARD} relative flex h-11 items-center justify-between px-3 md:h-[58px] md:px-3.5`}>
        <SiteSoundButton />

        <Link
          href="/"
          aria-label={`${BRAND_NAME} — Beranda`}
          className="absolute left-1/2 -translate-x-1/2 transition-transform duration-500 hover:rotate-45"
        >
          <RingLogo className="h-8 w-8 md:h-9 md:w-9" />
        </Link>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="menu-utama"
          className="flex cursor-pointer items-center gap-2.5 text-[15px] transition-opacity hover:opacity-70"
        >
          <span>{open ? "Tutup" : "Menu"}</span>
          {/* Dua titik: tegak saat tertutup, mendatar saat terbuka */}
          <span
            aria-hidden
            className={`flex flex-col gap-[3px] transition-transform duration-300 ${open ? "rotate-90" : ""}`}
          >
            <span className="h-[5px] w-[5px] rounded-full bg-current" />
            <span className="h-[5px] w-[5px] rounded-full bg-current" />
          </span>
        </button>
      </div>

      {/* Kartu daftar menu */}
      <div
        id="menu-utama"
        inert={!open}
        className={`${CARD} mt-2 w-[calc(100vw-1rem)] max-w-[346px] overflow-clip transition-[opacity,transform] duration-300 md:w-full ${
          open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
        }`}
      >
        <ol>
          {NAV_LINKS.map((link, i) => {
            const active = isActive(pathname, link.href);
            return (
              <li key={link.href} className="border-b border-[#474747]/25 last:border-b-0">
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className="group flex items-baseline gap-4 px-4 py-2.5 transition-colors hover:bg-[#474747]/[0.06]"
                >
                  <span className="w-4 text-[11px] text-[#474747]/70">{i + 1}.</span>
                  <span className="text-[22px] leading-tight">{link.label}</span>
                  {active && <span aria-hidden className="ml-auto h-1.5 w-1.5 self-center rounded-full bg-[#474747]" />}
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
