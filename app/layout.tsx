import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Emberguard — Media Edukasi Pencegahan Karhutla",
  description:
    "Media edukasi interaktif tentang pencegahan kebakaran hutan dan lahan di Kalimantan Barat, Indonesia.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${inter.variable} ${playfair.variable}`}>
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
