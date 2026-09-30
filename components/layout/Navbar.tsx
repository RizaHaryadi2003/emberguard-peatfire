"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { BRAND_NAME, NAV_LINKS } from "@/config/hero-content";

/** Menu aktif: "/" hanya untuk beranda, halaman lain juga mencakup sub-halamannya. */
function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Navigasi tetap di semua halaman: nama merek, menu tengah (desktop), hamburger (seluler). */
export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between p-4 sm:p-5">
      {/* Kiri: nama merek */}
      <Link href="/" className="text-white text-2xl font-playfair italic drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]">
        {BRAND_NAME}
      </Link>

      {/* Tengah: menu pil (desktop) */}
      <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 bg-black/25 backdrop-blur-md border border-white/25 rounded-full px-2 py-2 items-center gap-1">
        {NAV_LINKS.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "px-4 py-1.5 rounded-full text-sm font-medium text-white bg-white/15"
                  : "px-4 py-1.5 rounded-full text-sm font-medium text-white/80 hover:bg-white/20 hover:text-white transition-colors"
              }
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      {/* Kanan: hamburger (seluler) */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Tutup menu" : "Buka menu"}
        aria-expanded={open}
        className="md:hidden text-white p-2 rounded-full bg-black/25 backdrop-blur-md border border-white/25 cursor-pointer"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Panel menu seluler */}
      {open && (
        <div className="md:hidden absolute top-full left-4 right-4 mt-1 flex flex-col gap-1 bg-black/70 backdrop-blur-md border border-white/20 rounded-2xl p-3">
          {NAV_LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium ${
                  active ? "text-white bg-white/10" : "text-white/80 hover:bg-white/10"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
