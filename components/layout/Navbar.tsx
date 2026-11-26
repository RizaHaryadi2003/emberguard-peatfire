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
      className="font-marcellus fixed left-2 top-2 z-[110] w-[196px] md:left-1/2 md:top-4 md:w-[300px] md:-translate-x-1/2"
    >
      {/* Kartu utama */}
      <div className={`${CARD} relative flex h-11 items-center justify-between px-3 md:h-[50px]`}>
        <SiteSoundButton />

        <Link
          href="/"
          aria-label={`${BRAND_NAME} — Beranda`}
          className="absolute left-1/2 -translate-x-1/2 transition-transform duration-500 hover:rotate-45"
        >
          <RingLogo className="h-[30px] w-[30px]" />
        </Link>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="menu-utama"
          className="type-label flex cursor-pointer items-center gap-2 transition-opacity hover:opacity-70"
        >
          <span>{open ? "Tutup" : "Menu"}</span>
          {/* Dua titik: tegak saat tertutup, mendatar saat terbuka */}
          <span
            aria-hidden
            className={`flex flex-col gap-[3px] transition-transform duration-300 ${open ? "rotate-90" : ""}`}
          >
            <span className="h-1 w-1 rounded-full bg-current" />
            <span className="h-1 w-1 rounded-full bg-current" />
          </span>
        </button>
      </div>

      {/* Kartu daftar menu: tinggi membuka mulus, lalu butir muncul bergiliran (lihat .nav-menu di globals.css) */}
      <div id="menu-utama" inert={!open} data-open={open} className="nav-menu mt-1.5 w-[calc(100vw-1rem)] max-w-[300px] md:w-full">
        <div className="min-h-0 overflow-hidden">
          <ol className={CARD}>
            {NAV_LINKS.map((link, i) => {
              const active = isActive(pathname, link.href);
              return (
                <li
                  key={link.href}
                  className="nav-menu-item border-b border-[#474747]/20 last:border-b-0"
                  style={{ "--i": i } as React.CSSProperties}
                >
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className="flex items-baseline gap-3.5 px-3.5 py-2.5 transition-colors hover:bg-[#474747]/[0.06]"
                  >
                    <span className="w-4 text-[10px] text-[#474747]/65">{i + 1}.</span>
                    <span className="text-[17px] leading-tight">{link.label}</span>
                    {active && <span aria-hidden className="ml-auto h-1 w-1 self-center rounded-full bg-[#474747]" />}
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </nav>
  );
}
