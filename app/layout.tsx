import type { Metadata } from "next";
import { EB_Garamond, Inter, Marcellus, Playfair_Display } from "next/font/google";
import Navbar from "@/components/layout/Navbar";
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

// EB Garamond: nama situs pada pembuka (serif klasik, pengganti huruf acuan).
const garamond = EB_Garamond({
  subsets: ["latin"],
  weight: "500",
  variable: "--font-garamond",
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
    <html lang="id" className={`${inter.variable} ${playfair.variable} ${marcellus.variable} ${garamond.variable}`} suppressHydrationWarning>
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
