import type { Metadata } from "next";
import { Cormorant_Garamond, Inter, Marcellus, Playfair_Display } from "next/font/google";
import Navbar from "@/components/layout/Navbar";
import { INTRO_GATE_SCRIPT } from "@/lib/introGate";
import "./globals.css";

// Font dimuat lewat next/font (di-host sendiri, tanpa pergeseran tata letak).
// Inter: teks isi & antarmuka. Playfair Display italic: aksen judul & nama merek.
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["italic"],
  variable: "--font-playfair",
});

// Marcellus: serif berujung melebar untuk judul beranda, label, tombol, dan navigasi.
const marcellus = Marcellus({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-marcellus",
});

// Cormorant Garamond Regular: nama situs pada pembuka (serif halus dan elegan,
// sedikit lebih tegas dari Light).
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-cormorant",
});

export const metadata: Metadata = {
  title: "Emberguard — Media Edukasi Pencegahan Karhutla",
  description:
    "Media edukasi interaktif tentang pencegahan kebakaran hutan dan lahan di Kalimantan Barat, Indonesia.",
  // Gambar pratinjau besar saat tautan dibagikan (app/opengraph-image.tsx).
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: skrip pembuka menambah kelas pada <html> sebelum React hidup.
    <html lang="id" className={`${inter.variable} ${playfair.variable} ${marcellus.variable} ${cormorant.variable}`} suppressHydrationWarning>
      <head>
        {/* Penentu tayang-tidaknya pembuka, dijalankan sebelum halaman digambar
            (lihat lib/introGate.ts). Diletakkan di tata letak akar karena tata
            letak ini hanya dirender sekali di server: skrip tidak ikut dirender
            ulang saat berpindah halaman di dalam situs. */}
        <script dangerouslySetInnerHTML={{ __html: INTRO_GATE_SCRIPT }} />
      </head>
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
